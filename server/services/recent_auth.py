"""Pure recent-authentication validation used by sensitive gateway actions."""

from __future__ import annotations

from datetime import datetime, timezone


def recent_sign_in_age_seconds(value: str | datetime | None, now: datetime | None = None) -> float | None:
    if value is None:
        return None
    try:
        signed_in_at = value if isinstance(value, datetime) else datetime.fromisoformat(value.replace("Z", "+00:00"))
        if signed_in_at.tzinfo is None:
            signed_in_at = signed_in_at.replace(tzinfo=timezone.utc)
        current = now or datetime.now(timezone.utc)
        if current.tzinfo is None:
            current = current.replace(tzinfo=timezone.utc)
        return (current.astimezone(timezone.utc) - signed_in_at.astimezone(timezone.utc)).total_seconds()
    except (TypeError, ValueError):
        return None


def is_recent_sign_in(value: str | datetime | None, max_age_seconds: int = 300, now: datetime | None = None) -> bool:
    age = recent_sign_in_age_seconds(value, now)
    return age is not None and 0 <= age <= max_age_seconds

