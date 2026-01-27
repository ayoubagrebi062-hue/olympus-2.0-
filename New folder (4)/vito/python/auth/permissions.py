"""
OLYMPUS 2.0 - FastAPI Auth Dependencies (Permissions)

Permission and role checking dependencies for FastAPI routes.
"""

from typing import Callable
from fastapi import Depends, HTTPException, status

from .core import AuthUser, get_current_user


# Role hierarchy
ROLE_HIERARCHY = {
    "owner": 100,
    "admin": 75,
    "developer": 50,
    "viewer": 25,
}


def require_permission(permission: str) -> Callable:
    """Dependency that requires a specific permission."""
    
    async def check_permission(
        user: AuthUser = Depends(get_current_user)
    ) -> AuthUser:
        if "*" in user.claims.permissions:
            return user
        
        if permission not in user.claims.permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "code": "AUTH_301",
                    "message": "Permission denied",
                    "required": permission
                }
            )
        return user
    
    return check_permission


def require_any_permission(permissions: list[str]) -> Callable:
    """Dependency that requires any of the specified permissions."""
    
    async def check_permissions(
        user: AuthUser = Depends(get_current_user)
    ) -> AuthUser:
        if "*" in user.claims.permissions:
            return user
        
        has_any = any(p in user.claims.permissions for p in permissions)
        if not has_any:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "code": "AUTH_301",
                    "message": "Permission denied",
                    "required_any": permissions
                }
            )
        return user
    
    return check_permissions


def require_role(min_role: str) -> Callable:
    """Dependency that requires minimum role level."""
    
    async def check_role(
        user: AuthUser = Depends(get_current_user)
    ) -> AuthUser:
        user_role = user.claims.tenant_role
        
        if not user_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "code": "AUTH_301",
                    "message": "No tenant role",
                    "required_role": min_role
                }
            )
        
        user_level = ROLE_HIERARCHY.get(user_role, 0)
        required_level = ROLE_HIERARCHY.get(min_role, 0)
        
        if user_level < required_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "code": "AUTH_301",
                    "message": "Insufficient role",
                    "required_role": min_role,
                    "current_role": user_role
                }
            )
        return user
    
    return check_role


def require_tenant() -> Callable:
    """Dependency that requires active tenant context."""
    
    async def check_tenant(
        user: AuthUser = Depends(get_current_user)
    ) -> AuthUser:
        if not user.claims.tenant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "code": "AUTH_302",
                    "message": "Tenant context required"
                }
            )
        return user
    
    return check_tenant


def require_verified_email(user: AuthUser = Depends(get_current_user)) -> AuthUser:
    """Dependency that requires verified email."""
    if not user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "AUTH_102", "message": "Email verification required"}
        )
    return user


def require_platform_admin(user: AuthUser = Depends(get_current_user)) -> AuthUser:
    """Dependency that requires platform admin status."""
    if not user.claims.is_platform_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "AUTH_301", "message": "Platform admin required"}
        )
    return user
