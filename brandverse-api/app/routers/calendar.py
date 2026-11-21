import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, ScheduledPost, SocialIntegration
from app.schemas import (
    CreateScheduledPostRequest, UpdateScheduledPostRequest, ScheduledPostResponse
)
from app.utils.auth import get_current_user

router = APIRouter(prefix="/calendar", tags=["Content Calendar"])


@router.get("/posts", response_model=List[ScheduledPostResponse])
def list_scheduled_posts(
    platform: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(ScheduledPost).filter(ScheduledPost.user_id == user.id)
    if platform and platform != "all":
        query = query.filter(ScheduledPost.platform == platform.lower())
    if status and status != "all":
        query = query.filter(ScheduledPost.status == status.lower())

    posts = query.order_by(ScheduledPost.scheduled_at.asc()).all()

    results = []
    for p in posts:
        # Format display string
        dt_str = p.scheduled_at.strftime("%a, %b %d · %I:%M %p")
        p_dict = {
            "id": p.id,
            "user_id": p.user_id,
            "clip_id": p.clip_id,
            "platform": p.platform,
            "scheduled_at": p.scheduled_at,
            "scheduled_at_display": dt_str,
            "status": p.status,
            "title": p.title,
            "caption": p.caption,
            "reviewer_comment": p.reviewer_comment,
            "created_at": p.created_at
        }
        results.append(p_dict)
    return results


@router.post("/posts", response_model=ScheduledPostResponse)
def create_scheduled_post(
    req: CreateScheduledPostRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Parse ISO or local datetime
        clean_dt = req.scheduled_at.replace("Z", "+00:00")
        scheduled_dt = datetime.datetime.fromisoformat(clean_dt)
    except Exception:
        scheduled_dt = datetime.datetime.utcnow() + datetime.timedelta(days=2)

    post = ScheduledPost(
        user_id=user.id,
        clip_id=req.clip_id,
        platform=req.platform.lower(),
        scheduled_at=scheduled_dt,
        status="draft",
        title=req.title,
        caption=req.caption
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return post


@router.put("/posts/{post_id}", response_model=ScheduledPostResponse)
def update_scheduled_post(
    post_id: str,
    req: UpdateScheduledPostRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    post = db.query(ScheduledPost).filter(
        ScheduledPost.id == post_id,
        ScheduledPost.user_id == user.id
    ).first()
    if not post:
        raise HTTPException(status_code=404, detail="Scheduled post not found.")

    if req.title:
        post.title = req.title
    if req.platform:
        post.platform = req.platform.lower()
    if req.status:
        post.status = req.status.lower()
    if req.caption is not None:
        post.caption = req.caption
    if req.reviewer_comment is not None:
        post.reviewer_comment = req.reviewer_comment
    if req.scheduled_at:
        try:
            post.scheduled_at = datetime.datetime.fromisoformat(req.scheduled_at.replace("Z", "+00:00"))
        except Exception:
            pass

    db.commit()
    db.refresh(post)
    return post


@router.post("/posts/{post_id}/approve", response_model=ScheduledPostResponse)
def approve_post(
    post_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    post = db.query(ScheduledPost).filter(
        ScheduledPost.id == post_id,
        ScheduledPost.user_id == user.id
    ).first()
    if not post:
        raise HTTPException(status_code=404, detail="Scheduled post not found.")

    post.status = "approved"
    db.commit()
    db.refresh(post)
    return post


@router.post("/posts/{post_id}/comment", response_model=ScheduledPostResponse)
def add_reviewer_comment(
    post_id: str,
    comment: str = Query(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    post = db.query(ScheduledPost).filter(
        ScheduledPost.id == post_id,
        ScheduledPost.user_id == user.id
    ).first()
    if not post:
        raise HTTPException(status_code=404, detail="Scheduled post not found.")

    post.reviewer_comment = comment
    post.status = "pending_review"
    db.commit()
    db.refresh(post)
    return post


@router.delete("/posts/{post_id}")
def delete_scheduled_post(
    post_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    post = db.query(ScheduledPost).filter(
        ScheduledPost.id == post_id,
        ScheduledPost.user_id == user.id
    ).first()
    if not post:
        raise HTTPException(status_code=404, detail="Scheduled post not found.")

    db.delete(post)
    db.commit()
    return {"message": "Scheduled post deleted successfully."}


@router.post("/posts/{post_id}/publish")
def publish_scheduled_post(
    post_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    post = db.query(ScheduledPost).filter(
        ScheduledPost.id == post_id,
        ScheduledPost.user_id == user.id,
    ).first()
    if not post:
        raise HTTPException(status_code=404, detail="Scheduled post not found.")

    integration = db.query(SocialIntegration).filter(
        SocialIntegration.user_id == user.id,
        SocialIntegration.platform == post.platform,
        SocialIntegration.is_connected.is_(True),
    ).first()
    if not integration:
        raise HTTPException(
            status_code=503,
            detail=f"{post.platform} is not connected. OAuth credentials and permissions are required.",
        )
    raise HTTPException(
        status_code=501,
        detail=f"{post.platform} publishing is not implemented for verified platform credentials.",
    )
