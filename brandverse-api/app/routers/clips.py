from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, ClipCandidate, MediaFile
from app.schemas import ClipCandidateResponse
from app.utils.auth import get_current_user
from app.services.closed_loop_service import closed_loop_service
from pydantic import BaseModel

router = APIRouter(prefix="/clips", tags=["AI Clip Intelligence"])


class ClipTimestampUpdate(BaseModel):
    start_time: float
    end_time: float


@router.get("/list", response_model=List[ClipCandidateResponse])
def list_clips(
    media_id: Optional[str] = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(ClipCandidate).join(MediaFile).filter(MediaFile.user_id == user.id)
    if media_id:
        query = query.filter(ClipCandidate.media_id == media_id)
        
    clips = query.order_by(ClipCandidate.engagement_potential.desc()).all()
    feedback = closed_loop_service.get_feedback_preferences(db, user.id)
    preferred_hooks = set(feedback["preferred_hook_styles"])
    
    results = []
    for c in clips:
        # Format duration display
        dur_mins = int(c.duration_seconds // 60)
        dur_secs = int(c.duration_seconds % 60)
        dur_str = f"{dur_mins}:{dur_secs:02d}"
        
        # Format time range display
        s_m, s_s = int(c.start_time // 60), int(c.start_time % 60)
        e_m, e_s = int(c.end_time // 60), int(c.end_time % 60)
        time_range = f"{s_m:02d}:{s_s:02d} - {e_m:02d}:{e_s:02d}"
        
        feedback_boost = 0
        combined = f"{c.title} {c.transcript_excerpt}".lower()
        if preferred_hooks:
            if any(token in combined for hook in preferred_hooks for token in hook.lower().replace("statement", "").split()):
                feedback_boost = 12
        adjusted_score = min(100, c.engagement_potential + feedback_boost)
        c_dict = {
            "id": c.id,
            "media_id": c.media_id,
            "title": c.title,
            "start_time": c.start_time,
            "end_time": c.end_time,
            "duration_seconds": c.duration_seconds,
            "duration_display": dur_str,
            "time_range_display": time_range,
            "transcript_excerpt": c.transcript_excerpt,
            "selection_reason": c.selection_reason,
            "hook_strength": c.hook_strength,
            "completeness": c.completeness,
            "topic_relevance": c.topic_relevance,
            "engagement_potential": adjusted_score,
            "selected": c.selected,
            "recommended_platforms": c.recommended_platforms or ["instagram", "youtube", "linkedin"],
            "thumbnail_color": c.thumbnail_color or "#1a2a4a",
            "created_at": c.created_at
        }
        results.append(c_dict)
    results.sort(key=lambda item: item["engagement_potential"], reverse=True)
    return results


@router.post("/{clip_id}/toggle-select", response_model=ClipCandidateResponse)
def toggle_clip_selection(
    clip_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    clip = db.query(ClipCandidate).join(MediaFile).filter(
        ClipCandidate.id == clip_id,
        MediaFile.user_id == user.id
    ).first()
    if not clip:
        raise HTTPException(status_code=404, detail="Clip candidate not found.")

    clip.selected = not clip.selected
    db.commit()
    db.refresh(clip)
    return clip


@router.get("/{clip_id}", response_model=ClipCandidateResponse)
def get_clip_detail(
    clip_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    clip = db.query(ClipCandidate).join(MediaFile).filter(
        ClipCandidate.id == clip_id,
        MediaFile.user_id == user.id
    ).first()
    if not clip:
        raise HTTPException(status_code=404, detail="Clip candidate not found.")
    return clip


@router.put("/{clip_id}/timestamps", response_model=ClipCandidateResponse)
def edit_clip_timestamps(
    clip_id: str,
    req: ClipTimestampUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    clip = db.query(ClipCandidate).join(MediaFile).filter(
        ClipCandidate.id == clip_id,
        MediaFile.user_id == user.id,
    ).first()
    if not clip:
        raise HTTPException(status_code=404, detail="Clip candidate not found.")
    if req.start_time < 0 or req.end_time <= req.start_time:
        raise HTTPException(status_code=400, detail="Invalid clip timestamps.")
    if req.end_time - req.start_time > 300:
        raise HTTPException(status_code=400, detail="Clip duration cannot exceed 300 seconds.")

    clip.start_time = req.start_time
    clip.end_time = req.end_time
    clip.duration_seconds = round(req.end_time - req.start_time, 1)
    db.commit()
    db.refresh(clip)
    return clip


@router.post("/regenerate/{media_id}")
def regenerate_clips(
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

    segments = [
        {
            "start_time": segment.start_time,
            "end_time": segment.end_time,
            "speaker": segment.speaker,
            "text": segment.text,
        }
        for segment in media.transcript_segments
    ]
    if not segments:
        raise HTTPException(status_code=409, detail="This media has no transcript yet.")

    from app.services.clip_intelligence import clip_intelligence_service
    candidates = clip_intelligence_service.detect_candidate_clips(
        segments,
        language=media.language,
    )
    db.query(ClipCandidate).filter(ClipCandidate.media_id == media.id).delete()
    for index, candidate in enumerate(candidates):
        db.add(ClipCandidate(
            media_id=media.id,
            title=candidate["title"],
            start_time=candidate["start_time"],
            end_time=candidate["end_time"],
            duration_seconds=candidate["duration_seconds"],
            transcript_excerpt=candidate["transcript_excerpt"],
            selection_reason=candidate["selection_reason"],
            hook_strength=candidate["hook_strength"],
            completeness=candidate["completeness"],
            topic_relevance=candidate["topic_relevance"],
            engagement_potential=candidate["engagement_potential"],
            selected=index == 0,
            recommended_platforms=candidate["recommended_platforms"],
            thumbnail_color=candidate["thumbnail_color"],
        ))
    db.commit()
    return {"message": "Clip candidates regenerated.", "count": len(candidates)}
