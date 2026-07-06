"""Google OAuth code exchange.

Exchanges an authorization code for the user's Google profile, then maps it onto a
PRISM user. Bank-domain restriction is enforced when ``OAUTH_ALLOWED_DOMAIN`` is set.
No public signup — the email must already correspond to an invited user.
"""

from __future__ import annotations

import httpx

from app.core.config import get_settings

_TOKEN_URL = "https://oauth2.googleapis.com/token"
_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"


class OAuthError(Exception):
    pass


async def exchange_google_code(code: str, redirect_uri: str | None = None) -> dict[str, str]:
    """Return ``{email, name}`` for a valid Google auth code."""
    settings = get_settings()
    if not settings.google_oauth_client_id or not settings.google_oauth_client_secret:
        raise OAuthError("Google OAuth is not configured on this deployment.")

    data = {
        "code": code,
        "client_id": settings.google_oauth_client_id,
        "client_secret": settings.google_oauth_client_secret,
        "redirect_uri": redirect_uri or settings.google_oauth_redirect_uri,
        "grant_type": "authorization_code",
    }
    async with httpx.AsyncClient(timeout=10) as client:
        token_resp = await client.post(_TOKEN_URL, data=data)
        if token_resp.status_code != 200:
            raise OAuthError("Google rejected the authorization code.")
        access_token = token_resp.json().get("access_token")
        if not access_token:
            raise OAuthError("Google did not return an access token.")

        info_resp = await client.get(
            _USERINFO_URL, headers={"Authorization": f"Bearer {access_token}"}
        )
        if info_resp.status_code != 200:
            raise OAuthError("Could not fetch Google profile.")

    info = info_resp.json()
    email = info.get("email", "")
    if settings.oauth_allowed_domain and not email.endswith(f"@{settings.oauth_allowed_domain}"):
        raise OAuthError("Email domain is not permitted for this institution.")
    return {"email": email, "name": info.get("name", email.split("@")[0])}
