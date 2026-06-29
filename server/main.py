"""
eFlow Control Panel — FastAPI Server
Admin user management endpoints for Supabase Auth.

Place this file in the same server directory as the existing
main.py or merge its endpoints into the existing FastAPI app.
"""

import os
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from pydantic import BaseModel
from typing import Optional

app = FastAPI(title="eFlow Control Panel")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://ixnfphgjyelhckjwjkdv.supabase.co")
SUPABASE_SERVICE_ROLE_KEY = os.getenv(
    "SUPABASE_SERVICE_ROLE_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4bmZwaGdqeWVsaGNrandqa2R2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjIxNjUwOSwiZXhwIjoyMDk3NzkyNTA5fQ.0HS1PkVk4kG8IfV-f-oapSmIaf8nAA0TSOqKwUQVYTM",
)
AUTH_KEY = os.getenv("VITE_BACKEND_API_KEY", os.getenv("AUTHKEY", "local-dev-key"))

supabase_admin: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def verify_auth(authorization: Optional[str] = Header(None)):
    """Verify the request has the correct AUTHKEY."""
    token = None
    if authorization:
        token = authorization.replace("Bearer ", "")
    if token != AUTH_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return True


@app.get("/controlpanelEflow/api/authkey")
async def get_authkey():
    """Return the API auth key for client-side requests."""
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
