"""Path, redaction, and archive-security helpers for database exports."""

from __future__ import annotations

from pathlib import Path
import os
import re
import shutil
from typing import Iterable


SAFE_TABLE_NAME = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
SENSITIVE_PUBLIC_TABLES = frozenset({"app_config", "system_config"})


def find_windows_pg_dump(program_roots: Iterable[Path] | None = None) -> str | None:
    """Find PostgreSQL tools installed by PostgreSQL or pgAdmin on Windows."""
    if program_roots is None:
        roots = {
            Path(value)
            for value in (
                os.getenv("ProgramFiles", ""),
                os.getenv("ProgramFiles(x86)", ""),
            )
            if value
        }
    else:
        roots = {Path(root) for root in program_roots}

    candidates: list[Path] = []
    for root in roots:
        candidates.extend(root.glob("PostgreSQL/*/bin/pg_dump.exe"))
        candidates.append(root / "PostgreSQL" / "pgAdmin 4" / "runtime" / "pg_dump.exe")
    available = [candidate for candidate in candidates if candidate.is_file()]
    if not available:
        return None
    return str(sorted(available, key=lambda path: path.as_posix(), reverse=True)[0])


def resolve_pg_dump(executable: str) -> str | None:
    candidate = Path(executable)
    if candidate.is_absolute():
        return str(candidate) if candidate.is_file() else None
    discovered = shutil.which(executable)
    if discovered:
        return discovered
    if os.name == "nt" and executable.lower() in {"pg_dump", "pg_dump.exe"}:
        return find_windows_pg_dump()
    return None


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
