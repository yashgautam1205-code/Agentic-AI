from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, CreatorProfile, CreatorMemoryRule
from app.schemas import (
    CreatorProfileResponse, CreatorProfileUpdate, TeachByEditingRequest,
    TeachByEditingResponse, DigitalTwinTestRequest, DigitalTwinTestResponse
)
from app.utils.auth import get_current_user
from app.services.memory_engine import memory_engine

router = APIRouter(prefix="/memory", tags=["Creator Memory & Digital Twin"])


@router.get("/profile", response_model=CreatorProfileResponse)
def get_creator_memory_profile(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = user.profile
    if not profile:
        profile = CreatorProfile(user_id=user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


@router.put("/profile", response_model=CreatorProfileResponse)
def update_creator_memory_profile(
    update_data: CreatorProfileUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = user.profile
    if not profile:
        profile = CreatorProfile(user_id=user.id)
        db.add(profile)

    for field, val in update_data.model_dump(exclude_unset=True).items():
        if val is not None:
            setattr(profile, field, val)

    db.commit()
    db.refresh(profile)
    return profile


@router.post("/teach", response_model=TeachByEditingResponse)
def teach_by_editing(
    req: TeachByEditingRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Teach-by-Editing Learning Engine:
    Compares original AI draft vs human edit, extracts reusable heuristics,
    updates CreatorProfile rules in DB, and raises the voice calibration score.
    """
    return memory_engine.analyze_edit_and_learn(
        db=db,
        user_id=user.id,
        original_text=req.original_text,
        edited_text=req.edited_text,
        platform=req.platform or "instagram"
    )


@router.post("/simulate-twin", response_model=DigitalTwinTestResponse)
def simulate_digital_twin(
    req: DigitalTwinTestRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Creator Digital Twin Voice Simulator:
    Translates raw unpolished notes into the creator's exact learned rhetorical style.
    """
    return memory_engine.test_digital_twin_voice(
        db=db,
        user_id=user.id,
        raw_thought=req.raw_thought,
        platform=req.target_platform or "instagram",
        language=req.language or "english"
    )


@router.get("/rules")
def list_memory_rules(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    rules = db.query(CreatorMemoryRule).filter(
        CreatorMemoryRule.user_id == user.id
    ).order_by(CreatorMemoryRule.created_at.desc()).all()
    
    return [
        {
            "id": r.id,
            "original_text": r.original_text,
            "edited_text": r.edited_text,
            "learned_rule": r.learned_rule,
            "category": r.category,
            "confidence_weight": r.confidence_weight,
            "created_at": r.created_at
        }
        for r in rules
    ]
