from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, ClipCandidate, GeneratedContent, MediaFile
from app.schemas import (
    GenerateContentRequest, GeneratedContentResponse, SaveContentDraftRequest
)
from app.utils.auth import get_current_user
from app.services.llm_service import llm_service
from app.services.memory_engine import memory_engine

router = APIRouter(prefix="/content", tags=["Content Studio"])


@router.post("/generate", response_model=GeneratedContentResponse)
def generate_content_for_clip(
    req: GenerateContentRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    clip = db.query(ClipCandidate).join(MediaFile).filter(
        ClipCandidate.id == req.clip_id,
        MediaFile.user_id == user.id
    ).first()
    if not clip:
        raise HTTPException(status_code=404, detail="Clip candidate not found.")

    profile = user.profile
    profile_dict = {
        "brand_tone": profile.brand_tone if profile else "Confident and direct",
        "sentence_style": profile.sentence_style if profile else "Short punchy sentences",
        "priority_vocabulary": profile.priority_vocabulary if profile else ["multiplier", "leverage"],
        "banned_words": profile.banned_words if profile else ["synergy", "hack"]
    }

    try:
        gen_data = llm_service.generate_platform_content(
            clip_title=clip.title,
            transcript_excerpt=clip.transcript_excerpt,
            platform=req.platform,
            language=req.language,
            brand_profile=profile_dict,
            custom_instruction=req.custom_instruction
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    # Save to database
    post = GeneratedContent(
        clip_id=clip.id,
        user_id=user.id,
        platform=req.platform.lower(),
        language=req.language.lower(),
        title=gen_data.get("title", clip.title),
        hook=gen_data.get("hook", ""),
        caption=gen_data.get("caption", ""),
        hashtags=gen_data.get("hashtags", []),
        character_count=gen_data.get("character_count", len(gen_data.get("caption", ""))),
        is_edited_by_user=False,
        original_ai_caption=gen_data.get("caption", "")
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return post


@router.post("/save-draft", response_model=GeneratedContentResponse)
def save_edited_draft(
    req: SaveContentDraftRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    post = db.query(GeneratedContent).filter(
        GeneratedContent.clip_id == req.clip_id,
        GeneratedContent.platform == req.platform.lower(),
        GeneratedContent.user_id == user.id
    ).order_by(GeneratedContent.created_at.desc()).first()

    if not post:
        post = GeneratedContent(
            clip_id=req.clip_id,
            user_id=user.id,
            platform=req.platform.lower(),
            language=req.language.lower(),
            title=req.title,
            hook=req.hook,
            caption=req.caption,
            hashtags=req.hashtags or [],
            character_count=len(req.caption),
            is_edited_by_user=True,
            original_ai_caption=req.caption
        )
        db.add(post)
    else:
        if post.caption != req.caption:
            try:
                memory_engine.analyze_edit_and_learn(
                    db=db,
                    user_id=user.id,
                    original_text=post.original_ai_caption or post.caption,
                    edited_text=req.caption,
                    platform=req.platform,
                )
            except Exception:
                pass
        post.caption = req.caption
        post.title = req.title or post.title
        post.hook = req.hook or post.hook
        post.hashtags = req.hashtags or post.hashtags
        post.character_count = len(req.caption)
        post.is_edited_by_user = True

    db.commit()
    db.refresh(post)
    return post


@router.get("/history", response_model=List[GeneratedContentResponse])
def get_content_history(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    posts = db.query(GeneratedContent).filter(
        GeneratedContent.user_id == user.id
    ).order_by(GeneratedContent.created_at.desc()).limit(50).all()
    return posts
