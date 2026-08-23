"""Authorized collaboration and private staffing recommendation routes."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from gateway_dependencies import AuthenticatedUser, require_user, supabase_admin
from services.collaboration_ai import recommend_assignments


router = APIRouter(prefix="/controlpanelEflow/api/collaboration", tags=["collaboration"])


class RecommendationRequest(BaseModel):
    task_keys: list[str] = Field(default_factory=list, max_length=500)


@router.post("/drafts/{draft_id}/recommend-assignments")
async def collaboration_recommendations(
    draft_id: str,
    payload: RecommendationRequest,
    user: AuthenticatedUser = Depends(require_user),
):
    try:
        recommendations = await recommend_assignments(user, draft_id, payload.task_keys)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Collaboration staffing intelligence is temporarily unavailable.") from exc
    try:
        supabase_admin.table("audit_events").insert({
            "actor_id": user.id,
            "actor_name": user.email or "User",
            "entity_type": "collaboration_draft",
            "entity_id": draft_id,
            "action": "collaboration.ai_assignment_recommended",
            "after_data": {
                "recommendationCount": len(recommendations),
                "taskKeys": sorted({item.get("taskKey") for item in recommendations if item.get("taskKey")}),
            },
            "org_id": user.org_id,
        }).execute()
    except Exception:
        # Recommendation delivery must not fail only because audit storage is
        # temporarily unavailable; the gateway logs still retain the request.
        pass
    return {"recommendations": recommendations}
