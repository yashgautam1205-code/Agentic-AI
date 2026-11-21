import importlib.util
from pathlib import Path
import pytest
import subprocess
import shutil

from app.services.thumbnail_service import ThumbnailService
from app.config import settings
from app.services.ffmpeg_service import (
    FFmpegService,
    FFmpegUnavailableError,
    FFmpegTimeoutError,
    resolve_executable,
)


def test_openai_whisper_package_available():
    assert importlib.util.find_spec("whisper") is not None


def test_thumbnail_service_generates_valid_png(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "UPLOAD_DIR", tmp_path / "uploads")
    service = ThumbnailService()
    result = service.generate_thumbnail(
        headline="Test clip",
        badge="TEST",
        template_style="bold_blue",
        aspect_ratio="16:9",
        creator_name="Test Creator",
    )
    file_path = Path(result["file_path"])
    assert file_path.exists()
    assert file_path.stat().st_size > 0
    assert file_path.suffix == ".png"
    assert result["width"] == 1280
    assert result["height"] == 720


def test_resolve_executable_prefers_configured_file(tmp_path):
    executable = tmp_path / ("ffmpeg.exe" if shutil.which("where") else "ffmpeg")
    executable.write_text("test", encoding="utf-8")

    resolved = resolve_executable(str(executable), "ffmpeg")

    assert resolved == str(executable.resolve())


def test_resolve_executable_falls_back_to_path(monkeypatch):
    monkeypatch.setattr(
        shutil,
        "which",
        lambda name: "C:/tools/ffmpeg.exe" if name == "ffmpeg" else None,
    )

    resolved = resolve_executable("", "ffmpeg")

    assert resolved.endswith("ffmpeg.exe")


def test_resolve_executable_reports_missing_path():
    with pytest.raises(FFmpegUnavailableError, match="configured path"):
        resolve_executable("C:/definitely/missing/ffmpeg.exe", "ffmpeg")


def test_probe_media_rejects_missing_input(tmp_path):
    service = FFmpegService(
        ffmpeg_path="C:/missing/ffmpeg.exe",
        ffprobe_path="C:/missing/ffprobe.exe",
        storage_root=tmp_path,
    )

    result = service.probe_media(tmp_path / "missing.mp4")

    assert result == {}
    assert "does not exist" in (service.last_error or "")


def test_trim_rejects_invalid_range(tmp_path):
    input_file = tmp_path / "input.mp4"
    input_file.write_bytes(b"not-real-but-present")
    service = FFmpegService(
        ffmpeg_path="C:/missing/ffmpeg.exe",
        ffprobe_path="C:/missing/ffprobe.exe",
        storage_root=tmp_path,
    )

    result = service.trim_and_export_clip(
        input_file=input_file,
        output_file=tmp_path / "output.mp4",
        start_time=5,
        end_time=4,
    )

    assert result is False
    assert "Invalid trim range" in (service.last_error or "")


def test_ffmpeg_operation_reports_timeout(monkeypatch):
    service = FFmpegService()

    def timed_out(*args, **kwargs):
        raise subprocess.TimeoutExpired(cmd=["ffmpeg"], timeout=1)

    monkeypatch.setattr("app.services.ffmpeg_service.subprocess.run", timed_out)

    with pytest.raises(FFmpegTimeoutError, match="timed out"):
        service._run(["ffmpeg", "-version"], timeout=1)
