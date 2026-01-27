"""
OLYMPUS 2.0 - Python Auth Module

Authentication and authorization utilities for FastAPI.
"""

from .core import (
    AuthUser,
    OlympusClaims,
    get_current_user,
    get_optional_user,
    decode_jwt,
)

from .permissions import (
    require_permission,
    require_any_permission,
    require_role,
    require_tenant,
    require_verified_email,
    require_platform_admin,
    ROLE_HIERARCHY,
)

from .rate_limit import (
    RateLimiter,
    rate_limiter,
    create_rate_limit_dependency,
    rate_limit_default,
    rate_limit_auth,
    rate_limit_strict,
)

__all__ = [
    # Core
    "AuthUser",
    "OlympusClaims",
    "get_current_user",
    "get_optional_user",
    "decode_jwt",
    # Permissions
    "require_permission",
    "require_any_permission",
    "require_role",
    "require_tenant",
    "require_verified_email",
    "require_platform_admin",
    "ROLE_HIERARCHY",
    # Rate limiting
    "RateLimiter",
    "rate_limiter",
    "create_rate_limit_dependency",
    "rate_limit_default",
    "rate_limit_auth",
    "rate_limit_strict",
]
