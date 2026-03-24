from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Application
    PROJECT_NAME: str = "MAYSS Marketplace"
    API_V1_PREFIX: str = "/api/v1"
    VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "postgresql+psycopg2://mayss:mayss@db:5432/mayss"

    # Security
    SECRET_KEY: str = "change-me-in-production-please"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # CORS
    CORS_ORIGINS: list[str] = ["*"]

    # Business logic
    PLATFORM_FEE_PERCENT: float = 5.0
    BONUS_EARN_PERCENT: float = 3.0
    BONUS_MAX_SPEND_PERCENT: float = 50.0

    # Telegram integration
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_BOT_NAME: str = "MayssTestBot"
    
    # Public URLs
    PUBLIC_BASE_URL: str = "http://localhost:8080"
    
    # Push notifications (VAPID keys)
    VAPID_PUBLIC_KEY: str = ""
    VAPID_PRIVATE_KEY: str = ""
    VAPID_CLAIMS_EMAIL: str = "mailto:admin@mayss.io"

    # Email configuration (optional)
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "noreply@mayss.io"

    @field_validator("DATABASE_URL")
    @classmethod
    def validate_database_url(cls, v: str) -> str:
        """Validate database URL format."""
        if not v:
            raise ValueError("DATABASE_URL is required")
        if not v.startswith(("postgresql", "sqlite", "mysql")):
            raise ValueError("DATABASE_URL must be a valid connection string")
        return v

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        """Validate SECRET_KEY is set and not default."""
        if not v or v == "change-me-in-production-please":
            if not cls.model_config.get("env_file", "").endswith(".env"):
                raise ValueError(
                    "SECRET_KEY must be set to a secure value in production. "
                    "Set via environment variable or .env file."
                )
        return v

    @property
    def database_is_sqlite(self) -> bool:
        """Check if using SQLite (for testing)."""
        return "sqlite" in self.DATABASE_URL

    @property
    def is_production(self) -> bool:
        """Check if running in production mode."""
        return not self.DEBUG


# Global settings instance
settings = Settings()
