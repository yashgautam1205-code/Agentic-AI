import pathlib
from alembic.config import Config
from alembic import command
from sqlalchemy import create_engine, inspect

from app.config import settings


def test_alembic_upgrade_and_downgrade_smoke(tmp_path, monkeypatch):
    db_path = tmp_path / "migration.db"
    database_url = f"sqlite:///{db_path}"
    monkeypatch.setattr(settings, "DATABASE_URL", database_url)
    monkeypatch.setattr(settings, "UPLOAD_DIR", tmp_path / "uploads")
    monkeypatch.setenv("DATABASE_URL", database_url)

    alembic_cfg = Config(str(pathlib.Path(__file__).resolve().parents[1] / "alembic.ini"))
    command.upgrade(alembic_cfg, "head")
    engine = create_engine(database_url)
    try:
        assert inspect(engine).has_table("generated_files")
        command.downgrade(alembic_cfg, "base")
        assert not inspect(engine).has_table("generated_files")
    finally:
        engine.dispose()
