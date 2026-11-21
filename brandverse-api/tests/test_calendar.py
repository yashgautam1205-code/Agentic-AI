from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app


def test_scheduled_post_can_be_created_approved_and_listed(tmp_path):
    engine = create_engine(
        f"sqlite:///{tmp_path / 'calendar-test.db'}",
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
    try:
        client = TestClient(app)
        registration = client.post(
            "/api/auth/register",
            json={
                "email": "calendar@example.com",
                "password": "test-password",
                "full_name": "Calendar Creator",
            },
        )
        token = registration.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        created = client.post(
            "/api/calendar/posts",
            headers=headers,
            json={
                "title": "Launch announcement",
                "platform": "linkedin",
                "scheduled_at": "2026-12-01T10:00:00",
                "caption": "A product launch post.",
            },
        )
        assert created.status_code == 200
        assert created.json()["status"] == "draft"

        post_id = created.json()["id"]
        approved = client.post(f"/api/calendar/posts/{post_id}/approve", headers=headers)
        assert approved.status_code == 200
        assert approved.json()["status"] == "approved"

        listed = client.get("/api/calendar/posts", headers=headers)
        assert listed.status_code == 200
        assert [post["id"] for post in listed.json()] == [post_id]
    finally:
        app.dependency_overrides.clear()
        engine.dispose()
