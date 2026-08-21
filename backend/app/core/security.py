"""Verify Supabase Auth access tokens.

Prefers JWKS (ES256 / RS256 asymmetric signing keys). Falls back to HS256
with SUPABASE_JWT_SECRET for legacy projects that have not rotated keys.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Any

import jwt
from fastapi import HTTPException, status
from jwt import PyJWKClient

from app.core.config import get_settings

_ASYMMETRIC = {"ES256", "RS256", "ES384", "RS384"}
_AUDIENCE = "authenticated"


class InvalidAccessToken(Exception):
    pass


def _unauthorized(detail: str = "Invalid session") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


@lru_cache(maxsize=1)
def _jwks_client(jwks_url: str) -> PyJWKClient:
    return PyJWKClient(jwks_url, cache_jwk_set=True, lifespan=300, timeout=10)


def verify_supabase_jwt(token: str) -> dict[str, Any]:
    settings = get_settings()
    if not settings.supabase_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase configuration error",
        )

    try:
        header = jwt.get_unverified_header(token)
    except jwt.InvalidTokenError as exc:
        raise InvalidAccessToken("Invalid session") from exc

    alg = str(header.get("alg") or "")
    issuer = settings.supabase_jwt_issuer or None
    decode_kwargs: dict[str, Any] = {
        "audience": _AUDIENCE,
        "leeway": 30,
        "options": {"require": ["exp", "sub"]},
    }
    if issuer:
        decode_kwargs["issuer"] = issuer

    try:
        if alg in _ASYMMETRIC:
            if not settings.supabase_jwks_url:
                raise InvalidAccessToken("Supabase configuration error")
            key = _jwks_client(settings.supabase_jwks_url).get_signing_key_from_jwt(token).key
            payload = jwt.decode(token, key, algorithms=[alg], **decode_kwargs)
        elif alg == "HS256":
            secret = settings.SUPABASE_JWT_SECRET
            if not secret:
                raise InvalidAccessToken("Supabase configuration error")
            payload = jwt.decode(token, secret, algorithms=["HS256"], **decode_kwargs)
        else:
            raise InvalidAccessToken("Invalid session")
    except jwt.ExpiredSignatureError as exc:
        raise InvalidAccessToken("Invalid session") from exc
    except jwt.InvalidTokenError as exc:
        raise InvalidAccessToken("Invalid session") from exc
    except HTTPException:
        raise
    except Exception as exc:
        raise InvalidAccessToken("Invalid session") from exc

    role_claim = payload.get("role")
    if role_claim not in {"authenticated", "anon"}:
        raise InvalidAccessToken("Invalid session")
    if role_claim != "authenticated":
        raise InvalidAccessToken("Invalid session")
    if not payload.get("sub"):
        raise InvalidAccessToken("Invalid session")
    return payload


def unauthorized_from_token_error() -> HTTPException:
    return _unauthorized()
