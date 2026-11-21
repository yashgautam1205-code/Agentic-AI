from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.database import Base, get_db
from app.main import app
from app.models import MediaFile, TranscriptSegment
from app.services.ffmpeg_service import FFmpegService, InvalidMediaError, ffmpeg_service
from app.services.file_storage import UnsafeStoragePath, resolve_storage_path


@pytest.fixture
def media_client(tmp_path, monkeypatch):
    upload_dir = tmp_path / "uploads"
    for subdirectory in ("media", "audio", "clips", "thumbnails"):
        (upload_dir / subdirectory).mkdir(parents=True)
    monkeypatch.setattr(settings, "UPLOAD_DIR", upload_dir)

    engine = create_engine(
        f"sqlite:///{tmp_path / 'media-access.db'}",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(bind=engine)
    test_session = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    def override_get_db():
        db = test_session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    monkeypatch.setattr(ffmpeg_service, "get_media_duration", lambda _path: 10.0)
    monkeypatch.setattr(ffmpeg_service, "generate_waveform", lambda _path, num_bars: [20] * num_bars)
    monkeypatch.setattr(
        "app.routers.media.transcription_service.transcribe",
        lambda *_args, **_kwargs: [
            {"start_time": 0.0, "end_time": 2.0, "text": "Test transcript."}
        ],
    )
    monkeypatch.setattr(
        "app.routers.media.clip_intelligence_service.detect_candidate_clips",
        lambda *_args, **_kwargs: [],
    )

    try:
        yield TestClient(app), test_session, upload_dir
    finally:
        app.dependency_overrides.pop(get_db, None)
        engine.dispose()


def register_user(client, email):
    response = client.post(
        "/api/auth/register",
        json={"email": email, "password": "test-password", "full_name": "Test Creator"},
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def upload_media(client, headers):
    response = client.post(
        "/api/media/upload",
        headers=headers,
        files={"file": ("sample.mp3", b"sample audio bytes", "audio/mpeg")},
        data={"language": "English"},
    )
    assert response.status_code == 200
    return response.json()["id"]


def test_owned_upload_download_and_trimmed_clip_workflow(media_client, monkeypatch):
    client, _test_session, upload_dir = media_client
    owner_headers = register_user(client, "owner@example.com")
    media_id = upload_media(client, owner_headers)

    original = client.get(f"/api/media/{media_id}/download", headers=owner_headers)
    assert original.status_code == 200
    assert original.content == b"sample audio bytes"

    def render_clip(*, output_file, **_kwargs):
        Path(output_file).write_bytes(b"rendered clip bytes")
        return True

    monkeypatch.setattr(ffmpeg_service, "trim_and_export_clip", render_clip)
    trimmed = client.post(
        "/api/editor/trim",
        headers=owner_headers,
        json={
            "media_id": media_id,
            "start_time": 0,
            "end_time": 5,
            "aspect_ratio": "9:16",
            "burn_subtitles": False,
        },
    )
    assert trimmed.status_code == 200
    clip = client.get(trimmed.json()["download_url"], headers=owner_headers)
    assert clip.status_code == 200
    assert clip.content == b"rendered clip bytes"
    clip_path = upload_dir / "clips" / trimmed.json()["clip_file_name"]
    assert clip_path.is_file()
    original_path = next((upload_dir / "media").iterdir())

    deleted = client.delete(f"/api/media/{media_id}", headers=owner_headers)
    assert deleted.status_code == 200
    assert not original_path.exists()
    assert not clip_path.exists()


def test_trim_without_transcript_keeps_subtitles_optional(media_client, monkeypatch):
    client, test_session, _upload_dir = media_client
    owner_headers = register_user(client, "no-transcript@example.com")
    media_id = upload_media(client, owner_headers)
    with test_session() as db:
        db.query(TranscriptSegment).filter(
            TranscriptSegment.media_id == media_id
        ).delete(synchronize_session=False)
        db.commit()

    def render_clip(*, output_file, subtitle_path, **_kwargs):
        assert subtitle_path is None
        Path(output_file).write_bytes(b"rendered clip bytes")
        return True

    monkeypatch.setattr(ffmpeg_service, "trim_and_export_clip", render_clip)
    trimmed = client.post(
        "/api/editor/trim",
        headers=owner_headers,
        json={"media_id": media_id, "start_time": 0, "end_time": 5},
    )

    assert trimmed.status_code == 200


def test_protected_media_and_generated_files_require_authentication(media_client, monkeypatch):
    client, _test_session, _upload_dir = media_client
    owner_headers = register_user(client, "private@example.com")
    media_id = upload_media(client, owner_headers)

    def render_clip(*, output_file, **_kwargs):
        Path(output_file).write_bytes(b"rendered clip bytes")
        return True

    monkeypatch.setattr(ffmpeg_service, "trim_and_export_clip", render_clip)
    trimmed = client.post(
        "/api/editor/trim",
        headers=owner_headers,
        json={"media_id": media_id, "start_time": 0, "end_time": 5},
    )
    assert trimmed.status_code == 200

    assert client.get(f"/api/media/{media_id}/download").status_code == 401
    assert client.get(trimmed.json()["download_url"]).status_code == 401


def test_other_users_cannot_access_media_or_generated_clips(media_client, monkeypatch):
    client, _test_session, _upload_dir = media_client
    owner_headers = register_user(client, "first@example.com")
    other_headers = register_user(client, "second@example.com")
    media_id = upload_media(client, owner_headers)

    def render_clip(*, output_file, **_kwargs):
        Path(output_file).write_bytes(b"rendered clip bytes")
        return True

    monkeypatch.setattr(ffmpeg_service, "trim_and_export_clip", render_clip)
    trimmed = client.post(
        "/api/editor/trim",
        headers=owner_headers,
        json={"media_id": media_id, "start_time": 0, "end_time": 5},
    )
    clip_url = trimmed.json()["download_url"]

    assert client.get(f"/api/media/{media_id}/download", headers=other_headers).status_code == 404
    assert client.get(clip_url, headers=other_headers).status_code == 404


def test_path_traversal_is_rejected_for_generated_downloads_and_storage_paths(media_client):
    client, _test_session, upload_dir = media_client
    headers = register_user(client, "traversal@example.com")
    response = client.get(
        "/api/editor/clips/%2E%2E%5Coutside.mp4",
        headers=headers,
    )

    assert response.status_code in {404, 405}
    with pytest.raises(UnsafeStoragePath):
        resolve_storage_path("../outside.db", root=upload_dir)


def test_delete_rejects_tampered_path_without_removing_external_file(media_client, tmp_path):
    client, test_session, _upload_dir = media_client
    headers = register_user(client, "delete@example.com")
    media_id = upload_media(client, headers)
    protected_file = tmp_path / "important.db"
    protected_file.write_bytes(b"must remain")

    with test_session() as db:
        media = db.query(MediaFile).filter(MediaFile.id == media_id).first()
        media.stored_path = str(protected_file)
        db.commit()

    response = client.delete(f"/api/media/{media_id}", headers=headers)

    assert response.status_code == 409
    assert protected_file.read_bytes() == b"must remain"


def test_invalid_media_ids_are_not_found(media_client):
    client, _test_session, _upload_dir = media_client
    headers = register_user(client, "invalid@example.com")

    assert client.get("/api/media/not-a-real-id", headers=headers).status_code == 404
    assert client.get("/api/media/not-a-real-id/download", headers=headers).status_code == 404
    assert client.delete("/api/media/not-a-real-id", headers=headers).status_code == 404


def test_ffmpeg_rejects_input_and_output_outside_storage_root(tmp_path):
    storage_root = tmp_path / "uploads"
    storage_root.mkdir()
    outside_input = tmp_path / "outside.mp4"
    outside_input.write_bytes(b"not media")
    service = FFmpegService(storage_root=storage_root)

    with pytest.raises(InvalidMediaError, match="outside"):
        service._ensure_input(outside_input)
    with pytest.raises(InvalidMediaError, match="outside"):
        service._ensure_output(tmp_path / "outside-output.mp4")
    assert not (tmp_path / "outside-output.mp4").exists()


def test_owner_can_download_owned_thumbnail(media_client, monkeypatch):
    client, _test_session, upload_dir = media_client
    owner_headers = register_user(client, "thumbnail@example.com")
    other_headers = register_user(client, "not-thumbnail-owner@example.com")
    thumbnail_name = "thumb_test.png"
    (upload_dir / "thumbnails" / thumbnail_name).write_bytes(b"png test data")
    monkeypatch.setattr(
        "app.routers.editor.thumbnail_service.generate_thumbnail",
        lambda **_kwargs: {
            "file_name": thumbnail_name,
            "file_path": str(upload_dir / "thumbnails" / thumbnail_name),
            "download_url": f"/api/editor/thumbnails/{thumbnail_name}",
            "width": 1280,
            "height": 720,
            "aspect_ratio": "16:9",
        },
    )

    generated = client.post(
        "/api/editor/thumbnail",
        headers=owner_headers,
        json={"headline": "Test thumbnail"},
    )
    assert generated.status_code == 200
    assert client.get(generated.json()["download_url"], headers=owner_headers).status_code == 200
    assert client.get(generated.json()["download_url"], headers=other_headers).status_code == 404
