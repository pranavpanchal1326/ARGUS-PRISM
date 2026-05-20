from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator


class Settings(BaseSettings):
    # APP SETTINGS
    app_name: str = "ARGUS-PRISM"
    app_version: str = "2.0.0"
    environment: str = Field(..., pattern="^(development|staging|production)$")
    debug: bool = False
    log_level: str = "INFO"

    # DATABASE
    database_url: str = Field(..., pattern="^postgresql\\+asyncpg://.*")
    database_pool_size: int = 10
    database_max_overflow: int = 20

    # REDIS
    redis_url: str = Field(..., pattern="^redis://.*")
    redis_warmth_ttl: int = 300

    # ADITYA'S SERVICES
    neo4j_api_url: str
    neo4j_api_timeout: int = 5

    # SECURITY
    secret_key: str = Field(..., min_length=32)
    api_key_header: str = "X-PRISM-API-Key"

    # PRISM THRESHOLDS
    warmth_threshold_monitoring: float = 40.0
    warmth_threshold_kyc: float = 60.0
    warmth_threshold_restriction: float = 75.0
    warmth_threshold_autostr: float = 85.0
    warmth_threshold_cbi: float = 85.0

    @field_validator("warmth_threshold_cbi")
    def validate_thresholds(cls, v: float, info) -> float:
        data = info.data
        t_mon = data.get("warmth_threshold_monitoring", 40.0)
        t_kyc = data.get("warmth_threshold_kyc", 60.0)
        t_res = data.get("warmth_threshold_restriction", 75.0)
        t_str = data.get("warmth_threshold_autostr", 85.0)

        if not (t_mon < t_kyc < t_res < t_str):
            raise ValueError(
                "Thresholds must be strictly increasing: monitoring < kyc < restriction < autostr"
            )
        if t_str != v:
            raise ValueError("autostr threshold must equal cbi threshold")
        
        return v

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
