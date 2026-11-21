"""Track ownership of generated media files.

Revision ID: 20261122_generated_files
Revises: 20261121_initial
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "20261122_generated_files"
down_revision = "20261121_initial"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    if inspect(bind).has_table("generated_files"):
        return

    op.create_table(
        "generated_files",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("media_id", sa.String(length=36), nullable=True),
        sa.Column("file_name", sa.String(length=255), nullable=False),
        sa.Column("relative_path", sa.String(length=500), nullable=False),
        sa.Column("kind", sa.String(length=32), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["media_id"], ["media_files.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("file_name"),
        sa.UniqueConstraint("relative_path"),
    )
    op.create_index("ix_generated_files_media_id", "generated_files", ["media_id"])
    op.create_index("ix_generated_files_user_id", "generated_files", ["user_id"])


def downgrade():
    bind = op.get_bind()
    if not inspect(bind).has_table("generated_files"):
        return

    op.drop_index("ix_generated_files_user_id", table_name="generated_files")
    op.drop_index("ix_generated_files_media_id", table_name="generated_files")
    op.drop_table("generated_files")
