import os
import re
from pathlib import Path

from app.config import settings


class UnsafeStoragePath(ValueError):
    pass


def resolve_storage_path(
    path: str | Path,
    *,
    root: str | Path | None = None,
    must_exist: bool = False,
) -> Path:
    raw_path = os.fspath(path)
    if not raw_path or "\x00" in raw_path:
        raise UnsafeStoragePath("Invalid storage path.")
    if any(part == ".." for part in re.split(r"[\\/]", raw_path)):
        raise UnsafeStoragePath("Storage path traversal is not allowed.")

    storage_root = Path(root or settings.UPLOAD_DIR).expanduser().resolve()
    candidate = Path(raw_path).expanduser()
    if not candidate.is_absolute():
        candidate = storage_root / candidate

    try:
        resolved = candidate.resolve(strict=False)
        relative = resolved.relative_to(storage_root)
    except (OSError, RuntimeError, ValueError) as exc:
        raise UnsafeStoragePath("Path is outside the configured storage directory.") from exc

    if not relative.parts:
        raise UnsafeStoragePath("The storage directory is not a file.")
    if must_exist and not resolved.is_file():
        raise FileNotFoundError("Stored file does not exist.")
    return resolved


def validate_generated_filename(file_name: str) -> str:
    if (
        not file_name
        or file_name in {".", ".."}
        or "/" in file_name
        or "\\" in file_name
        or "\x00" in file_name
        or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]{0,254}", file_name)
    ):
        raise UnsafeStoragePath("Invalid generated filename.")
    return file_name
