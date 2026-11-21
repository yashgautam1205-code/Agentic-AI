import os
import math
from pathlib import Path
from typing import Any, Dict, List

from app.services.ffmpeg_service import ffmpeg_service


class TranscriptionService:
    def transcribe(self, media_path: str | Path, language: str = "English") -> List[Dict[str, Any]]:
        """Transcribe real media with an optional local Whisper installation."""
        media_path = Path(media_path)
        wav_path = media_path.parent / f"{media_path.stem}_transcribe.wav"

        if not ffmpeg_service.extract_audio(media_path, wav_path):
            raise RuntimeError("FFmpeg could not extract an audio track for transcription.")

        try:
            import whisper
        except ImportError as exc:
            raise RuntimeError(
                "Whisper transcription is not installed. Install openai-whisper to enable transcription."
            ) from exc

        language_code = {
            "english": "en",
            "hindi": "hi",
            "kannada": "kn",
        }.get(language.lower())

        source_ffmpeg = Path(ffmpeg_service.ffmpeg_exe)
        ffmpeg_dir = source_ffmpeg.parent if source_ffmpeg.is_absolute() else None
        if ffmpeg_dir is None:
            ffmpeg_dir = Path(ffmpeg_service.ffmpeg_exe).parent
        ffmpeg_dir.mkdir(parents=True, exist_ok=True)
        ffmpeg_dir = str(ffmpeg_dir.resolve())
        previous_path = os.environ.get("PATH", "")
        os.environ["PATH"] = ffmpeg_dir + os.pathsep + previous_path
        try:
            model = whisper.load_model("small")
            result = model.transcribe(
                str(wav_path),
                language=language_code,
                task="transcribe",
                word_timestamps=False,
            )
        finally:
            os.environ["PATH"] = previous_path

        segments: List[Dict[str, Any]] = []
        for item in result.get("segments", []):
            text = str(item.get("text", "")).strip()
            if not text:
                continue
            segments.append({
                "start_time": float(item.get("start", 0.0)),
                "end_time": float(item.get("end", 0.0)),
                "speaker": "Speaker 1",
                "text": text,
                "confidence": max(0.0, min(1.0, math.exp(float(item.get("avg_logprob", -1.0) or -1.0)))),
            })
        return segments


transcription_service = TranscriptionService()
