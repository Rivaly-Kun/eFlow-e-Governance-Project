"""Manifest and checksum generation for eFlow backup archives."""

from __future__ import annotations

from hashlib import sha256
import json
from pathlib import Path
from typing import Any


def file_sha256(path: Path) -> str:
    digest = sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def write_json(path: Path, payload: Any) -> None:
    path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2, default=str) + "\n",
        encoding="utf-8",
    )


def write_checksums(export_root: Path) -> dict[str, str]:
    checksums: dict[str, str] = {}
    for path in sorted(export_root.rglob("*")):
        if not path.is_file() or path.name == "checksums.sha256":
            continue
        relative = path.relative_to(export_root).as_posix()
        checksums[relative] = file_sha256(path)

    checksum_file = export_root / "checksums.sha256"
    checksum_file.write_text(
        "".join(f"{checksum}  {relative}\n" for relative, checksum in checksums.items()),
        encoding="utf-8",
    )
    return checksums

