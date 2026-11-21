from cryptography.fernet import Fernet, InvalidToken

from app.config import settings


class TokenCrypto:
    def encrypt(self, value: str) -> str:
        if not value:
            return value
        if not settings.SOCIAL_TOKEN_ENCRYPTION_KEY:
            raise RuntimeError("SOCIAL_TOKEN_ENCRYPTION_KEY is not configured.")
        try:
            fernet = Fernet(settings.SOCIAL_TOKEN_ENCRYPTION_KEY.encode("utf-8"))
        except Exception as exc:
            raise RuntimeError("SOCIAL_TOKEN_ENCRYPTION_KEY is invalid; use a Fernet key.") from exc
        return fernet.encrypt(value.encode("utf-8")).decode("utf-8")

    def decrypt(self, value: str) -> str:
        if not value:
            return value
        if not settings.SOCIAL_TOKEN_ENCRYPTION_KEY:
            raise RuntimeError("SOCIAL_TOKEN_ENCRYPTION_KEY is not configured.")
        try:
            fernet = Fernet(settings.SOCIAL_TOKEN_ENCRYPTION_KEY.encode("utf-8"))
            return fernet.decrypt(value.encode("utf-8")).decode("utf-8")
        except (InvalidToken, Exception) as exc:
            raise RuntimeError("Stored social token could not be decrypted.") from exc


token_crypto = TokenCrypto()
