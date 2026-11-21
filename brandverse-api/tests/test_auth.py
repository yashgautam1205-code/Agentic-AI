import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.database import Base, get_db
from app.main import app, seed_initial_data


@pytest.fixture
def client(tmp_path):
    engine = create_engine(
        f"sqlite:///{tmp_path / 'auth-test.db'}",
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
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()
        engine.dispose()


def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_authenticated_routes_reject_missing_token(client):
    response = client.get("/api/media/list")
    assert response.status_code == 401


def test_registered_user_can_login_and_access_media(client):
    registration = client.post(
        "/api/auth/register",
        json={
            "email": "creator@example.com",
            "password": "test-password",
            "full_name": "Test Creator",
        },
    )
    assert registration.status_code == 200

    response = client.post(
        "/api/auth/login",
        json={"email": "creator@example.com", "password": "test-password"},
    )
    assert response.status_code == 200
    token = response.json()["access_token"]

    media = client.get(
        "/api/media/list",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert media.status_code == 200
    assert media.json() == []


def test_production_startup_does_not_seed_demo_account(monkeypatch):
    created_schema = []
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(Base.metadata, "create_all", lambda bind: created_schema.append(bind))
    monkeypatch.setattr(
        "app.main.SessionLocal",
        lambda: pytest.fail("Production startup must not create a demo user."),
    )

    seed_initial_data()

    assert created_schema
