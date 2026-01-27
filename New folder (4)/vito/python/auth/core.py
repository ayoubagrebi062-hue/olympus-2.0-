"""
OLYMPUS 2.0 - FastAPI Auth Dependencies (Core)

JWT verification and user extraction for FastAPI routes.
"""

import os
from typing import Optional
from datetime import datetime

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

# Security scheme
security = HTTPBearer()

# Environment
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")


class OlympusClaims(BaseModel):
    """Custom OLYMPUS JWT claims."""
    tenant_id: Optional[str] = None
    tenant_role: Optional[str] = None
    tenant_slug: Optional[str] = None
    permissions: list[str] = []
    plan_tier: Optional[str] = None
    is_platform_admin: bool = False


class AuthUser(BaseModel):
    """Authenticated user from JWT."""
    id: str
    email: str
    email_verified: bool = False
    claims: OlympusClaims = OlympusClaims()


def decode_jwt(token: str) -> dict:
    """Decode and verify JWT token."""
    if not SUPABASE_JWT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="JWT secret not configured"
        )
    
    try:
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated"
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "AUTH_105", "message": "Token expired"}
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "AUTH_106", "message": f"Invalid token: {str(e)}"}
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> AuthUser:
    """Extract and validate current user from JWT."""
    payload = decode_jwt(credentials.credentials)
    
    # Extract OLYMPUS claims
    olympus = payload.get("olympus", {})
    claims = OlympusClaims(
        tenant_id=olympus.get("tenant_id"),
        tenant_role=olympus.get("tenant_role"),
        tenant_slug=olympus.get("tenant_slug"),
        permissions=olympus.get("permissions", []),
        plan_tier=olympus.get("plan_tier"),
        is_platform_admin=olympus.get("is_platform_admin", False)
    )
    
    return AuthUser(
        id=payload.get("sub", ""),
        email=payload.get("email", ""),
        email_verified=payload.get("email_verified", False),
        claims=claims
    )


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(
        HTTPBearer(auto_error=False)
    )
) -> Optional[AuthUser]:
    """Get current user if authenticated, None otherwise."""
    if not credentials:
        return None
    
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None
