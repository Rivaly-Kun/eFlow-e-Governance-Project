"""Supabase clients, authentication dependencies, and internal secrets."""

from dataclasses import dataclass
import time
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase import Client, create_client

from gateway_config import settings


supabase_admin: Client = create_client(
    settings.supabase_url,
    settings.supabase_service_role_key,
)

bearer = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class AuthenticatedUser:
    id: str
    email: str
    role: str
    org_id: Optional[str]


def require_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> AuthenticatedUser:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="A valid Supabase session is required.",
        )

    try:
        auth_result = supabase_admin.auth.get_user(credentials.credentials)
        auth_user = auth_result.user
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Supabase session.",
        ) from exc

    if not auth_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Supabase session.",
        )

    try:
        profile_result = (
            supabase_admin.table("profiles")
            .select("id,email,role,org_id,is_active")
            .eq("id", str(auth_user.id))
            .single()
            .execute()
        )
        profile = profile_result.data
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The authenticated user does not have an eFlow profile.",
        ) from exc

    if not profile or profile.get("is_active") is not True:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This eFlow account is inactive.",
        )

    return AuthenticatedUser(
        id=str(auth_user.id),
        email=profile.get("email") or getattr(auth_user, "email", "") or "",
        role=profile.get("role") or "employee",
        org_id=profile.get("org_id"),
    )


def require_super_admin(
    user: AuthenticatedUser = Depends(require_user),
) -> AuthenticatedUser:
    if user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super Admin access is required.",
        )
    return user


class InternalAiKeyProvider:
    """Short-lived cache for the secret shared only by ports 8322 and 8321."""

    def __init__(self, ttl_seconds: int = 300):
        self._ttl_seconds = ttl_seconds
        self._value: str | None = None
        self._loaded_at = 0.0

    def get(self) -> str:
        now = time.monotonic()
        if self._value and now - self._loaded_at < self._ttl_seconds:
            return self._value

        result = (
            supabase_admin.table("app_config")
            .select("value")
            .eq("key", "llm_auth_key")
            .single()
            .execute()
        )
        value = (result.data or {}).get("value", "").strip()
        if not value:
            raise RuntimeError("app_config.llm_auth_key is missing or empty")

        self._value = value
        self._loaded_at = now
        return value


internal_ai_key = InternalAiKeyProvider()
