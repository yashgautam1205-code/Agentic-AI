import uuid
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import User, MediaFile, TranscriptSegment, ClipCandidate, GeneratedFile
from app.schemas import MediaFileResponse, MediaFileDetail, TranscriptSegmentResponse
from app.utils.auth import get_current_user
from app.services.ffmpeg_service import ffmpeg_service
from app.services.transcription_service import transcription_service
from app.services.clip_intelligence import clip_intelligence_service
from app.services.file_storage import UnsafeStoragePath, resolve_storage_path

router = APIRouter(prefix="/media", tags=["Media Studio"])

ALLOWED_EXTENSIONS = {".mp4", ".mov", ".mkv", ".avi", ".webm", ".mp3", ".wav", ".m4a", ".flac", ".ogg", ".aac"}


@router.post("/upload", response_model=MediaFileDetail)
async def upload_media_file(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    language: Optional[str] = Form("English"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Real Media Ingestion Pipeline:
    1. Validates extension and file size
    2. Saves file to uploads/media
    3. Runs FFmpeg audio extraction and waveform calculation
    4. Runs transcription service (timestamped segments)
    5. Runs clip intelligence detection (generates candidates)
    6. Stores in database
    """
    orig_filename = file.filename or "media_upload"
    ext = Path(orig_filename).suffix.lower()

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported format '{ext}'. Supported: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Save to disk
    file_id = f"{uuid.uuid4().hex}{ext}"
    try:
        save_path = resolve_storage_path(Path("media") / file_id)
    except UnsafeStoragePath as exc:
        raise HTTPException(status_code=500, detail="Upload storage is not configured safely.") from exc
    save_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        save_path = resolve_storage_path(Path("media") / file_id)
    except UnsafeStoragePath as exc:
        raise HTTPException(status_code=500, detail="Upload storage is not configured safely.") from exc
    
    file_size = 0
    try:
        with open(save_path, "xb") as buffer:
            while chunk := await file.read(1024 * 1024):  # 1MB chunks
                file_size += len(chunk)
                if file_size > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
                    save_path.unlink(missing_ok=True)
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"File exceeds maximum allowed size of {settings.MAX_FILE_SIZE_MB}MB."
                    )
                buffer.write(chunk)
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Failed to save upload: {e}")

    # Determine type
    is_audio = ext in {".mp3", ".wav", ".m4a", ".flac", ".ogg", ".aac"}
    file_type = "audio" if is_audio else "video"
    mime_type = file.content_type or ("audio/wav" if is_audio else "video/mp4")

    # Real media duration and waveform via FFmpeg
    if not save_path.is_file() or save_path.stat().st_size == 0:
        raise HTTPException(status_code=400, detail="Uploaded media file is empty.")
    duration = ffmpeg_service.get_media_duration(save_path)
    waveform = ffmpeg_service.generate_waveform(save_path, num_bars=60)

    # Audio extraction if video
    extracted_audio = None
    if not is_audio:
        wav_id = f"{Path(file_id).stem}.wav"
        wav_path = resolve_storage_path(Path("audio") / wav_id)
        if ffmpeg_service.extract_audio(save_path, wav_path):
            extracted_audio = str(wav_path)

    # Create Media Record
    media = MediaFile(
        user_id=user.id,
        title=title or Path(orig_filename).stem.replace("_", " ").title(),
        original_filename=orig_filename,
        stored_path=str(save_path),
        extracted_audio_path=extracted_audio,
        file_type=file_type,
        mime_type=mime_type,
        file_size_bytes=file_size,
        duration_seconds=duration,
        language=language or "English",
        status="uploaded",
        progress_percent=10,
        waveform_data=waveform
    )
    db.add(media)
    db.commit()
    db.refresh(media)

    try:
        media.status = "transcribing"
        media.progress_percent = 55
        db.commit()

        segments_data = transcription_service.transcribe(save_path, language=language)
        if not segments_data:
            raise RuntimeError("Whisper returned no transcript segments.")

        for s in segments_data:
            db.add(TranscriptSegment(
                media_id=media.id,
                start_time=s["start_time"],
                end_time=s["end_time"],
                speaker=s.get("speaker", "Speaker 1"),
                text=s["text"],
                confidence=s.get("confidence", 0.95)
            ))
        db.commit()

        media.status = "analyzing"
        media.progress_percent = 85
        db.commit()

        clip_candidates = clip_intelligence_service.detect_candidate_clips(segments_data, language=language)
        for idx, c in enumerate(clip_candidates):
            db.add(ClipCandidate(
                media_id=media.id,
                title=c["title"],
                start_time=c["start_time"],
                end_time=c["end_time"],
                duration_seconds=c["duration_seconds"],
                transcript_excerpt=c["transcript_excerpt"],
                selection_reason=c["selection_reason"],
                hook_strength=c["hook_strength"],
                completeness=c["completeness"],
                topic_relevance=c["topic_relevance"],
                engagement_potential=c["engagement_potential"],
                selected=idx == 0,
                recommended_platforms=c.get("recommended_platforms", ["instagram", "youtube", "linkedin"]),
                thumbnail_color=c.get("thumbnail_color", "#1a2a4a")
            ))
        db.commit()

        media.status = "done"
        media.progress_percent = 100
        media.error_message = None
        db.commit()
        db.refresh(media)
        return media
    except Exception as exc:
        media.status = "error"
        media.progress_percent = 55
        media.error_message = str(exc)
        db.commit()
        db.refresh(media)
        return media


@router.get("/list", response_model=List[MediaFileResponse])
def list_user_media(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    media_list = db.query(MediaFile).filter(MediaFile.user_id == user.id).order_by(MediaFile.uploaded_at.desc()).all()
    # Compute duration_display and clips_count
    results = []
    for m in media_list:
        mins = int(m.duration_seconds // 60)
        secs = int(m.duration_seconds % 60)
        dur_str = f"{mins}m {secs}s" if mins > 0 else f"{secs}s"
        
        m_dict = {
            "id": m.id,
            "title": m.title,
            "original_filename": m.original_filename,
            "file_type": m.file_type,
            "mime_type": m.mime_type,
            "file_size_bytes": m.file_size_bytes,
            "duration_seconds": m.duration_seconds,
            "duration_display": dur_str,
            "language": m.language,
            "status": m.status,
            "progress_percent": m.progress_percent,
            "waveform_data": m.waveform_data or [],
            "clips_count": len(m.clips),
            "uploaded_at": m.uploaded_at
        }
        results.append(m_dict)
    return results


@router.get("/{media_id}", response_model=MediaFileDetail)
def get_media_detail(
    media_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    media = db.query(MediaFile).filter(MediaFile.id == media_id, MediaFile.user_id == user.id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found.")
    return media


@router.get("/{media_id}/download")
def download_media_file(
    media_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    media = db.query(MediaFile).filter(
        MediaFile.id == media_id,
        MediaFile.user_id == user.id,
    ).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found.")

    try:
        file_path = resolve_storage_path(media.stored_path, must_exist=True)
        if file_path.parent != resolve_storage_path("media"):
            raise UnsafeStoragePath("Media file is outside its storage directory.")
    except (UnsafeStoragePath, FileNotFoundError):
        raise HTTPException(status_code=404, detail="Media file not found.") from None

    return FileResponse(
        file_path,
        media_type="application/octet-stream",
        filename=file_path.name,
        headers={"X-Content-Type-Options": "nosniff"},
    )


@router.delete("/{media_id}")
def delete_media_file(
    media_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    media = db.query(MediaFile).filter(MediaFile.id == media_id, MediaFile.user_id == user.id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found.")

    paths_to_remove = []
    stored_paths = [
        (media.stored_path, settings.UPLOAD_DIR / "media"),
        (media.extracted_audio_path, settings.UPLOAD_DIR / "audio"),
    ]
    generated_files = db.query(GeneratedFile).filter(
        GeneratedFile.media_id == media.id,
        GeneratedFile.user_id == user.id,
    ).all()
    for asset in generated_files:
        subdirectory = {"clip": "clips", "thumbnail": "thumbnails"}.get(asset.kind)
        if not subdirectory:
            raise HTTPException(status_code=409, detail="Media contains an invalid generated file.")
        stored_paths.append((asset.relative_path, settings.UPLOAD_DIR / subdirectory))

    try:
        for stored_path, storage_root in stored_paths:
            if not stored_path:
                continue
            file_path = resolve_storage_path(stored_path)
            if file_path.parent != resolve_storage_path(storage_root.name):
                raise UnsafeStoragePath("Stored file is outside its expected storage directory.")
            if file_path.exists() and not file_path.is_file():
                raise UnsafeStoragePath("Stored media path is not a file.")
            paths_to_remove.append(file_path)
    except UnsafeStoragePath:
        raise HTTPException(status_code=409, detail="Media contains an invalid storage path.") from None

    try:
        for file_path in paths_to_remove:
            file_path.unlink(missing_ok=True)
    except OSError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="Media files could not be removed safely.") from exc

    db.delete(media)
    db.commit()
    return {"message": "Media and associated clips deleted successfully."}
