from typing import List, Dict, Any
from sqlalchemy.orm import Session

from app.models import PerformanceMetric, ScheduledPost


class ClosedLoopService:
    def get_feedback_preferences(self, db: Session, user_id: str) -> Dict[str, Any]:
        metrics = db.query(PerformanceMetric).filter(
            PerformanceMetric.user_id == user_id,
            PerformanceMetric.is_demo.is_(False),
        ).all()
        if len(metrics) < 3:
            return {
                "sample_count": len(metrics),
                "ready": False,
                "preferred_hook_styles": [],
                "preferred_platforms": [],
                "explanation": "At least 3 real performance records are required before feedback is applied.",
            }

        hook_scores: Dict[str, float] = {}
        platform_scores: Dict[str, float] = {}
        for metric in metrics:
            hook_scores[metric.hook_style] = hook_scores.get(metric.hook_style, 0.0) + metric.engagement_rate
            platform_scores[metric.platform] = platform_scores.get(metric.platform, 0.0) + metric.engagement_rate

        def ranked(items: Dict[str, float]) -> List[str]:
            return [name for name, score in sorted(items.items(), key=lambda item: item[1], reverse=True)[:3]]

        preferred_hooks = ranked(hook_scores)
        preferred_platforms = ranked(platform_scores)
        return {
            "sample_count": len(metrics),
            "ready": True,
            "preferred_hook_styles": preferred_hooks,
            "preferred_platforms": preferred_platforms,
            "explanation": (
                f"Ranking is using {len(metrics)} real performance records. "
                f"Preferred hook styles: {', '.join(preferred_hooks) or 'none'}."
            ),
        }
    def get_performance_overview(self, db: Session, user_id: str, time_range: str = "7d") -> Dict[str, Any]:
        """
        Calculates real telemetry and aggregates performance statistics across platforms.
        Clearly labels imported/live data vs demo data.
        """
        metrics = db.query(PerformanceMetric).filter(PerformanceMetric.user_id == user_id).all()
        
        has_real_data = any(not m.is_demo for m in metrics)
        
        total_views = sum(m.views for m in metrics)
        avg_engagement = round(sum(m.engagement_rate for m in metrics) / len(metrics), 2) if metrics else 0.0
        total_shares = sum(m.shares for m in metrics)

        weekly_trend = []
        platform_totals: Dict[str, Dict[str, Any]] = {}
        hook_totals: Dict[str, Dict[str, Any]] = {}
        for metric in metrics:
            platform = platform_totals.setdefault(metric.platform, {"views": 0, "engagement": 0.0, "count": 0})
            platform["views"] += metric.views
            platform["engagement"] += metric.engagement_rate
            platform["count"] += 1
            hook = hook_totals.setdefault(metric.hook_style, {"count": 0, "engagement": 0.0})
            hook["count"] += 1
            hook["engagement"] += metric.engagement_rate

        platform_breakdown = [
            {
                "platform": name,
                "views": values["views"],
                "engagement": round(values["engagement"] / values["count"], 2),
                "growth": 0,
            }
            for name, values in platform_totals.items()
        ]
        hook_analytics = [
            {
                "type": name,
                "avgRetention": "N/A",
                "shareRate": f"{round(values['engagement'] / values['count'], 2)}%",
                "sample": "Recorded performance metric",
            }
            for name, values in hook_totals.items()
        ]
        ai_recommendations = []
        if len(metrics) < 3:
            ai_recommendations.append("Add at least 3 real performance records before drawing closed-loop recommendations.")
        else:
            feedback = self.get_feedback_preferences(db, user_id)
            ai_recommendations.append(feedback["explanation"])
        total_scheduled = db.query(ScheduledPost).filter(
            ScheduledPost.user_id == user_id,
        ).count()

        return {
            "is_demo_data": not has_real_data,
            "data_source_label": "Imported/manual telemetry" if has_real_data else "No performance telemetry",
            "total_views": total_views,
            "avg_engagement": avg_engagement,
            "total_shares": total_shares,
            "total_scheduled": total_scheduled,
            "best_platform": max(platform_totals, key=lambda name: platform_totals[name]["views"]) if platform_totals else None,
            "weekly": weekly_trend,
            "platform_comparison": platform_breakdown,
            "hook_analytics": hook_analytics,
            "ai_recommendations": ai_recommendations
        }


closed_loop_service = ClosedLoopService()
