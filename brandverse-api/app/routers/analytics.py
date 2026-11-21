from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.utils.auth import get_current_user
from app.services.closed_loop_service import closed_loop_service

router = APIRouter(prefix="/analytics", tags=["Performance Intelligence"])


@router.get("/overview")
def get_analytics_overview(
    time_range: Optional[str] = Query("7d"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns analytics metrics, platform breakdowns, hook retention telemetry,
    and closed-loop AI recommendations. Clearly distinguishes real vs demo data.
    """
    return closed_loop_service.get_performance_overview(db, user.id, time_range=time_range or "7d")


@router.post("/import")
def import_performance_telemetry(
    platform: str,
    views: int,
    engagement_rate: float,
    shares: int,
    post_title: str,
    hook_style: str = "Contrarian Statement",
    scheduled_post_id: Optional[str] = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from app.models import PerformanceMetric
    metric = PerformanceMetric(
        user_id=user.id,
        platform=platform,
        post_title=post_title,
        hook_style=hook_style,
        scheduled_post_id=scheduled_post_id,
        views=views,
        engagement_rate=engagement_rate,
        shares=shares,
        is_demo=False
    )
    db.add(metric)
    db.commit()
    db.refresh(metric)
    return {"message": "Performance metrics imported successfully.", "metric_id": metric.id}
