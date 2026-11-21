import datetime
import uuid
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey, JSON
)
from sqlalchemy.orm import relationship

from app.database import Base


def generate_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False, default="Creator")
    handle = Column(String(100), default="@creator")
    plan = Column(String(50), default="Pro Creator")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    profile = relationship("CreatorProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    media_files = relationship("MediaFile", back_populates="user", cascade="all, delete-orphan")
    scheduled_posts = relationship("ScheduledPost", back_populates="user", cascade="all, delete-orphan")
    memory_rules = relationship("CreatorMemoryRule", back_populates="user", cascade="all, delete-orphan")
    integrations = relationship("SocialIntegration", back_populates="user", cascade="all, delete-orphan")
    generated_files = relationship("GeneratedFile", back_populates="user", cascade="all, delete-orphan")


class CreatorProfile(Base):
    __tablename__ = "creator_profiles"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    brand_tone = Column(Text, default="Confident, direct, conversational with intellectual depth")
    sentence_style = Column(Text, default="Short punchy sentences. Fragments for emphasis. Questions to engage. Occasional analytical depth.")
    hook_style = Column(Text, default="Contrarian opener, then reframe, then insight")
    caption_length_pref = Column(String(50), default="Medium (150-300 words)")
    emoji_preference = Column(String(50), default="Minimal (1-2 per post, never decorative)")
    primary_language = Column(String(50), default="English")
    
    # Stored lists of rules & vocabulary
    priority_vocabulary = Column(JSON, default=lambda: ["multiplier", "irreplaceable", "contrarian", "authentic", "clarity", "systems", "leverage"])
    banned_words = Column(JSON, default=lambda: ["synergy", "disruptive", "guru", "hack", "secret", "viral", "game-changer"])
    approved_examples = Column(JSON, default=lambda: [
        {"text": "Nobody talks about this — but the best creators are also the best editors. Of themselves.", "platform": "instagram", "engagement": "4.2%"},
        {"text": "The 10x creator is not 10x busier. They're 10x more systematic.", "platform": "linkedin", "engagement": "6.1%"},
        {"text": "Your brand voice is not what you say. It's what you consistently choose not to say.", "platform": "x", "engagement": "8.4%"}
    ])
    
    voice_calibration_score = Column(Float, default=94.5)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("User", back_populates="profile")


class MediaFile(Base):
    __tablename__ = "media_files"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    title = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    stored_path = Column(String(500), nullable=False)
    extracted_audio_path = Column(String(500), nullable=True)
    
    file_type = Column(String(20), nullable=False)  # 'video' | 'audio'
    mime_type = Column(String(100), nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    duration_seconds = Column(Float, default=0.0)
    language = Column(String(50), default="English")
    
    # Processing stage: 'uploaded' | 'transcoding' | 'transcribing' | 'analyzing' | 'done' | 'error'
    status = Column(String(50), default="uploaded", index=True)
    progress_percent = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    
    waveform_data = Column(JSON, default=list)  # 60 normalized amplitude bars [0-100]
    
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("User", back_populates="media_files")
    transcript_segments = relationship("TranscriptSegment", back_populates="media", cascade="all, delete-orphan", order_by="TranscriptSegment.start_time")
    clips = relationship("ClipCandidate", back_populates="media", cascade="all, delete-orphan")
    generated_files = relationship("GeneratedFile", back_populates="media", cascade="all, delete-orphan")


class TranscriptSegment(Base):
    __tablename__ = "transcript_segments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    media_id = Column(String(36), ForeignKey("media_files.id", ondelete="CASCADE"), nullable=False, index=True)
    
    start_time = Column(Float, nullable=False)  # Seconds
    end_time = Column(Float, nullable=False)
    speaker = Column(String(100), default="Speaker 1")
    text = Column(Text, nullable=False)
    confidence = Column(Float, default=0.95)
    word_timestamps = Column(JSON, default=list)

    media = relationship("MediaFile", back_populates="transcript_segments")


class ClipCandidate(Base):
    __tablename__ = "clip_candidates"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    media_id = Column(String(36), ForeignKey("media_files.id", ondelete="CASCADE"), nullable=False, index=True)
    
    title = Column(String(255), nullable=False)
    start_time = Column(Float, nullable=False)
    end_time = Column(Float, nullable=False)
    duration_seconds = Column(Float, nullable=False)
    
    transcript_excerpt = Column(Text, nullable=False)
    selection_reason = Column(Text, nullable=False)
    
    # Explainable 4-dimensional score (0-100)
    hook_strength = Column(Integer, nullable=False)
    completeness = Column(Integer, nullable=False)
    topic_relevance = Column(Integer, nullable=False)
    engagement_potential = Column(Integer, nullable=False)
    
    selected = Column(Boolean, default=False)
    recommended_platforms = Column(JSON, default=lambda: ["instagram", "youtube", "linkedin"])
    thumbnail_color = Column(String(50), default="#1a2a4a")
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    media = relationship("MediaFile", back_populates="clips")
    generated_posts = relationship("GeneratedContent", back_populates="clip", cascade="all, delete-orphan")


class GeneratedContent(Base):
    __tablename__ = "generated_content"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    clip_id = Column(String(36), ForeignKey("clip_candidates.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    platform = Column(String(50), nullable=False)  # 'instagram' | 'youtube' | 'linkedin' | 'x'
    language = Column(String(50), default="english")  # 'english' | 'hindi' | 'kannada'
    
    title = Column(String(255), nullable=True)
    hook = Column(Text, nullable=True)
    caption = Column(Text, nullable=False)
    hashtags = Column(JSON, default=list)
    
    character_count = Column(Integer, default=0)
    is_edited_by_user = Column(Boolean, default=False)
    original_ai_caption = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    clip = relationship("ClipCandidate", back_populates="generated_posts")


class CreatorMemoryRule(Base):
    __tablename__ = "creator_memory_rules"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    original_text = Column(Text, nullable=False)
    edited_text = Column(Text, nullable=False)
    learned_rule = Column(Text, nullable=False)
    category = Column(String(50), default="tone")  # 'tone' | 'vocabulary' | 'hook' | 'jargon_removal'
    confidence_weight = Column(Float, default=1.0)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="memory_rules")


class ScheduledPost(Base):
    __tablename__ = "scheduled_posts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    clip_id = Column(String(36), ForeignKey("clip_candidates.id", ondelete="SET NULL"), nullable=True)
    
    platform = Column(String(50), nullable=False)
    scheduled_at = Column(DateTime, nullable=False)
    status = Column(String(50), default="draft")  # 'draft' | 'pending_review' | 'approved' | 'published'
    
    title = Column(String(255), nullable=False)
    caption = Column(Text, nullable=True)
    reviewer_comment = Column(Text, nullable=True)
    
    external_post_id = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("User", back_populates="scheduled_posts")


class PerformanceMetric(Base):
    __tablename__ = "performance_metrics"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    scheduled_post_id = Column(String(36), ForeignKey("scheduled_posts.id", ondelete="SET NULL"), nullable=True)
    
    platform = Column(String(50), nullable=False)
    post_title = Column(String(255), nullable=False)
    hook_style = Column(String(100), default="Contrarian Statement")
    
    views = Column(Integer, default=0)
    engagement_rate = Column(Float, default=0.0)
    shares = Column(Integer, default=0)
    likes = Column(Integer, default=0)
    comments = Column(Integer, default=0)
    
    is_demo = Column(Boolean, default=False)
    metric_date = Column(DateTime, default=datetime.datetime.utcnow)


class SocialIntegration(Base):
    __tablename__ = "social_integrations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    platform = Column(String(50), nullable=False)  # 'instagram' | 'youtube' | 'linkedin' | 'x'
    is_connected = Column(Boolean, default=False)
    handle = Column(String(100), nullable=True)
    followers_count = Column(String(50), nullable=True)
    
    access_token = Column(Text, nullable=True)
    refresh_token = Column(Text, nullable=True)
    token_expires_at = Column(DateTime, nullable=True)
    
    connected_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="integrations")


class GeneratedFile(Base):
    __tablename__ = "generated_files"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    media_id = Column(String(36), ForeignKey("media_files.id", ondelete="CASCADE"), nullable=True, index=True)
    file_name = Column(String(255), nullable=False, unique=True)
    relative_path = Column(String(500), nullable=False, unique=True)
    kind = Column(String(32), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="generated_files")
    media = relationship("MediaFile", back_populates="generated_files")
