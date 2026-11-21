from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.models import User, MediaFile, ClipCandidate, GeneratedContent
from app.utils.auth import get_current_user

router = APIRouter(prefix="/library", tags=["Content Library"])


@router.get("/overview")
def get_library_overview(
    search: Optional[str] = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Searchable, filtered archive of media, transcripts, generated clips, and captions.
    """
    media_query = db.query(MediaFile).filter(MediaFile.user_id == user.id)
    clips_query = db.query(ClipCandidate).join(MediaFile).filter(MediaFile.user_id == user.id)
    content_query = db.query(GeneratedContent).filter(GeneratedContent.user_id == user.id)

    if search:
        s = f"%{search.lower()}%"
        media_query = media_query.filter(
            or_(MediaFile.title.ilike(s), MediaFile.language.ilike(s))
        )
        clips_query = clips_query.filter(
            or_(ClipCandidate.title.ilike(s), ClipCandidate.transcript_excerpt.ilike(s))
        )
        content_query = content_query.filter(
            or_(GeneratedContent.title.ilike(s), GeneratedContent.caption.ilike(s))
        )

    media_items = media_query.order_by(MediaFile.uploaded_at.desc()).all()
    clip_items = clips_query.order_by(ClipCandidate.created_at.desc()).all()
    caption_items = content_query.order_by(GeneratedContent.created_at.desc()).all()

    return {
        "search_term": search or "",
        "counts": {
            "all": len(media_items) + len(clip_items) + len(caption_items),
            "projects": len(media_items),
            "clips": len(clip_items),
            "captions": len(caption_items)
        },
        "projects": [
            {
                "id": m.id,
                "title": m.title,
                "type": m.file_type,
                "duration": f"{int(m.duration_seconds // 60)}m",
                "uploadedAt": m.uploaded_at.isoformat(),
                "status": m.status,
                "clipsGenerated": len(m.clips),
                "language": m.language,
                "platform": ["instagram", "youtube", "linkedin"]
            }
            for m in media_items
        ],
        "clips": [
            {
                "id": c.id,
                "title": c.title,
                "startTime": f"{int(c.start_time//60):02d}:{int(c.start_time%60):02d}",
                "endTime": f"{int(c.end_time//60):02d}:{int(c.end_time%60):02d}",
                "duration": f"{int(c.duration_seconds//60)}:{int(c.duration_seconds%60):02d}",
                "transcript": c.transcript_excerpt,
                "selected": c.selected,
                "engagementPotential": c.engagement_potential,
                "platforms": c.recommended_platforms or ["instagram", "youtube"],
                "thumbnailColor": c.thumbnail_color
            }
            for c in clip_items
        ],
        "captions": [
            {
                "id": cp.id,
                "title": cp.title,
                "platform": cp.platform,
                "language": cp.language,
                "caption": cp.caption,
                "characterCount": cp.character_count,
                "createdAt": cp.created_at.isoformat()
            }
            for cp in caption_items
        ]
    }
