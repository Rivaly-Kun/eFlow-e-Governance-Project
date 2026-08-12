"""Authenticated, owner-scoped proxy to the loopback AI API."""

import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
import httpx
from pydantic import BaseModel, Field

from gateway_config import settings
from gateway_dependencies import AuthenticatedUser, internal_ai_key, require_user


logger = logging.getLogger("eflow.ai")
router = APIRouter(prefix="/controlpanelEflow/api/ai", tags=["ai"])


class ChatMessage(BaseModel):
    role: str = Field(pattern="^(system|user|assistant)$")
    content: str = Field(min_length=1, max_length=500_000)


class ChatRequest(BaseModel):
    model: str = Field(min_length=1, max_length=200)
    messages: list[ChatMessage] = Field(min_length=1, max_length=200)
    stream: bool = False
    request_id: str | None = Field(default=None, min_length=1, max_length=100)


def _internal_headers(user: AuthenticatedUser) -> dict[str, str]:
    try:
        internal_key = internal_ai_key.get()
    except Exception as exc:
        logger.exception("Internal AI key is unavailable")
        raise HTTPException(status_code=503, detail="AI gateway is not configured.") from exc
    return {
        "Authorization": f"Bearer {internal_key}",
        "X-eFlow-User-Id": user.id,
    }


async def _proxy(
    method: str,
    path: str,
    user: AuthenticatedUser,
    *,
    payload: dict[str, Any] | None = None,
    timeout_seconds: float = 30,
) -> Response:
    try:
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(timeout_seconds, connect=10.0),
        ) as client:
            upstream = await client.request(
                method,
                f"{settings.internal_ai_base_url}/{path.lstrip('/')}",
                json=payload,
                headers=_internal_headers(user),
            )
    except httpx.ConnectError as exc:
        raise HTTPException(status_code=503, detail="The local AI service is offline.") from exc
    except httpx.TimeoutException as exc:
        raise HTTPException(status_code=504, detail="The local AI request timed out.") from exc
    except httpx.HTTPError as exc:
        logger.exception("AI proxy request failed")
        raise HTTPException(status_code=502, detail="The AI gateway request failed.") from exc

    content_type = upstream.headers.get("content-type", "application/json")
    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        media_type=content_type.split(";", 1)[0],
    )


@router.post("/jobs")
async def enqueue_job(
    payload: ChatRequest,
    user: AuthenticatedUser = Depends(require_user),
):
    if payload.stream:
        raise HTTPException(status_code=400, detail="Queued AI jobs cannot stream.")
    return await _proxy("POST", "jobs", user, payload=payload.model_dump())


@router.get("/jobs/{job_id}")
async def get_job(
    job_id: str,
    user: AuthenticatedUser = Depends(require_user),
):
    return await _proxy("GET", f"jobs/{job_id}", user)


@router.post("/chat")
async def proxy_chat(
    payload: ChatRequest,
    user: AuthenticatedUser = Depends(require_user),
):
    """Compatibility route; new eFlow callers use the queued job API."""
    return await _proxy(
        "POST",
        "chat",
        user,
        payload=payload.model_dump(),
        timeout_seconds=settings.ai_timeout_seconds,
    )
