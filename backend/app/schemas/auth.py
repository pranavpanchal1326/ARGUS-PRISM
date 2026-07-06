"""Pydantic schemas for the auth endpoints — mirror ``contracts/openapi.yaml``."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class OAuthRequest(BaseModel):
    code: str
    redirect_uri: str | None = None


class MfaChallenge(BaseModel):
    mfa_required: bool = True
    mfa_token: str
    mfa_enrolled: bool


class MfaEnrolment(BaseModel):
    # The ONLY place the secret is ever exposed — embedded in the otpauth URI.
    otpauth_uri: str


class MfaVerifyRequest(BaseModel):
    mfa_token: str
    code: str = Field(pattern=r"^[0-9]{6}$")


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class SessionInfo(BaseModel):
    id: str
    device: str
    ip: str
    created_at: datetime
    last_seen_at: datetime
    current: bool


class Me(BaseModel):
    id: str
    email: EmailStr
    name: str
    role: str
    mfa_active: bool
    mfa_active_since: datetime | None = None
    sessions: list[SessionInfo]
