from datetime import UTC, datetime

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings


def _sqlalchemy_database_url(database_url: str) -> str:
    """Use psycopg v3. Render/Supabase often provide postgres:// or postgresql://."""
    if database_url.startswith("postgres://"):
        return "postgresql+psycopg://" + database_url.removeprefix("postgres://")
    if database_url.startswith("postgresql://"):
        return "postgresql+psycopg://" + database_url.removeprefix("postgresql://")
    return database_url


def _engine_kwargs(database_url: str) -> dict:
    """SQLAlchemy engine options compatible with local Postgres and Supabase.

    Supabase's transaction pooler (port 6543 / *.pooler.supabase.com) does not
    support prepared statements the way psycopg expects, so they are disabled.
    """
    connect_args: dict = {}
    if "sqlite" not in database_url:
        connect_args["connect_timeout"] = 10
        if "supabase.co" in database_url:
            connect_args["sslmode"] = "require"
    pooled = ":6543" in database_url or "pooler.supabase.com" in database_url
    if pooled:
        connect_args["prepare_threshold"] = None
    kwargs: dict = {
        "pool_pre_ping": True,
        "future": True,
        "connect_args": connect_args,
    }
    if "sqlite" not in database_url:
        kwargs["pool_size"] = 5
        kwargs["max_overflow"] = 5
        kwargs["pool_recycle"] = 280
        kwargs["pool_use_lifo"] = True
    return kwargs


settings = get_settings()
_database_url = _sqlalchemy_database_url(settings.DATABASE_URL)

engine = create_engine(_database_url, **_engine_kwargs(_database_url))

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, class_=Session)


class Base(DeclarativeBase):
    """Declarative base for SQLAlchemy models.

    Latitude/longitude remain floats for the V1 API. PostGIS is enabled in
    migrations so radius queries can be added later without changing this Base.
    """


def utcnow() -> datetime:
    return datetime.now(UTC)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
