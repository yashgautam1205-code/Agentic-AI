import pytest

from app.config import Settings
from app.services.llm_service import LLMService


def test_settings_parse_comma_separated_cors_origins(tmp_path):
    env_file = tmp_path / ".env"
    env_file.write_text(
        "CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173\n",
        encoding="utf-8",
    )

    loaded_settings = Settings(_env_file=env_file)

    assert loaded_settings.CORS_ORIGINS == [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]


def test_settings_load_production_values_from_env_file(tmp_path):
    env_file = tmp_path / ".env"
    env_file.write_text(
        "\n".join([
            "ENVIRONMENT=production",
            "JWT_SECRET_KEY=test-production-secret-with-at-least-32-characters",
            "DATABASE_URL=sqlite:///production.db",
            f"UPLOAD_DIR={tmp_path / 'uploads'}",
            "CORS_ORIGINS=https://brandverse.example",
        ]),
        encoding="utf-8",
    )

    loaded_settings = Settings(_env_file=env_file)

    assert loaded_settings.ENVIRONMENT == "production"
    assert loaded_settings.CORS_ORIGINS == ["https://brandverse.example"]


def test_production_settings_reject_missing_or_weak_jwt_secret(tmp_path):
    required_settings = {
        "ENVIRONMENT": "production",
        "DATABASE_URL": "sqlite:///production.db",
        "UPLOAD_DIR": tmp_path / "uploads",
        "CORS_ORIGINS": ["https://brandverse.example"],
    }

    with pytest.raises(RuntimeError, match="JWT_SECRET_KEY must be set"):
        Settings(_env_file=None, **required_settings)

    with pytest.raises(RuntimeError, match="at least 32 characters"):
        Settings(_env_file=None, JWT_SECRET_KEY="too-short", **required_settings)


def test_missing_gemini_key_returns_configuration_error(monkeypatch):
    monkeypatch.setattr("app.services.llm_service.settings.GEMINI_API_KEY", "")
    service = LLMService()

    with pytest.raises(RuntimeError, match="GEMINI_API_KEY"):
        service.generate_platform_content(
            clip_title="Test clip",
            transcript_excerpt="A grounded transcript.",
            platform="instagram",
        )


@pytest.mark.parametrize("platform", ["youtube", "instagram", "linkedin"])
def test_generation_uses_platform_prompt_and_supported_model(platform):
    class FakeModels:
        def generate_content(self, model, contents, config):
            assert model == "gemini-3.5-flash-lite"
            assert f"Target Platform: {platform}" in contents
            return type("Response", (), {
                "text": '{"title":"Generated title","hook":"Generated hook",'
                '"caption":"Generated caption","hashtags":["#brand"]}'
            })()

    service = LLMService()
    service.gemini_client = type("Client", (), {"models": FakeModels()})()

    result = service.generate_platform_content(
        clip_title="Test clip",
        transcript_excerpt="A grounded transcript.",
        platform=platform,
    )

    assert result == {
        "title": "Generated title",
        "hook": "Generated hook",
        "caption": "Generated caption",
        "hashtags": ["#brand"],
        "character_count": len("Generated caption"),
    }


def test_provider_failure_does_not_expose_exception_details():
    secret = "sensitive-provider-detail"

    class FakeModels:
        def generate_content(self, **kwargs):
            raise RuntimeError(secret)

    service = LLMService()
    service.gemini_client = type("Client", (), {"models": FakeModels()})()

    with pytest.raises(RuntimeError, match="Gemini content generation failed") as error:
        service.generate_platform_content(
            clip_title="Test clip",
            transcript_excerpt="A grounded transcript.",
            platform="instagram",
        )

    assert secret not in str(error.value)


def test_authentication_failure_has_clear_redacted_error():
    class ProviderError(Exception):
        code = 403

    class FakeModels:
        def generate_content(self, **kwargs):
            raise ProviderError("provider detail that must stay private")

    service = LLMService()
    service.gemini_client = type("Client", (), {"models": FakeModels()})()

    with pytest.raises(RuntimeError, match="credentials are invalid or lack permission") as error:
        service.generate_platform_content(
            clip_title="Test clip",
            transcript_excerpt="A grounded transcript.",
            platform="instagram",
        )

    assert error.value.__suppress_context__
