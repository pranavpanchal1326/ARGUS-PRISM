# ═══════════════════════════════════════
# ARGUS-PRISM | config.py
# Engine: PRISM Core
# Branch: pranav/api
# ═══════════════════════════════════════
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "ARGUS-PRISM"
    VERSION: str = "2.0.0"
    DEBUG: bool = True
    POSTGRES_URL: str = "postgresql://prism:prism@localhost:5432/prismdb"
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    NEO4J_URI: str = "bolt://localhost:7687"
    NEO4J_USER: str = "neo4j"
    NEO4J_PASSWORD: str = "prism1234"
    DOT_DIP_API_URL: str = "https://dip.dot.gov.in/api/v1"
    DOT_DIP_API_KEY: str = ""
    WARMTH_KYC_THRESHOLD: int = 60
    WARMTH_RESTRICT_THRESHOLD: int = 75
    WARMTH_CRITICAL_THRESHOLD: int = 85
    WARMTH_IMMINENT_THRESHOLD: int = 100
    STR_GENERATION_TIMEOUT_SECONDS: int = 3600
    TAINT_MAX_HOPS: int = 4
    RECRUITER_MIN_ACCOUNTS: int = 5

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
