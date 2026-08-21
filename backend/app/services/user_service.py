from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database.session import utcnow
from app.models.user import ROLE_DRIVER, ROLE_PLANNER, VALID_ROLES, User


def _role_from_metadata(metadata: object) -> str | None:
    if not isinstance(metadata, dict):
        return None
    raw = metadata.get("role")
    if not isinstance(raw, str):
        return None
    role = raw.strip().lower()
    if role in VALID_ROLES:
        return role
    return None


def _full_name_from_metadata(metadata: object, email: str) -> str:
    if isinstance(metadata, dict):
        for key in ("full_name", "name"):
            value = metadata.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
    local = email.split("@", 1)[0].strip()
    return local or "VidyutOne user"


def get_or_create_profile(
    db: Session,
    *,
    user_id: str,
    email: str,
    metadata: object,
) -> User:
    existing = db.get(User, user_id)
    if existing is not None:
        if email and existing.email != email:
            existing.email = email
            db.add(existing)
            db.commit()
            db.refresh(existing)
        return existing

    taken = db.query(User).filter(User.email == email).one_or_none()
    if taken is not None and taken.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    role = _role_from_metadata(metadata)
    if role is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="A valid application role is required. Sign up again as Planner or Driver.",
        )

    user = User(
        id=user_id,
        full_name=_full_name_from_metadata(metadata, email),
        email=email,
        role=role if role in (ROLE_PLANNER, ROLE_DRIVER) else ROLE_DRIVER,
        created_at=utcnow(),
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raced = db.get(User, user_id)
        if raced is not None:
            return raced
        raise
    db.refresh(user)
    return user
