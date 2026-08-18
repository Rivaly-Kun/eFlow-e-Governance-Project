"""Create, track, download, and clean up Supabase backup archives."""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from dataclasses import asdict, dataclass, field
from datetime import datetime, timedelta, timezone
import json
import logging
from pathlib import Path
import subprocess
from threading import RLock
from typing import Any, Literal
from urllib.parse import quote
from uuid import uuid4
import zipfile

import httpx

from gateway_config import settings
from gateway_dependencies import AuthenticatedUser, supabase_admin
from services.backup_manifest import file_sha256, write_checksums, write_json
from services.backup_security import (
    SENSITIVE_PUBLIC_TABLES,
    ensure_within,
    remove_backup_path,
    resolve_pg_dump,
    validate_table_name,
)


LOGGER = logging.getLogger(__name__)
BACKUP_VERSION = "1.0"
PAGE_SIZE = 1000
BackupMode = Literal["operational", "disaster_recovery"]

try:
    import pyzipper
except ImportError:  # pragma: no cover - surfaced by preflight in incomplete runtimes
    pyzipper = None


@dataclass
class BackupJob:
    id: str
    actor_id: str
    actor_email: str
    mode: BackupMode
    status: str = "queued"
    phase: str = "Waiting to start"
    progress: int = 0
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    completed_at: str | None = None
    expires_at: str | None = None
    archive_name: str | None = None
    archive_size: int | None = None
    archive_sha256: str | None = None
    table_count: int = 0
    row_count: int = 0
    error: str | None = None
    archive_path: Path | None = field(default=None, repr=False)
    workspace_path: Path | None = field(default=None, repr=False)

    def public(self) -> dict[str, Any]:
        payload = asdict(self)
        payload.pop("archive_path", None)
        payload.pop("workspace_path", None)
        return payload


