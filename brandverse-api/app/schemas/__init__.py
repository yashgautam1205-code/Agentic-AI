import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, EmailStr, Field, ConfigDict


# Auth & User
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    full_name: str
    handle: Optional[str] = "@creator"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class CreatorProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    brand_tone: str
    sentence_style: str
    hook_style: str
    caption_length_pref: str
    emoji_preference: str
    primary_language: str
    priority_vocabulary: List[str]
    banned_words: List[str]
    approved_examples: List[dict]
    voice_calibration_score: float

class CreatorProfileUpdate(BaseModel):
    brand_tone: Optional[str] = None
    sentence_style: Optional[str] = None
    hook_style: Optional[str] = None
    caption_length_pref: Optional[str] = None
    emoji_preference: Optional[str] = None
    primary_language: Optional[str] = None
    priority_vocabulary: Optional[List[str]] = None
    banned_words: Optional[List[str]] = None


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    email: str
    full_name: str
    handle: str
    plan: str
    created_at: datetime.datetime
    profile: Optional[CreatorProfileResponse] = None

# Transcript & Media
class TranscriptSegmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    start_time: float
    end_time: float
    speaker: str
    text: str
    confidence: float
    time_display: Optional[str] = None

class MediaFileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    title: str
    original_filename: str
    file_type: str
    mime_type: str
    file_size_bytes: int
    duration_seconds: float
    duration_display: Optional[str] = None
    language: str
    status: str
    progress_percent: int
    waveform_data: List[int]
    clips_count: Optional[int] = 0
    uploaded_at: datetime.datetime

class MediaFileDetail(MediaFileResponse):
    transcript_segments: List[TranscriptSegmentResponse] = []


# Clips
class ClipCandidateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    media_id: str
    title: str
    start_time: float
    end_time: float
    duration_seconds: float
    duration_display: Optional[str] = None
    time_range_display: Optional[str] = None
    transcript_excerpt: str
    selection_reason: str
    hook_strength: int
    completeness: int
    topic_relevance: int
    engagement_potential: int
    selected: bool
    recommended_platforms: List[str]
    thumbnail_color: str
    created_at: datetime.datetime

# Content Studio
class GenerateContentRequest(BaseModel):
    clip_id: str
    platform: str  # 'instagram' | 'youtube' | 'linkedin' | 'x'
    language: str = "english"  # 'english' | 'hindi' | 'kannada'
    custom_instruction: Optional[str] = None


class GeneratedContentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    clip_id: str
    platform: str
    language: str
    title: Optional[str] = None
    hook: Optional[str] = None
    caption: str
    hashtags: List[str] = []
    character_count: int
    is_edited_by_user: bool = False
    created_at: datetime.datetime

class SaveContentDraftRequest(BaseModel):
    clip_id: str
    platform: str
    language: str = "english"
    title: Optional[str] = None
    hook: Optional[str] = None
    caption: str
    hashtags: Optional[List[str]] = []


# Creator Memory
class TeachByEditingRequest(BaseModel):
    original_text: str
    edited_text: str
    platform: Optional[str] = "instagram"


class TeachByEditingResponse(BaseModel):
    learned_rule: str
    category: str
    heuristic_extracted: str
    confidence_boost: float
    updated_calibration_score: float
    stored_rule_id: str


class DigitalTwinTestRequest(BaseModel):
    raw_thought: str
    target_platform: Optional[str] = "instagram"
    language: Optional[str] = "english"


class DigitalTwinTestResponse(BaseModel):
    synthesized_voice: str
    persona_match_percent: float
    rules_applied: List[str]
    vocabulary_matches: List[str]


# Content Calendar
class CreateScheduledPostRequest(BaseModel):
    title: str
    platform: str
    scheduled_at: str  # ISO string
    caption: Optional[str] = None
    clip_id: Optional[str] = None


class UpdateScheduledPostRequest(BaseModel):
    title: Optional[str] = None
    platform: Optional[str] = None
    scheduled_at: Optional[str] = None
    status: Optional[str] = None
    caption: Optional[str] = None
    reviewer_comment: Optional[str] = None


class ScheduledPostResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    user_id: str
    clip_id: Optional[str] = None
    platform: str
    scheduled_at: datetime.datetime
    scheduled_at_display: Optional[str] = None
    status: str
    title: str
    caption: Optional[str] = None
    reviewer_comment: Optional[str] = None
    created_at: datetime.datetime

# Video Editor & Thumbnails
class VideoTrimRequest(BaseModel):
    media_id: str
    start_time: float
    end_time: float
    aspect_ratio: str = "9:16"  # '9:16', '1:1', '16:9'
    burn_subtitles: bool = True


class SilenceDetectRequest(BaseModel):
    media_id: str
    noise_tolerance_db: float = -30.0
    duration_threshold_sec: float = 0.35


class ThumbnailGenerateRequest(BaseModel):
    headline: str
    badge: str = "MUST WATCH"
    template_style: str = "bold_blue"  # 'bold_blue', 'violet_glow', 'amber_flare', 'emerald_minimal'
    aspect_ratio: str = "16:9"  # '16:9' | '9:16'
    creator_name: Optional[str] = "Aryan Sharma"
    include_creator_badge: bool = True
