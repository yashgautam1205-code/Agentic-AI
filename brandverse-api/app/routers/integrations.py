from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, SocialIntegration
from app.utils.auth import get_current_user
from app.config import settings
import secrets
import hashlib
import hmac
import urllib.parse

router = APIRouter(prefix="/integrations", tags=["Social Media Integrations"])

DEFAULT_INTEGRATIONS = [
    {"platform": "instagram", "name": "Instagram"},
    {"platform": "youtube", "name": "YouTube"},
    {"platform": "linkedin", "name": "LinkedIn"},
    {"platform": "x", "name": "X (Twitter)"},
]


@router.get("/list")
def list_integrations(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    stored = {i.platform: i for i in db.query(SocialIntegration).filter(SocialIntegration.user_id == user.id).all()}
    
    results = []
    for d in DEFAULT_INTEGRATIONS:
        plat = d["platform"]
        item = stored.get(plat)
        results.append({
            "id": plat,
            "name": d["name"],
            "connected": bool(item and item.is_connected),
            "handle": item.handle if item and item.is_connected else None,
            "followers": item.followers_count if item and item.is_connected else None,
            "configuration_required": True,
        })
    return results


@router.post("/{platform}/toggle")
def toggle_integration(
    platform: str,
    connect: bool = Query(True),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    raise HTTPException(
        status_code=501,
        detail="OAuth connection is not configured. Provide platform OAuth credentials and implement the callback.",
    )


def _provider_config(platform: str):
    if platform == "instagram":
        return settings.INSTAGRAM_APP_ID, settings.INSTAGRAM_REDIRECT_URI, "https://www.facebook.com/v20.0/dialog/oauth"
    if platform == "youtube":
        return settings.YOUTUBE_CLIENT_ID, settings.YOUTUBE_REDIRECT_URI, "https://accounts.google.com/o/oauth2/v2/auth"
    if platform == "linkedin":
        return settings.LINKEDIN_CLIENT_ID, settings.LINKEDIN_REDIRECT_URI, "https://www.linkedin.com/oauth/v2/authorization"
    if platform == "x":
        return settings.X_CLIENT_ID, settings.X_REDIRECT_URI, "https://twitter.com/i/oauth2/authorize"
    raise HTTPException(status_code=404, detail="Unsupported social platform.")


def _signed_state(user_id: str, platform: str) -> str:
    secret = settings.OAUTH_STATE_SECRET or settings.JWT_SECRET_KEY
    nonce = secrets.token_urlsafe(24)
    payload = f"{user_id}:{platform}:{nonce}"
    signature = hmac.new(secret.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()
    return urllib.parse.quote(f"{payload}.{signature}", safe=".")


def _validate_state(state: str, user_id: str, platform: str) -> bool:
    try:
        decoded = urllib.parse.unquote(state)
        payload, signature = decoded.rsplit(".", 1)
        expected_user, expected_platform, _ = payload.split(":", 2)
        secret = settings.OAUTH_STATE_SECRET or settings.JWT_SECRET_KEY
        expected_signature = hmac.new(secret.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()
        return hmac.compare_digest(signature, expected_signature) and expected_user == user_id and expected_platform == platform
    except Exception:
        return False


@router.get("/{platform}/authorize")
def authorize_integration(
    platform: str,
    user: User = Depends(get_current_user),
):
    platform = platform.lower()
    client_id, redirect_uri, authorization_url = _provider_config(platform)
    if not client_id or not redirect_uri:
        raise HTTPException(status_code=503, detail=f"{platform} OAuth credentials are not configured.")

    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "state": _signed_state(user.id, platform),
    }
    if platform == "instagram":
        params["scope"] = "instagram_basic,instagram_content_publish,pages_show_list"
    elif platform == "youtube":
        params["scope"] = "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly"
    elif platform == "linkedin":
        params["scope"] = "openid profile w_member_social"
    elif platform == "x":
        params["scope"] = "tweet.read tweet.write users.read offline.access"
        params["code_challenge"] = "challenge_not_configured"
        params["code_challenge_method"] = "plain"
    return {"authorization_url": authorization_url + "?" + urllib.parse.urlencode(params)}


@router.get("/{platform}/callback")
def integration_callback(
    platform: str,
    code: str = Query(...),
    state: str = Query(...),
    user: User = Depends(get_current_user),
):
    platform = platform.lower()
    if not _validate_state(state, user.id, platform):
        raise HTTPException(status_code=400, detail="Invalid or expired OAuth state.")
    raise HTTPException(
        status_code=501,
        detail=f"{platform} OAuth code exchange and publishing API integration require provider-specific deployment credentials.",
    )


@router.post("/{platform}/disconnect")
def disconnect_integration(
    platform: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    platform = platform.lower()
    item = db.query(SocialIntegration).filter(
        SocialIntegration.user_id == user.id,
        SocialIntegration.platform == platform,
    ).first()
    if item:
        item.is_connected = False
        item.handle = None
        item.followers_count = None
        item.access_token = None
        item.refresh_token = None
        item.token_expires_at = None
        item.connected_at = None
        db.commit()
    return {"platform": platform, "connected": False}
