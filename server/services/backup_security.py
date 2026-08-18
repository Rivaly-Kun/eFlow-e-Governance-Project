"""Path, redaction, and archive-security helpers for database exports."""

from __future__ import annotations

from pathlib import Path
import re
import shutil


SAFE_TABLE_NAME = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
SENSITIVE_PUBLIC_TABLES = frozenset({"app_config", "system_config"})


def resolve_pg_dump(executable: str) -> str | None:
    candidate = Path(executable)
    if candidate.is_absolute():
        return str(candidate) if candidate.is_file() else None
    return shutil.which(executable)


def validate_table_name(table_name: str) -> str:
    if not SAFE_TABLE_NAME.fullmatch(table_name):
        raise ValueError(f"Unsafe public table name: {table_name!r}")
    return table_name


def ensure_within(root: Path, target: Path) -> Path:
    resolved_root = root.resolve()
    resolved_target = target.resolve()
    if resolved_target != resolved_root and resolved_root not in resolved_target.parents:
        raise ValueError("Backup path escaped the configured backup directory")
    return resolved_target


def remove_backup_path(root: Path, target: Path) -> None:
    resolved = ensure_within(root, target)
    if resolved.is_dir():
        shutil.rmtree(resolved, ignore_errors=True)
    elif resolved.exists():
        resolved.unlink(missing_ok=True)

