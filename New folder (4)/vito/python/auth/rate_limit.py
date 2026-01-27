"""
OLYMPUS 2.0 - FastAPI Rate Limiting

Simple in-memory rate limiting for FastAPI.
Use Redis in production.
"""

import time
from typing import Callable, Optional
from collections import defaultdict

from fastapi import Request, HTTPException, status


class RateLimiter:
    """In-memory rate limiter."""
    
    def __init__(self):
        self.requests: dict[str, list[float]] = defaultdict(list)
    
    def _get_key(self, request: Request, prefix: str) -> str:
        """Get rate limit key from request."""
        # Try user ID from header (set by middleware)
        user_id = request.headers.get("x-user-id")
        if user_id:
            return f"{prefix}:user:{user_id}"
        
        # Fall back to IP
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            ip = forwarded.split(",")[0].strip()
        else:
            ip = request.client.host if request.client else "unknown"
        
        return f"{prefix}:ip:{ip}"
    
    def _cleanup(self, key: str, window_ms: int):
        """Remove expired entries."""
        cutoff = time.time() - (window_ms / 1000)
        self.requests[key] = [t for t in self.requests[key] if t > cutoff]
    
    def check(
        self,
        request: Request,
        window_ms: int,
        max_requests: int,
        prefix: str = "api"
    ) -> tuple[bool, int, float]:
        """
        Check rate limit.
        Returns: (allowed, remaining, reset_at)
        """
        key = self._get_key(request, prefix)
        now = time.time()
        
        self._cleanup(key, window_ms)
        
        count = len(self.requests[key])
        remaining = max(0, max_requests - count - 1)
        reset_at = now + (window_ms / 1000)
        
        if count >= max_requests:
            return False, 0, reset_at
        
        self.requests[key].append(now)
        return True, remaining, reset_at


# Global instance
rate_limiter = RateLimiter()


def create_rate_limit_dependency(
    window_ms: int = 60000,
    max_requests: int = 100,
    prefix: str = "api"
) -> Callable:
    """Create a rate limit dependency."""
    
    async def check_rate_limit(request: Request):
        allowed, remaining, reset_at = rate_limiter.check(
            request, window_ms, max_requests, prefix
        )
        
        if not allowed:
            retry_after = int(reset_at - time.time())
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "code": "AUTH_400",
                    "message": "Rate limit exceeded",
                    "retry_after": retry_after
                },
                headers={
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": str(max_requests),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(reset_at))
                }
            )
        
        # Store for response headers
        request.state.rate_limit = {
            "limit": max_requests,
            "remaining": remaining,
            "reset": int(reset_at)
        }
    
    return check_rate_limit


# Pre-configured limiters
rate_limit_default = create_rate_limit_dependency(60000, 100, "api")
rate_limit_auth = create_rate_limit_dependency(900000, 5, "auth")  # 15min, 5 req
rate_limit_strict = create_rate_limit_dependency(60000, 10, "strict")
