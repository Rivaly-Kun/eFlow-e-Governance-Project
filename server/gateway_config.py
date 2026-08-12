"""Runtime configuration for the eFlow control gateway."""

from dataclasses import dataclass
import os
from pathlib import Path

from dotenv import load_dotenv


load_dotenv(Path(__file__).resolve().parent.parent / ".env")


def _required_env(*names: str) -> str:
    for name in names:
        value = os.getenv(name, "").strip()
        if value:
            return value
    joined = " or ".join(names)
    raise RuntimeError(f"Missing required environment variable: {joined}")


def _allowed_origins() -> list[str]:
    raw = os.getenv("EFLOW_ALLOWED_ORIGINS", "*")
    origins = [origin.strip() for origin in raw.split(",") if origin.strip()]
    return origins or ["*"]


@dataclass(frozen=True)
class GatewaySettings:
    supabase_url: str
    supabase_service_role_key: str
    internal_ai_base_url: str
    ai_timeout_seconds: float
    allowed_origins: list[str]


def load_settings() -> GatewaySettings:
    return GatewaySettings(
        supabase_url=_required_env("SUPABASE_URL", "VITE_SUPABASE_URL").rstrip("/"),
        # Deliberately do not accept a VITE_ service-role variable. VITE_ values
        # are browser-facing configuration and must never be treated as secrets.
        supabase_service_role_key=_required_env("SUPABASE_SERVICE_ROLE_KEY"),
        internal_ai_base_url=os.getenv(
            "EFLOW_INTERNAL_AI_BASE_URL",
            "http://127.0.0.1:8321/controlpanelEflow/api",
        ).rstrip("/"),
        ai_timeout_seconds=float(os.getenv("EFLOW_AI_TIMEOUT_SECONDS", "7200")),
        allowed_origins=_allowed_origins(),
    )


settings = load_settings()
