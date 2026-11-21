"""Initial BRANDVERSE schema.

Revision ID: 20261121_initial
Revises:
"""
from alembic import op
import os
from sqlalchemy import create_engine
from app.database import Base

revision = "20261121_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        return
    connect_args = {"check_same_thread": False} if database_url.startswith("sqlite") else {}
    engine = create_engine(database_url, connect_args=connect_args)
    Base.metadata.create_all(bind=engine)


def downgrade():
    pass
