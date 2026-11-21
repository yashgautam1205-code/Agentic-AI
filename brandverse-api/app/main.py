import datetime
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base, SessionLocal
from app.models import (
    User, CreatorProfile, MediaFile, TranscriptSegment, ClipCandidate,
    ScheduledPost, PerformanceMetric, SocialIntegration
)
from app.utils.auth import hash_password
from app.routers import (
    auth, media, clips, content, memory, calendar, editor, analytics, library, integrations
)
from app.services.ffmpeg_service import ffmpeg_service


def seed_initial_data():
    """Initializes schema and seeds starter data if database is empty."""
    Base.metadata.create_all(bind=engine)
    if settings.ENVIRONMENT == "production":
        return
    db = SessionLocal()
    try:
        user = db.query(User).first()
        if not user:
            # 1. Create Default User
            user = User(
                email="aryan@brandverse.ai",
                hashed_password=hash_password("creator123"),
                full_name="Aryan Sharma",
                handle="@aryan.creates",
                plan="Pro Creator"
            )
            db.add(user)
            db.commit()
            db.refresh(user)

            # 2. Create Default Creator Profile
            profile = CreatorProfile(
                user_id=user.id,
                brand_tone="Confident, direct, conversational with intellectual depth",
                sentence_style="Short punchy sentences. Fragments for emphasis. Questions to engage. Analytical depth.",
                hook_style="Contrarian opener, then reframe, then insight",
                caption_length_pref="Medium (150-300 words for LinkedIn, 80-150 for Instagram)",
                emoji_preference="Minimal (1-2 per post, never decorative)",
                priority_vocabulary=["multiplier", "irreplaceable", "contrarian", "authentic", "clarity", "systems", "leverage"],
                banned_words=["synergy", "disruptive", "guru", "hack", "secret", "viral", "game-changer"],
                approved_examples=[
                    {"text": "Nobody talks about this — but the best creators are also the best editors. Of themselves.", "platform": "instagram", "engagement": "4.2%"},
                    {"text": "The 10x creator is not 10x busier. They're 10x more systematic.", "platform": "linkedin", "engagement": "6.1%"},
                    {"text": "Your brand voice is not what you say. It's what you consistently choose not to say.", "platform": "x", "engagement": "8.4%"}
                ],
                voice_calibration_score=96.8
            )
            db.add(profile)

            # 3. Create Starter Ingested Media Files
            m1 = MediaFile(
                user_id=user.id,
                title="AI Future of Work Deep Dive",
                original_filename="ai_future_of_work.mp4",
                stored_path=str(settings.UPLOAD_DIR / "media" / "sample_podcast.mp4"),
                file_type="video",
                mime_type="video/mp4",
                file_size_bytes=48500000,
                duration_seconds=6120.0,
                language="English",
                status="done",
                progress_percent=100,
                waveform_data=[25, 45, 60, 32, 70, 85, 40, 55, 90, 65, 30, 48, 72, 88, 95, 60, 42, 35, 78, 82, 50, 64, 40, 92, 100, 75, 45, 58, 80, 65] * 2
            )
            db.add(m1)
            db.commit()
            db.refresh(m1)

            # 4. Create Transcript Segments
            segments = [
                {"start": 4.0, "end": 18.5, "speaker": "Speaker 1 (Aryan)", "text": "Here's the thing most people miss about AI — it's not coming for your creativity, it's coming for your mediocrity."},
                {"start": 19.0, "end": 34.2, "speaker": "Speaker 1 (Aryan)", "text": "The skills that remain completely irreplaceable are emotional intelligence, creative intuition, and authentic storytelling."},
                {"start": 35.0, "end": 52.0, "speaker": "Speaker 2 (Guest)", "text": "When you look at content creators who succeed in 2026, they aren't working ten times harder. They are ten times more systematic."},
                {"start": 53.0, "end": 74.0, "speaker": "Speaker 1 (Aryan)", "text": "Content repurposing fails when you strip out the creator's voice. An algorithm without brand memory produces generic corporate noise."},
                {"start": 75.0, "end": 98.0, "speaker": "Speaker 1 (Aryan)", "text": "If you treat every long-form episode as a content mine, you can compound your reach without spending ten hours editing every clip."}
            ]
            for s in segments:
                db.add(TranscriptSegment(media_id=m1.id, start_time=s["start"], end_time=s["end"], speaker=s["speaker"], text=s["text"]))

            # 5. Create Candidate Clips
            clips = [
                {
                    "title": "The 5 Skills AI Cannot Replace",
                    "start": 4.0,
                    "end": 34.2,
                    "excerpt": "Here's the thing most people miss about AI — it's not coming for your creativity, it's coming for your mediocrity. The five skills that remain completely irreplaceable are emotional intelligence, creative intuition, and authentic storytelling.",
                    "reason": "High-impact contrarian hook in first 3 seconds ('not coming for creativity, coming for mediocrity'). Clear standalone takeaway ideal for Instagram Reels and TikTok discovery algorithms.",
                    "hook": 95, "comp": 90, "rel": 96, "eng": 94, "selected": True, "color": "#1a2a4a"
                },
                {
                    "title": "Why Most Repurposing Fails Creators",
                    "start": 35.0,
                    "end": 74.0,
                    "excerpt": "When you look at content creators who succeed in 2026, they aren't working ten times harder. They are ten times more systematic. Content repurposing fails when you strip out the creator's voice. An algorithm without brand memory produces generic corporate noise.",
                    "reason": "Direct audience pain point addressed with authoritative solution framework. Positions the creator as systems thinker. Ideal for LinkedIn thought leadership and YouTube Shorts.",
                    "hook": 89, "comp": 92, "rel": 94, "eng": 88, "selected": True, "color": "#2a1a4a"
                },
                {
                    "title": "The 10x Content Mining Framework",
                    "start": 75.0,
                    "end": 110.0,
                    "excerpt": "If you treat every long-form episode as a content mine, you can compound your reach without spending ten hours editing every clip. Extract the core insight, recalibrate for each platform, and preserve your tone.",
                    "reason": "Action-oriented educational segment. High save-rate and share-rate potential because viewers can immediately apply the workflow.",
                    "hook": 86, "comp": 94, "rel": 91, "eng": 87, "selected": False, "color": "#1a3a2a"
                }
            ]
            for c in clips:
                db.add(ClipCandidate(
                    media_id=m1.id,
                    title=c["title"],
                    start_time=c["start"],
                    end_time=c["end"],
                    duration_seconds=round(c["end"] - c["start"], 1),
                    transcript_excerpt=c["excerpt"],
                    selection_reason=c["reason"],
                    hook_strength=c["hook"],
                    completeness=c["comp"],
                    topic_relevance=c["rel"],
                    engagement_potential=c["eng"],
                    selected=c["selected"],
                    thumbnail_color=c["color"]
                ))

            # 6. Create Calendar Posts
            db.add(ScheduledPost(
                user_id=user.id,
                platform="instagram",
                scheduled_at=datetime.datetime.utcnow() + datetime.timedelta(days=1),
                status="approved",
                title="The 5 Skills AI Cannot Replace",
                caption="AI is not coming for your creativity — it is coming for your mediocrity. Double down on emotional intelligence and authentic storytelling."
            ))
            db.add(ScheduledPost(
                user_id=user.id,
                platform="linkedin",
                scheduled_at=datetime.datetime.utcnow() + datetime.timedelta(days=2),
                status="draft",
                title="Why Most Repurposing Fails Creators",
                caption="Content repurposing without creator memory produces noise. Here is how we build leverage."
            ))

            db.commit()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize database schema & seed initial data
    seed_initial_data()
    ffmpeg_service.initialize()
    yield
    # Shutdown clean up if needed


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix=settings.API_PREFIX)
app.include_router(media.router, prefix=settings.API_PREFIX)
app.include_router(clips.router, prefix=settings.API_PREFIX)
app.include_router(content.router, prefix=settings.API_PREFIX)
app.include_router(memory.router, prefix=settings.API_PREFIX)
app.include_router(calendar.router, prefix=settings.API_PREFIX)
app.include_router(editor.router, prefix=settings.API_PREFIX)
app.include_router(analytics.router, prefix=settings.API_PREFIX)
app.include_router(library.router, prefix=settings.API_PREFIX)
app.include_router(integrations.router, prefix=settings.API_PREFIX)


@app.get("/")
def root():
    return {
        "project": "BRANDVERSE AI API",
        "tagline": "One source. Infinite stories. Your voice.",
        "version": settings.VERSION,
        "status": "operational",
        "docs_url": "/docs"
    }


@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()}