class BackupService:
    def __init__(self) -> None:
        self._jobs: dict[str, BackupJob] = {}
        self._lock = RLock()
        self._executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="eflow-backup")

    def preflight(self) -> dict[str, Any]:
        pg_dump = resolve_pg_dump(settings.pg_dump_path)
        configured = bool(settings.database_url and pg_dump)
        tables: list[str] = []
        discovery_error: str | None = None
        try:
            tables = self._discover_public_tables()
        except Exception as exc:  # connection diagnostics must not take down Data Tools
            discovery_error = str(exc)

        return {
            "configured": configured,
            "database_url_configured": bool(settings.database_url),
            "pg_dump_available": bool(pg_dump),
            "encryption_available": pyzipper is not None,
            "retention_hours": settings.backup_retention_hours,
            "tables": tables,
            "table_count": len(tables),
            "safe_excluded_data_tables": sorted(SENSITIVE_PUBLIC_TABLES),
            "discovery_error": discovery_error,
        }

    def list_jobs(self, actor_id: str) -> list[dict[str, Any]]:
        self.cleanup_expired()
        with self._lock:
            jobs = [job.public() for job in self._jobs.values() if job.actor_id == actor_id]
        return sorted(jobs, key=lambda job: job["created_at"], reverse=True)

    def get_job(self, job_id: str, actor_id: str) -> BackupJob:
        self.cleanup_expired()
        with self._lock:
            job = self._jobs.get(job_id)
        if not job or job.actor_id != actor_id:
            raise KeyError(job_id)
        return job

    def start(
        self,
        actor: AuthenticatedUser,
        mode: BackupMode,
        confirmation: str,
        include_storage_manifest: bool,
        passphrase: str | None,
    ) -> dict[str, Any]:
        self.cleanup_expired()
        expected = "BACK UP EFLOW" if mode == "operational" else "FULL EFLOW BACKUP"
        if confirmation.strip().upper() != expected:
            raise ValueError(f'Type "{expected}" to confirm this export.')
        if mode == "disaster_recovery":
            if pyzipper is None:
                raise ValueError("Encrypted backup support is not installed on the gateway.")
            if not passphrase or len(passphrase) < 12:
                raise ValueError("Disaster-recovery backups require a passphrase of at least 12 characters.")

        pg_dump = resolve_pg_dump(settings.pg_dump_path)
        if not settings.database_url or not pg_dump:
            raise RuntimeError(
                "Backup support is not configured. Set EFLOW_DATABASE_URL and install or configure pg_dump."
            )

        with self._lock:
            active = next(
                (job for job in self._jobs.values() if job.actor_id == actor.id and job.status in {"queued", "running"}),
                None,
            )
            if active:
                raise RuntimeError("You already have a backup job running.")

            job = BackupJob(
                id=str(uuid4()),
                actor_id=actor.id,
                actor_email=actor.email,
                mode=mode,
            )
            self._jobs[job.id] = job

        self._audit(job, "backup.started", {"mode": mode, "include_storage_manifest": include_storage_manifest})
        self._executor.submit(
            self._build_archive,
            job.id,
            pg_dump,
            include_storage_manifest,
            passphrase,
        )
        return job.public()

    def delete(self, job_id: str, actor: AuthenticatedUser) -> None:
        job = self.get_job(job_id, actor.id)
        if job.status in {"queued", "running"}:
            raise RuntimeError("A running backup cannot be deleted.")
        self._remove_job_files(job)
        with self._lock:
            self._jobs.pop(job.id, None)
        self._audit(job, "backup.deleted", {"archive_sha256": job.archive_sha256})

    def mark_downloaded(self, job: BackupJob) -> None:
        self._audit(job, "backup.downloaded", {"archive_sha256": job.archive_sha256})

    def cleanup_expired(self) -> None:
        cutoff = datetime.now(timezone.utc)
        expired: list[BackupJob] = []
        with self._lock:
            for job in self._jobs.values():
                if not job.expires_at or job.status in {"queued", "running"}:
                    continue
                if datetime.fromisoformat(job.expires_at) <= cutoff:
                    expired.append(job)
        for job in expired:
            self._remove_job_files(job)
            with self._lock:
                self._jobs.pop(job.id, None)

    def _set_job(self, job: BackupJob, **changes: Any) -> None:
        with self._lock:
            for key, value in changes.items():
                setattr(job, key, value)

    def _build_archive(
        self,
        job_id: str,
        pg_dump: str,
        include_storage_manifest: bool,
        passphrase: str | None,
    ) -> None:
        with self._lock:
            job = self._jobs[job_id]
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d-%H%M%S")
        archive_stem = f"eflow-backup-{timestamp}-{job.id[:8]}"
        workspace = ensure_within(settings.backup_root, settings.backup_root / job.id)
        export_root = workspace / archive_stem

        try:
            settings.backup_root.mkdir(parents=True, exist_ok=True)
            export_root.mkdir(parents=True, exist_ok=False)
            self._set_job(job, status="running", phase="Exporting database schema", progress=5, workspace_path=workspace)

            schema_path = export_root / "schema.sql"
            schema_args = [
                pg_dump,
                f"--dbname={settings.database_url}",
                "--schema=public",
                "--schema-only",
                "--no-owner",
                "--no-privileges",
                f"--file={schema_path}",
            ]
            self._run_pg_dump(schema_args)

            self._set_job(job, phase="Exporting restore-grade data SQL", progress=18)
            data_path = export_root / "data.sql"
            data_args = [
                pg_dump,
                f"--dbname={settings.database_url}",
                "--schema=public",
                "--data-only",
                "--column-inserts",
                "--no-owner",
                "--no-privileges",
                f"--file={data_path}",
            ]
            if job.mode == "operational":
                for table in sorted(SENSITIVE_PUBLIC_TABLES):
                    data_args.append(f"--exclude-table-data=public.{table}")
            self._run_pg_dump(data_args)

            tables = self._discover_public_tables()
            self._set_job(job, table_count=len(tables), phase="Writing readable JSONL table exports", progress=28)
            data_dir = export_root / "data"
            data_dir.mkdir()
            row_counts: dict[str, int] = {}
            included_tables = [
                table for table in tables
                if job.mode == "disaster_recovery" or table not in SENSITIVE_PUBLIC_TABLES
            ]

            for index, table in enumerate(included_tables):
                row_counts[table] = self._write_table_jsonl(table, data_dir / f"{table}.jsonl")
                progress = 28 + round(((index + 1) / max(1, len(included_tables))) * 45)
                self._set_job(job, progress=progress, row_count=sum(row_counts.values()))

            storage_manifest = self._storage_manifest(include_storage_manifest)
            write_json(export_root / "storage-manifest.json", storage_manifest)

            manifest = {
                "format": "eFlow Supabase Backup",
                "version": BACKUP_VERSION,
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "generated_by": {"id": job.actor_id, "email": job.actor_email},
                "mode": job.mode,
                "schema": "public",
                "tables_discovered": tables,
                "tables_exported_to_jsonl": included_tables,
                "excluded_table_data": sorted(SENSITIVE_PUBLIC_TABLES) if job.mode == "operational" else [],
                "row_counts": row_counts,
                "row_count_total": sum(row_counts.values()),
                "storage_manifest_included": include_storage_manifest,
                "files": {
                    "schema": "schema.sql",
                    "restore_data": "data.sql",
                    "readable_data": "data/*.jsonl",
                    "storage": "storage-manifest.json",
                    "checksums": "checksums.sha256",
                },
            }
            write_json(export_root / "manifest.json", manifest)
            self._set_job(job, phase="Calculating checksums", progress=80)
            write_checksums(export_root)

            archive_path = workspace / f"{archive_stem}.zip"
            self._set_job(job, phase="Compressing secure archive", progress=88)
            self._write_archive(export_root, archive_path, passphrase)

            completed_at = datetime.now(timezone.utc)
            expires_at = completed_at + timedelta(hours=settings.backup_retention_hours)
            self._set_job(
                job,
                status="completed",
                phase="Backup ready",
                progress=100,
                completed_at=completed_at.isoformat(),
                expires_at=expires_at.isoformat(),
                archive_name=archive_path.name,
                archive_size=archive_path.stat().st_size,
                archive_sha256=file_sha256(archive_path),
                archive_path=archive_path,
                row_count=sum(row_counts.values()),
            )
            self._audit(
                job,
                "backup.completed",
                {
                    "mode": job.mode,
                    "archive_sha256": job.archive_sha256,
                    "archive_size": job.archive_size,
                    "table_count": job.table_count,
                    "row_count": job.row_count,
                },
            )
        except Exception as exc:
            LOGGER.exception("Backup job %s failed", job.id)
            self._set_job(
                job,
                status="failed",
                phase="Backup failed",
                error=str(exc),
                completed_at=datetime.now(timezone.utc).isoformat(),
                expires_at=(datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
            )
            self._audit(job, "backup.failed", {"mode": job.mode, "error": str(exc)[:1000]})

    @staticmethod
    def _run_pg_dump(args: list[str]) -> None:
        result = subprocess.run(
            args,
            capture_output=True,
            text=True,
            timeout=30 * 60,
            check=False,
        )
        if result.returncode != 0:
            detail = (result.stderr or result.stdout or "pg_dump failed").strip()
            raise RuntimeError(detail[-2000:])

    def _discover_public_tables(self) -> list[str]:
        response = httpx.get(
            f"{settings.supabase_url}/rest/v1/",
            headers={
                "apikey": settings.supabase_service_role_key,
                "Authorization": f"Bearer {settings.supabase_service_role_key}",
                "Accept": "application/openapi+json",
            },
            timeout=30,
        )
        response.raise_for_status()
        openapi = response.json()
        definitions = openapi.get("definitions") or openapi.get("components", {}).get("schemas", {})
        paths = openapi.get("paths", {})
        tables = [
            validate_table_name(name)
            for name in definitions
            if paths.get(f"/{name}", {}).get("get") and name != "spatial_ref_sys"
        ]
        return sorted(set(tables))

    def _write_table_jsonl(self, table: str, path: Path) -> int:
        validate_table_name(table)
        total = 0
        with path.open("w", encoding="utf-8", newline="\n") as output:
            while True:
                response = httpx.get(
                    f"{settings.supabase_url}/rest/v1/{quote(table, safe='')}",
                    params={"select": "*", "limit": PAGE_SIZE, "offset": total},
                    headers={
                        "apikey": settings.supabase_service_role_key,
                        "Authorization": f"Bearer {settings.supabase_service_role_key}",
                    },
                    timeout=120,
                )
                response.raise_for_status()
                rows = response.json()
                for row in rows:
                    output.write(json.dumps(row, ensure_ascii=False, separators=(",", ":"), default=str) + "\n")
                total += len(rows)
                if len(rows) < PAGE_SIZE:
                    break
        return total

    @staticmethod
    def _storage_manifest(include_objects: bool) -> dict[str, Any]:
        buckets = supabase_admin.storage.list_buckets()
        normalized = []
        for bucket in buckets or []:
            if isinstance(bucket, dict):
                normalized.append({
                    "id": bucket.get("id"),
                    "name": bucket.get("name"),
                    "public": bucket.get("public", False),
                    "file_size_limit": bucket.get("file_size_limit"),
                    "allowed_mime_types": bucket.get("allowed_mime_types"),
                })
            else:
                normalized.append({
                    "id": getattr(bucket, "id", None),
                    "name": getattr(bucket, "name", None),
                    "public": getattr(bucket, "public", False),
                })
        return {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "buckets": normalized,
            "objects_included": False,
            "object_listing_requested": include_objects,
            "note": "Binary storage objects are not embedded in the database ZIP. Bucket metadata is recorded for restore planning.",
        }

    @staticmethod
    def _write_archive(export_root: Path, archive_path: Path, passphrase: str | None) -> None:
        files = [path for path in export_root.rglob("*") if path.is_file()]
        if passphrase:
            assert pyzipper is not None
            with pyzipper.AESZipFile(
                archive_path,
                "w",
                compression=pyzipper.ZIP_DEFLATED,
                encryption=pyzipper.WZ_AES,
            ) as archive:
                archive.setpassword(passphrase.encode("utf-8"))
                archive.setencryption(pyzipper.WZ_AES, nbits=256)
                for path in files:
                    archive.write(path, arcname=(Path(export_root.name) / path.relative_to(export_root)).as_posix())
            return

        with zipfile.ZipFile(archive_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
            for path in files:
                archive.write(path, arcname=(Path(export_root.name) / path.relative_to(export_root)).as_posix())

    def _remove_job_files(self, job: BackupJob) -> None:
        if job.workspace_path:
            remove_backup_path(settings.backup_root, job.workspace_path)

    @staticmethod
    def _audit(job: BackupJob, action: str, metadata: dict[str, Any]) -> None:
        try:
            supabase_admin.table("audit_events").insert({
                "actor_id": job.actor_id,
                "actor_name": job.actor_email,
                "entity_type": "database_backup",
                "entity_id": job.id,
                "action": action,
                "metadata": metadata,
            }).execute()
        except Exception:
            LOGGER.exception("Could not record backup audit event %s", action)


backup_service = BackupService()

