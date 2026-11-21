import json
from typing import Dict, Any, Optional
import httpx
from app.config import settings


class LLMService:
    MODEL_NAME = "gemini-3.5-flash-lite"

    def __init__(self):
        self.gemini_client = None
        self.client_initialization_failed = False
        api_key = settings.GEMINI_API_KEY
        if api_key:
            try:
                from google import genai
                from google.genai import types
                timeout_ms = max(5, settings.GEMINI_TIMEOUT_SECONDS) * 1000
                self.gemini_client = genai.Client(
                    api_key=api_key,
                    http_options=types.HttpOptions(timeout=timeout_ms),
                )
            except Exception:
                self.client_initialization_failed = True

    def generate_platform_content(
        self,
        clip_title: str,
        transcript_excerpt: str,
        platform: str,
        language: str = "english",
        brand_profile: Optional[Dict[str, Any]] = None,
        custom_instruction: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generates platform-ready captions, titles, hooks, and hashtags with Gemini.
        """
        platform = platform.lower()
        language = language.lower()

        if not self.gemini_client:
            if self.client_initialization_failed:
                raise RuntimeError("Gemini client could not be initialized.")
            raise RuntimeError("GEMINI_API_KEY is not configured.")

        prompt = self._build_gemini_prompt(
            clip_title, transcript_excerpt, platform, language, brand_profile, custom_instruction
        )
        from google.genai import types
        try:
            response = self.gemini_client.models.generate_content(
                model=self.MODEL_NAME,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.7,
                    response_mime_type="application/json",
                ),
            )
        except (TimeoutError, httpx.TimeoutException):
            raise RuntimeError("Gemini request timed out.") from None
        except Exception as e:
            status_code = getattr(e, "code", getattr(e, "status_code", None))
            if status_code in (401, 403):
                raise RuntimeError("Gemini credentials are invalid or lack permission.") from None
            if status_code == 404:
                raise RuntimeError("The configured Gemini model is unavailable.") from None
            if status_code == 429:
                raise RuntimeError("Gemini rate limit exceeded; retry later.") from None
            raise RuntimeError("Gemini content generation failed.") from None

        if not response or not response.text:
            raise RuntimeError("Gemini returned no generated content.")

        try:
            parsed = json.loads(response.text)
        except json.JSONDecodeError:
            raise RuntimeError("Gemini returned invalid JSON content.") from None
        if not isinstance(parsed, dict):
            raise RuntimeError("Gemini returned content in an unexpected format.")

        title = parsed.get("title", clip_title)
        hook = parsed.get("hook", "")
        caption = parsed.get("caption", "")
        hashtags = parsed.get("hashtags", [])
        if (
            not isinstance(title, str)
            or not isinstance(hook, str)
            or not isinstance(caption, str)
            or not isinstance(hashtags, list)
            or not all(isinstance(hashtag, str) for hashtag in hashtags)
        ):
            raise RuntimeError("Gemini returned content in an unexpected format.")

        return {
            "title": title,
            "hook": hook,
            "caption": caption,
            "hashtags": hashtags,
            "character_count": len(caption),
        }

    def _build_gemini_prompt(self, title, transcript, platform, language, profile, custom_instruction):
        profile = profile or {}
        return f"""You are BRANDVERSE AI's content generation engine.
Source Clip Title: {title}
Transcript Excerpt: {transcript}
Target Platform: {platform} (instagram, youtube, linkedin, x)
Language: {language} (english, hindi, kannada)

Brand Voice Profile:
- Tone: {profile.get('brand_tone', 'Confident, direct, analytical')}
- Sentence style: {profile.get('sentence_style', 'Short punchy sentences')}
- Priority Vocabulary to weave in: {profile.get('priority_vocabulary', ['leverage', 'multiplier', 'irreplaceable'])}
- Banned Words to strictly avoid: {profile.get('banned_words', ['synergy', 'guru', 'hack', 'viral'])}

Custom instructions: {custom_instruction or 'None'}

Output JSON schema:
{{
  "title": "string",
  "hook": "string (punchy opener)",
  "caption": "string (platform formatted text)",
  "hashtags": ["list of strings"]
}}"""

llm_service = LLMService()
