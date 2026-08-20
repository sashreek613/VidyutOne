from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings

settings = get_settings()

# Engine is created at import time but SQLAlchemy does not connect until first use.
# Current API routes use in-memory/mock data and do not require Postgres to be running.
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    future=True,
)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, class_=Session)


class Base(DeclarativeBase):
    """Declarative base for SQLAlchemy models.

    Latitude/longitude are stored as floats for the MVP. When PostGIS is added,
    spatial columns can be introduced via GeoAlchemy2 without changing this Base.
    """


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
