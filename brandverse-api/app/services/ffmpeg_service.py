import json
import math
import os
import re
import shutil
import struct
import subprocess
from pathlib import Path
from typing import Any, Dict, List

from app.config import settings
from app.services.file_storage import UnsafeStoragePath, resolve_storage_path


class FFmpegError(RuntimeError):
    pass


class FFmpegUnavailableError(FFmpegError):
    pass


class FFmpegTimeoutError(FFmpegError):
    pass


class FFmpegProcessError(FFmpegError):
    pass


class InvalidMediaError(FFmpegError):
    pass


def resolve_executable(configured_path: str, executable_name: str) -> str:
    candidate = (configured_path or "").strip()
    if candidate:
        path = Path(candidate).expanduser()
        if path.is_file():
            return str(path.resolve())
        if path.exists():
            raise FFmpegUnavailableError(f"{executable_name} path is not a file: {path}")

        resolved = shutil.which(candidate)
        if resolved:
            return str(Path(resolved).resolve())
        raise FFmpegUnavailableError(
            f"{executable_name} was not found at configured path '{candidate}'."
        )

    resolved = shutil.which(executable_name)
    if resolved:
        return str(Path(resolved).resolve())
    raise FFmpegUnavailableError(f"{executable_name} was not found in system PATH.")


