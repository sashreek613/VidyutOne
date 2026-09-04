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
        updated = False
        if email and existing.email != email:
            existing.email = email
            updated = True
        if isinstance(metadata, dict):
            org = metadata.get("organization")
            if isinstance(org, str) and org and not existing.organization:
                existing.organization = org
                updated = True
            des = metadata.get("designation")
            if isinstance(des, str) and des and not existing.designation:
                existing.designation = des
                updated = True
            phone = metadata.get("phone_number")
            if isinstance(phone, str) and phone and not existing.phone_number:
                existing.phone_number = phone
                updated = True
        if updated:
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

    role = _role_from_metadata(metadata) or ROLE_DRIVER


    org = metadata.get("organization") if isinstance(metadata, dict) and isinstance(metadata.get("organization"), str) else None
    phone = metadata.get("phone_number") if isinstance(metadata, dict) and isinstance(metadata.get("phone_number"), str) else None
    designation = metadata.get("designation") if isinstance(metadata, dict) and isinstance(metadata.get("designation"), str) else None

    # Planners are verified & active by default
    is_planner = (role == ROLE_PLANNER)
    is_verified = True
    is_active = True
    verification_status = "approved"

    user = User(
        id=user_id,
        full_name=_full_name_from_metadata(metadata, email),
        email=email,
        role=role,
        organization=org,
        phone_number=phone,
        designation=designation,
        is_verified=is_verified,
        is_active=is_active,
        verification_status=verification_status,
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


def list_planners(db: Session, status_filter: str | None = None) -> list[User]:
    query = db.query(User).filter(User.role == ROLE_PLANNER)
    if status_filter:
        query = query.filter(User.verification_status == status_filter.lower())
    return query.order_by(User.created_at.desc()).all()


def approve_planner(db: Session, user_id: str) -> User:
    user = db.get(User, user_id)
    if not user or user.role != ROLE_PLANNER:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Planner user not found")

    user.is_verified = True
    user.is_active = True
    user.verification_status = "approved"
    user.rejection_reason = None
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def reject_planner(db: Session, user_id: str, reason: str | None = None) -> User:
    user = db.get(User, user_id)
    if not user or user.role != ROLE_PLANNER:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Planner user not found")

    user.is_verified = False
    user.is_active = False
    user.verification_status = "rejected"
    user.rejection_reason = reason
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

