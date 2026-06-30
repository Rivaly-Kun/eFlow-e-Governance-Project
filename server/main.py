"""
eFlow Control Panel — FastAPI Server
Admin user management endpoints for Supabase Auth.
"""

import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from pydantic import BaseModel
from typing import Optional

logger = logging.getLogger("eflow")

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://ixnfphgjyelhckjwjkdv.supabase.co")
SUPABASE_SERVICE_ROLE_KEY = os.getenv(
    "SUPABASE_SERVICE_ROLE_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4bmZwaGdqeWVsaGNrandqa2R2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjIxNjUwOSwiZXhwIjoyMDk3NzkyNTA5fQ.0HS1PkVk4kG8IfV-f-oapSmIaf8nAA0TSOqKwUQVYTM",
)

supabase_admin: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# Loaded at startup from app_config table — no hardcoded fallback.
AUTH_KEY: str = ""


def _load_auth_key_from_db() -> str:
    """Fetch the LLM auth key from the app_config Supabase table."""
    result = (
        supabase_admin.table("app_config")
        .select("value")
        .eq("key", "llm_auth_key")
        .single()
        .execute()
    )
    if not result.data or not result.data.get("value"):
        raise RuntimeError(
            "[eFlow] FATAL: 'llm_auth_key' not found in app_config table. "
            "Please insert the key via the Supabase SQL editor before starting the server."
        )
    return result.data["value"].strip()


@asynccontextmanager
async def lifespan(app: FastAPI):
    global AUTH_KEY
    AUTH_KEY = _load_auth_key_from_db()
    logger.info("[eFlow] AUTH_KEY loaded from app_config table.")
    yield


app = FastAPI(title="eFlow Control Panel", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def verify_auth(authorization: Optional[str] = Header(None)):
    """Verify the request carries the correct Bearer token from app_config."""
    token = None
    if authorization:
        token = authorization.replace("Bearer ", "", 1).strip()
    if not AUTH_KEY:
        raise HTTPException(status_code=503, detail="Server auth key not initialised yet")
    if token != AUTH_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return True


@app.get("/controlpanelEflow/api/authkey")
async def get_authkey():
    """Return the live LLM auth key fetched from app_config."""
    if not AUTH_KEY:
        raise HTTPException(status_code=503, detail="Auth key not yet loaded")
    return {"api_key": AUTH_KEY}


class CreateUserPayload(BaseModel):
    email: str
    password: str
    full_name: str
    role: str = "employee"
    org_id: Optional[str] = None
    employee_id: str = ""


@app.post("/controlpanelEflow/api/admin/users/create")
async def create_managed_user(
    payload: CreateUserPayload,
    authorized: bool = Depends(verify_auth),
):
    """
    Create a Supabase auth user + profile row.
    Only callable with valid AUTHKEY header.
    """
    try:
        auth_response = supabase_admin.auth.admin.create_user({
            "email": payload.email,
            "password": payload.password,
            "email_confirm": True,
        })
        uid = auth_response.user.id

        supabase_admin.table("profiles").insert({
            "id": uid,
            "full_name": payload.full_name,
            "email": payload.email,
            "role": payload.role,
            "org_id": payload.org_id,
            "employee_id": payload.employee_id,
            "is_active": True,
        }).execute()

        return {"uid": uid, "email": payload.email}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.delete("/controlpanelEflow/api/admin/users/{uid}")
async def delete_managed_user(
    uid: str,
    authorized: bool = Depends(verify_auth),
):
    """Delete auth user + profile (cascade deletes profile via FK)."""
    try:
        supabase_admin.auth.admin.delete_user(uid)
        return {"deleted": uid}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8322)
