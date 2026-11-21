from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models import User, MediaFile, ClipCandidate, CreatorProfile, PerformanceMetric
from app.routers.clips import list_clips
from app.services.closed_loop_service import closed_loop_service
from app.services.memory_engine import memory_engine


def make_db():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine)()


def test_performance_feedback_requires_three_real_records():
    db = make_db()
    user = User(email="feedback@test.local", hashed_password="x", full_name="Test")
    db.add(user)
    db.commit()

    for index in range(2):
        db.add(PerformanceMetric(
            user_id=user.id,
            platform="instagram",
            post_title=f"Post {index}",
            hook_style="Contrarian Statement",
            views=100,
            engagement_rate=8.0 + index,
            is_demo=False,
        ))
    db.commit()

    feedback = closed_loop_service.get_feedback_preferences(db, user.id)
    assert feedback["ready"] is False
    assert "At least 3" in feedback["explanation"]


def test_real_performance_feedback_boosts_matching_clip():
    db = make_db()
    user = User(email="ranking@example.com", hashed_password="x", full_name="Test")
    db.add(user)
    db.commit()
    media = MediaFile(
        user_id=user.id,
        title="Test media",
        original_filename="test.mp4",
        stored_path="test.mp4",
        file_type="video",
        mime_type="video/mp4",
        file_size_bytes=1,
    )
    db.add(media)
    db.commit()
    clip = ClipCandidate(
        media_id=media.id,
        title="Contrarian launch",
        start_time=0,
        end_time=10,
        duration_seconds=10,
        transcript_excerpt="A clear contrarian framework.",
        selection_reason="Test candidate",
        hook_strength=50,
        completeness=50,
        topic_relevance=50,
        engagement_potential=50,
    )
    db.add(clip)
    for index in range(3):
        db.add(PerformanceMetric(
            user_id=user.id,
            platform="instagram",
            post_title=f"Post {index}",
            hook_style="Contrarian Statement",
            engagement_rate=8.0 + index,
            is_demo=False,
        ))
    db.commit()

    results = list_clips(media_id=None, user=user, db=db)

    assert results[0]["id"] == clip.id
    assert results[0]["engagement_potential"] == 62


def test_creator_edit_is_persisted_as_memory_rule():
    db = make_db()
    user = User(email="memory@test.local", hashed_password="x", full_name="Test")
    db.add(user)
    db.commit()

    result = memory_engine.analyze_edit_and_learn(
        db=db,
        user_id=user.id,
        original_text="Hey guys! This is a great hack you must check out!",
        edited_text="Here is the system I use instead.",
        platform="instagram",
    )

    assert result["stored_rule_id"]
    profile = db.query(CreatorProfile).filter(CreatorProfile.user_id == user.id).first()
    assert profile is not None
