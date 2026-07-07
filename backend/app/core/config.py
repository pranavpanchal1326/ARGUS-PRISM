"""Central application configuration.

All settings come from environment variables (see ``.env.example``). In development,
when Postgres / Neo4j / Redis are unreachable, the app degrades to a local SQLite
database and an in-memory event bus so the API can run without Docker.
"""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # ── Application ───────────────────────────────────────────
    app_name: str = "ARGUS-PRISM"
    app_version: str = "3.0.0"
    environment: str = "development"
    debug: bool = True
    api_prefix: str = "/api/v1"

    # ── Datastores ────────────────────────────────────────────
    postgres_url: str = "postgresql+psycopg://prism:prism@localhost:5432/prismdb"
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "prism1234"
    redis_url: str = "redis://localhost:6379/0"
    # Local dev fallback DB used when Postgres is unreachable.
    sqlite_path: str = "data/prism.db"

    # ── Auth / JWT ────────────────────────────────────────────
    jwt_secret: str = "dev-only-change-me-please-generate-a-real-secret"
    jwt_algorithm: str = "HS256"
    access_token_ttl_minutes: int = 15
    refresh_token_ttl_days: int = 7
    mfa_token_ttl_minutes: int = 5
    mfa_issuer: str = "ARGUS-PRISM"
    mfa_rate_limit_attempts: int = 5
    mfa_rate_limit_window_seconds: int = 300

    # ── Google OAuth ──────────────────────────────────────────
    google_oauth_client_id: str = ""
    google_oauth_client_secret: str = ""
    google_oauth_redirect_uri: str = "http://localhost:5173/auth/callback"
    oauth_allowed_domain: str = ""

    # ── Signing / integrity (never crosses the API boundary) ──
    package_signing_key: str = "dev-only-package-signing-key-change-me"
    audit_hmac_key: str = "dev-only-audit-hmac-key-change-me"

    # ── PII tokenization ──────────────────────────────────────
    tokenization_backend: str = "aes_siv"
    pii_tokenization_key: str = ""
    device_hash_salt: str = "dev-device-salt-change-me"

    # ── WarmthScore thresholds ────────────────────────────────
    warmth_threshold_watch: float = 40
    warmth_threshold_warming: float = 55
    warmth_threshold_hot: float = 70
    warmth_threshold_critical: float = 85
    warmth_threshold_imminent: float = 95
    taint_max_hops: int = 4
    recruiter_min_accounts: int = 5

    # ── Simulator ─────────────────────────────────────────────
    sim_default_seed: int = 20260707
    sim_tick_ms: int = 1000

    # ── Chatbot (Ollama — local or cloud) ─────────────────────
    ollama_url: str = "http://localhost:11434"
    ollama_model: str = "gemma:2b"
    # Set for Ollama Cloud (https://ollama.com). Kept in .env only, never committed.
    ollama_api_key: str = ""
    assistant_enabled: bool = False

    @property
    def ollama_headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.ollama_api_key}"} if self.ollama_api_key else {}

    # ── CORS ──────────────────────────────────────────────────
    cors_origins: str = "http://localhost:5173,http://localhost:4173"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