class FFmpegService:
    def __init__(
        self,
        ffmpeg_path: str | None = None,
        ffprobe_path: str | None = None,
        storage_root: str | Path | None = None,
    ):
        self._configured_ffmpeg = ffmpeg_path if ffmpeg_path is not None else settings.FFMPEG_PATH
        self._configured_ffprobe = ffprobe_path if ffprobe_path is not None else settings.FFPROBE_PATH
        self._storage_root = Path(storage_root) if storage_root is not None else None
        self.ffmpeg_exe = ""
        self.ffprobe_exe = ""
        self.last_error: str | None = None
        self._initialized = False

    def initialize(self) -> None:
        if self._initialized:
            return

        self.ffmpeg_exe = resolve_executable(self._configured_ffmpeg, "ffmpeg")
        if self._configured_ffprobe.strip():
            self.ffprobe_exe = resolve_executable(self._configured_ffprobe, "ffprobe")
        else:
            suffix = "ffprobe.exe" if os.name == "nt" else "ffprobe"
            sibling = Path(self.ffmpeg_exe).with_name(suffix)
            if sibling.is_file():
                self.ffprobe_exe = str(sibling.resolve())
            else:
                self.ffprobe_exe = resolve_executable("", "ffprobe")

        self._validate_executable(self.ffmpeg_exe, "FFmpeg")
        self._validate_executable(self.ffprobe_exe, "FFprobe")
        self._initialized = True
        self.last_error = None

    def _validate_executable(self, executable: str, label: str) -> None:
        try:
            result = subprocess.run(
                [executable, "-version"],
                capture_output=True,
                text=True,
                timeout=10,
                check=False,
            )
        except subprocess.TimeoutExpired as exc:
            raise FFmpegTimeoutError(f"{label} validation timed out.") from exc
        except OSError as exc:
            raise FFmpegUnavailableError(f"{label} cannot be executed: {exc}") from exc
        if result.returncode != 0:
            detail = (result.stderr or result.stdout).strip()
            raise FFmpegUnavailableError(
                f"{label} validation failed: {detail or 'invalid executable'}"
            )

    def _ensure_initialized(self) -> None:
        if not self._initialized:
            self.initialize()

    def _ensure_input(self, file_path: str | Path) -> Path:
        try:
            path = resolve_storage_path(file_path, root=self._storage_root, must_exist=True)
        except FileNotFoundError as exc:
            raise InvalidMediaError("Input file does not exist or is not a file.") from exc
        except UnsafeStoragePath as exc:
            raise InvalidMediaError("Input file is outside the configured storage directory.") from exc
        if path.stat().st_size == 0:
            raise InvalidMediaError("Input file is empty.")
        return path

    def _ensure_output(self, file_path: str | Path) -> Path:
        try:
            path = resolve_storage_path(file_path, root=self._storage_root)
            path.parent.mkdir(parents=True, exist_ok=True)
            return resolve_storage_path(path, root=self._storage_root)
        except UnsafeStoragePath as exc:
            raise InvalidMediaError("Output file is outside the configured storage directory.") from exc

    def _run(self, cmd: List[str], timeout: int, capture_text: bool = True) -> subprocess.CompletedProcess:
        try:
            if capture_text:
                return subprocess.run(
                    cmd, capture_output=True, text=True, timeout=timeout, check=False
                )
            return subprocess.run(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.DEVNULL,
                timeout=timeout,
                check=False,
            )
        except subprocess.TimeoutExpired as exc:
            raise FFmpegTimeoutError(
                f"Media operation timed out after {timeout} seconds."
            ) from exc
        except OSError as exc:
            raise FFmpegUnavailableError(f"Unable to execute media tool: {exc}") from exc

    def _record_error(self, operation: str, exc: Exception) -> None:
        self.last_error = str(exc)
        print(f"{operation} error: {exc}")

    def probe_media(self, file_path: str | Path) -> Dict[str, Any]:
        try:
            path = self._ensure_input(file_path)
            self._ensure_initialized()
            result = self._run(
                [
                    self.ffprobe_exe,
                    "-v", "error",
                    "-print_format", "json",
                    "-show_format",
                    "-show_streams",
                    str(path),
                ],
                timeout=30,
            )
            if result.returncode != 0:
                detail = (result.stderr or result.stdout or "unknown FFprobe error").strip()
                raise FFmpegProcessError(detail)
            data = json.loads(result.stdout)
            self.last_error = None
            return data
        except json.JSONDecodeError as exc:
            self._record_error("Metadata extraction", FFmpegProcessError("FFprobe returned invalid JSON"))
            return {}
        except FFmpegError as exc:
            self._record_error("Metadata extraction", exc)
            return {}
        except Exception as exc:
            self._record_error("Metadata extraction", exc)
            return {}

    def extract_audio(self, video_path: str | Path, output_wav_path: str | Path) -> bool:
        try:
            input_path = self._ensure_input(video_path)
            self._ensure_initialized()
            output_path = self._ensure_output(output_wav_path)
            result = self._run(
                [
                    self.ffmpeg_exe,
                    "-y",
                    "-i", str(input_path),
                    "-vn",
                    "-acodec", "pcm_s16le",
                    "-ar", "16000",
                    "-ac", "1",
                    str(output_path),
                ],
                timeout=120,
            )
            if result.returncode != 0:
                detail = (result.stderr or result.stdout or "unknown FFmpeg error").strip()
                raise FFmpegProcessError(detail)
            if not output_path.is_file() or output_path.stat().st_size == 0:
                raise FFmpegProcessError("FFmpeg did not create a valid audio output")
            self.last_error = None
            return True
        except FFmpegError as exc:
            self._record_error("Audio extraction", exc)
            return False
        except Exception as exc:
            self._record_error("Audio extraction", exc)
            return False

    def get_media_duration(self, file_path: str | Path) -> float:
        try:
            path = self._ensure_input(file_path)
            self._ensure_initialized()
            result = self._run([self.ffmpeg_exe, "-i", str(path)], timeout=30)
            match = re.search(
                r"Duration:\s*(\d+):(\d+):(\d+\.?\d*)",
                result.stderr or "",
            )
            if match:
                duration = (
                    float(match.group(1)) * 3600
                    + float(match.group(2)) * 60
                    + float(match.group(3))
                )
                self.last_error = None
                return duration
            if result.returncode != 0:
                detail = (result.stderr or result.stdout or "unknown FFmpeg error").strip()
                raise FFmpegProcessError(detail)
            return 0.0
        except FFmpegError as exc:
            self._record_error("Duration detection", exc)
            return 0.0
        except Exception as exc:
            self._record_error("Duration detection", exc)
            return 0.0

    def generate_waveform(self, audio_or_video_path: str | Path, num_bars: int = 60) -> List[int]:
        try:
            path = self._ensure_input(audio_or_video_path)
            self._ensure_initialized()
            result = self._run(
                [
                    self.ffmpeg_exe,
                    "-i", str(path),
                    "-vn",
                    "-ac", "1",
                    "-ar", "8000",
                    "-f", "s16le",
                    "-",
                ],
                timeout=45,
                capture_text=False,
            )
            if result.returncode != 0:
                raise FFmpegProcessError("FFmpeg could not decode audio for the waveform")
            raw_bytes = result.stdout
            if not raw_bytes or len(raw_bytes) < 120:
                raise FFmpegProcessError("Not enough audio data for waveform generation")

            sample_count = len(raw_bytes) // 2
            samples = struct.unpack(f"<{sample_count}h", raw_bytes)
            chunk_size = max(1, sample_count // max(1, num_bars))
            bars = []
            for i in range(num_bars):
                chunk = samples[i * chunk_size:(i + 1) * chunk_size]
                if chunk:
                    rms = math.sqrt(sum(sample * sample for sample in chunk) / len(chunk))
                    bars.append(int(min(100, max(15, (rms / 32768.0) * 220))))
                else:
                    bars.append(30)
            self.last_error = None
            return bars
        except FFmpegError as exc:
            self._record_error("Waveform generation", exc)
            return [0] * num_bars
        except Exception as exc:
            self._record_error("Waveform generation", exc)
            return [0] * num_bars

    def detect_silence(
        self,
        file_path: str | Path,
        noise_db: float = -30.0,
        min_duration: float = 0.35,
    ) -> List[Dict[str, float]]:
        try:
            path = self._ensure_input(file_path)
            self._ensure_initialized()
            result = self._run(
                [
                    self.ffmpeg_exe,
                    "-i", str(path),
                    "-af", f"silencedetect=noise={noise_db}dB:d={min_duration}",
                    "-f", "null",
                    "-",
                ],
                timeout=60,
            )
            if result.returncode != 0:
                detail = (result.stderr or result.stdout or "unknown FFmpeg error").strip()
                raise FFmpegProcessError(detail)

            starts = re.findall(r"silence_start:\s*(\d+\.?\d*)", result.stderr or "")
            ends = re.findall(r"silence_end:\s*(\d+\.?\d*)", result.stderr or "")
            silence_spans = []
            for start_text, end_text in zip(starts, ends):
                start = float(start_text)
                end = float(end_text)
                silence_spans.append(
                    {"start": start, "end": end, "duration": round(end - start, 2)}
                )
            self.last_error = None
            return silence_spans
        except FFmpegError as exc:
            self._record_error("Silence detection", exc)
            return []
        except Exception as exc:
            self._record_error("Silence detection", exc)
            return []

    def trim_and_export_clip(
        self,
        input_file: str | Path,
        output_file: str | Path,
        start_time: float,
        end_time: float,
        aspect_ratio: str = "9:16",
        subtitle_path: str | Path | None = None,
    ) -> bool:
        try:
            input_path = self._ensure_input(input_file)
            if start_time < 0 or end_time <= start_time:
                raise InvalidMediaError("Invalid trim range: require start_time >= 0 and end_time > start_time")
            self._ensure_initialized()

            duration = end_time - start_time
            if aspect_ratio == "9:16":
                vf = "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920"
            elif aspect_ratio == "1:1":
                vf = "scale=1080:1080:force_original_aspect_ratio=increase,crop=1080:1080"
            else:
                vf = "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2"

            if subtitle_path:
                subtitle = self._ensure_input(subtitle_path)
                vf += f",subtitles='{self._escape_subtitle_path(subtitle)}'"

            output_path = self._ensure_output(output_file)
            result = self._run(
                [
                    self.ffmpeg_exe,
                    "-y",
                    "-ss", str(start_time),
                    "-i", str(input_path),
                    "-t", str(duration),
                    "-vf", vf,
                    "-c:v", "libx264",
                    "-preset", "fast",
                    "-crf", "22",
                    "-c:a", "aac",
                    "-b:a", "192k",
                    "-movflags", "+faststart",
                    str(output_path),
                ],
                timeout=120,
            )
            if result.returncode != 0:
                detail = (result.stderr or result.stdout or "unknown FFmpeg error").strip()
                raise FFmpegProcessError(detail)
            if not output_path.is_file() or output_path.stat().st_size == 0:
                raise FFmpegProcessError("FFmpeg did not create a valid clip")
            self.last_error = None
            return True
        except FFmpegError as exc:
            self._record_error("Clip trim", exc)
            return False
        except Exception as exc:
            self._record_error("Clip trim", exc)
            return False

    def _escape_subtitle_path(self, subtitle_path: str | Path) -> str:
        value = str(subtitle_path).replace("\\", "/").replace(":", "\\:")
        return value.replace("'", "\\'")


ffmpeg_service = FFmpegService()
