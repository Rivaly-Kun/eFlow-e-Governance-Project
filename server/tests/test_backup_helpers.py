from __future__ import annotations

import json
from pathlib import Path
import sys
import tempfile
import unittest
from datetime import datetime, timedelta, timezone


SERVER_ROOT = Path(__file__).resolve().parents[1]
if str(SERVER_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVER_ROOT))

from services.backup_manifest import file_sha256, write_checksums, write_json
from services.backup_security import ensure_within, remove_backup_path, validate_table_name
from services.recent_auth import is_recent_sign_in


class BackupSecurityTests(unittest.TestCase):
    def test_table_allowlist_rejects_shell_and_url_characters(self) -> None:
        self.assertEqual(validate_table_name("task_submissions"), "task_submissions")
        for unsafe in ("tasks;drop table profiles", "../profiles", "public.tasks", "tasks?select=*"):
            with self.subTest(unsafe=unsafe):
                with self.assertRaises(ValueError):
                    validate_table_name(unsafe)

    def test_backup_paths_cannot_escape_configured_root(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary) / "backups"
            root.mkdir()
            self.assertEqual(ensure_within(root, root / "job-1"), (root / "job-1").resolve())
            with self.assertRaises(ValueError):
                ensure_within(root, root.parent / "outside")

    def test_cleanup_removes_only_a_verified_job_directory(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary) / "backups"
            job = root / "job-1"
            job.mkdir(parents=True)
            (job / "manifest.json").write_text("{}", encoding="utf-8")
            remove_backup_path(root, job)
            self.assertFalse(job.exists())
            self.assertTrue(root.exists())


class BackupManifestTests(unittest.TestCase):
    def test_json_and_checksums_are_deterministic_and_verifiable(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            export_root = Path(temporary) / "export"
            export_root.mkdir()
            write_json(export_root / "manifest.json", {"tables": ["tasks"], "rows": 2})
            (export_root / "schema.sql").write_text("create table tasks();\n", encoding="utf-8")
            checksums = write_checksums(export_root)
            self.assertEqual(checksums["manifest.json"], file_sha256(export_root / "manifest.json"))
            self.assertEqual(checksums["schema.sql"], file_sha256(export_root / "schema.sql"))
            self.assertNotIn("checksums.sha256", checksums)
            self.assertEqual(json.loads((export_root / "manifest.json").read_text(encoding="utf-8"))["rows"], 2)


class RecentAuthenticationTests(unittest.TestCase):
    def test_sensitive_exports_require_a_sign_in_within_five_minutes(self) -> None:
        now = datetime(2026, 8, 19, 1, 0, tzinfo=timezone.utc)
        self.assertTrue(is_recent_sign_in(now - timedelta(minutes=4, seconds=59), now=now))
        self.assertFalse(is_recent_sign_in(now - timedelta(minutes=5, seconds=1), now=now))
        self.assertFalse(is_recent_sign_in(None, now=now))


if __name__ == "__main__":
    unittest.main()
