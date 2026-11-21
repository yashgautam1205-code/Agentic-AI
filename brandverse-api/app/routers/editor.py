import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import User, MediaFile, GeneratedFile
from app.schemas import (
    VideoTrimRequest, SilenceDetectRequest, ThumbnailGenerateRequest
)
from app.utils.auth import get_current_user
from app.services.ffmpeg_service import ffmpeg_service
from app.services.thumbnail_service import thumbnail_service
from app.services.file_storage import (
    UnsafeStoragePath,
    resolve_storage_path,
    validate_generated_filename,
)

router = APIRouter(prefix="/editor", tags=["Video Studio & Thumbnail Generator"])


def format_srt_time(seconds: float) -> str:
    milliseconds = max(0, int(round(seconds * 1000)))
    hours, remainder = divmod(milliseconds, 3600000)
    minutes, remainder = divmod(remainder, 60000)
    secs, millis = divmod(remainder, 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


@router.post("/trim")
def trim_video(
    req: VideoTrimRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Real Video Trimming with FFmpeg:
    Cuts video between start_time and end_time, crops to aspect ratio (9:16, 1:1, 16:9),
    and exports a real playable MP4.
    """
    media = db.query(MediaFile).filter(
        MediaFile.id == req.media_id,
        MediaFile.user_id == user.id
    ).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media file not found.")

    output_filename = f"clip_{uuid.uuid4().hex}.mp4"
    try:
        input_path = resolve_storage_path(media.stored_path, must_exist=True)
        if input_path.parent != resolve_storage_path("media"):
            raise UnsafeStoragePath("Media file is outside its storage directory.")
        output_path = resolve_storage_path(Path("clips") / output_filename)
        if output_path.parent != resolve_storage_path("clips"):
            raise UnsafeStoragePath("Clip output is outside its storage directory.")
    except (UnsafeStoragePath, FileNotFoundError):
        raise HTTPException(status_code=404, detail="Media file not found.") from None

    subtitle_path = None
    try:
        if req.burn_subtitles:
            subtitle_path = resolve_storage_path(
                Path("clips") / f"{uuid.uuid4().hex}.srt"
            )
            if subtitle_path.parent != resolve_storage_path("clips"):
                raise UnsafeStoragePath("Subtitle output is outside its storage directory.")
            segments = media.transcript_segments
            if segments:
                with open(subtitle_path, "w", encoding="utf-8") as srt:
                    for index, segment in enumerate(sorted(segments, key=lambda item: item.start_time), start=1):
                        start_seconds = max(0.0, segment.start_time - req.start_time)
                        end_seconds = max(0.0, segment.end_time - req.start_time)
                        if end_seconds <= 0 or start_seconds >= req.end_time - req.start_time:
                            continue
                        start = format_srt_time(start_seconds)
                        end = format_srt_time(end_seconds)
                        srt.write(f"{index}\n{start} --> {end}\n{segment.text}\n\n")

        success = ffmpeg_service.trim_and_export_clip(
            input_file=input_path,
            output_file=output_path,
            start_time=req.start_time,
            end_time=req.end_time,
            aspect_ratio=req.aspect_ratio,
            subtitle_path=(
                subtitle_path
                if subtitle_path and subtitle_path.is_file() and subtitle_path.stat().st_size > 0
                else None
            ),
        )
        if not success or not output_path.is_file():
            detail = ffmpeg_service.last_error or "FFmpeg video render failed."
            raise HTTPException(status_code=500, detail=f"FFmpeg video render failed: {detail}")

        size_mb = round(output_path.stat().st_size / (1024 * 1024), 2)
        asset = GeneratedFile(
            user_id=user.id,
            media_id=media.id,
            file_name=output_filename,
            relative_path=output_path.relative_to(settings.UPLOAD_DIR.resolve()).as_posix(),
            kind="clip",
        )
        db.add(asset)
        db.commit()
        return {
            "success": True,
            "clip_file_name": output_filename,
            "download_url": f"/api/editor/clips/{output_filename}",
            "duration_seconds": round(req.end_time - req.start_time, 2),
            "aspect_ratio": req.aspect_ratio,
            "file_size_mb": size_mb
        }
    except Exception:
        db.rollback()
        if output_path.exists():
            output_path.unlink(missing_ok=True)
        raise
    finally:
        if subtitle_path and subtitle_path.exists():
            subtitle_path.unlink(missing_ok=True)


@router.post("/silence-detect")
def detect_silence_pauses(
    req: SilenceDetectRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Real FFmpeg Silence Detection:
    Applies silencedetect filter to discover hesitations and dead air.
    """
    media = db.query(MediaFile).filter(
        MediaFile.id == req.media_id,
        MediaFile.user_id == user.id
    ).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media file not found.")

    try:
        target_file = resolve_storage_path(
            media.extracted_audio_path or media.stored_path,
            must_exist=True,
        )
        expected_directory = "audio" if media.extracted_audio_path else "media"
        if target_file.parent != resolve_storage_path(expected_directory):
            raise UnsafeStoragePath("Media file is outside its storage directory.")
    except (UnsafeStoragePath, FileNotFoundError):
        raise HTTPException(status_code=404, detail="Media file not found.") from None

    silences = ffmpeg_service.detect_silence(
        target_file,
        noise_db=req.noise_tolerance_db,
        min_duration=req.duration_threshold_sec
    )

    total_saved = sum(s["duration"] for s in silences)
    return {
        "detected_pauses_count": len(silences),
        "total_seconds_savable": round(total_saved, 2),
        "pauses": silences
    }


@router.post("/thumbnail")
def generate_thumbnail_image(
    req: ThumbnailGenerateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Real Thumbnail Generator:
    Uses Pillow to render a high-res PNG thumbnail with custom headline,
    eyecatcher badge, creator cutout, and selected gradient palette.
    """
    result = thumbnail_service.generate_thumbnail(
        headline=req.headline,
        badge=req.badge,
        template_style=req.template_style,
        aspect_ratio=req.aspect_ratio,
        creator_name=req.creator_name or user.full_name,
        include_creator_badge=req.include_creator_badge
    )
    file_name = validate_generated_filename(result["file_name"])
    try:
        file_path = resolve_storage_path(Path("thumbnails") / file_name, must_exist=True)
    except (UnsafeStoragePath, FileNotFoundError):
        raise HTTPException(status_code=500, detail="Generated thumbnail was not stored safely.") from None

    db.add(GeneratedFile(
        user_id=user.id,
        file_name=file_name,
        relative_path=file_path.relative_to(settings.UPLOAD_DIR.resolve()).as_posix(),
        kind="thumbnail",
    ))
    try:
        db.commit()
    except Exception as exc:
        db.rollback()
        file_path.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail="Generated thumbnail could not be registered.") from exc

    return {key: value for key, value in result.items() if key != "file_path"}


@router.get("/thumbnails/{file_name}")
def download_thumbnail_file(
    file_name: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _download_generated_file(file_name, "thumbnail", "image/png", user, db)


@router.get("/clips/{file_name}")
def download_clip_video(
    file_name: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _download_generated_file(file_name, "clip", "video/mp4", user, db)


def _download_generated_file(
    file_name: str,
    kind: str,
    media_type: str,
    user: User,
    db: Session,
):
    try:
        file_name = validate_generated_filename(file_name)
    except UnsafeStoragePath:
        raise HTTPException(status_code=404, detail="Generated file not found.") from None

    asset = db.query(GeneratedFile).filter(
        GeneratedFile.file_name == file_name,
        GeneratedFile.kind == kind,
        GeneratedFile.user_id == user.id,
    ).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Generated file not found.")

    subdirectory = {"clip": "clips", "thumbnail": "thumbnails"}.get(kind)
    if not subdirectory:
        raise HTTPException(status_code=404, detail="Generated file not found.")
    try:
        file_path = resolve_storage_path(asset.relative_path, must_exist=True)
    except (UnsafeStoragePath, FileNotFoundError):
        raise HTTPException(status_code=404, detail="Generated file not found.") from None
    if file_path.parent != resolve_storage_path(subdirectory) or file_path.name != asset.file_name:
        raise HTTPException(status_code=404, detail="Generated file not found.")

    return FileResponse(
        file_path,
        media_type=media_type,
        filename=file_path.name,
        headers={"X-Content-Type-Options": "nosniff"},
    )
