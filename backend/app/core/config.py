from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # App
    app_name: str = "Dental Patient Management System"
    frontend_url: str = "http://localhost:3000"
    backend_url: str = "http://localhost:8000"

    # Database
    database_url: str

    # Cloudflare R2
    r2_account_id: str
    r2_access_key_id: str
    r2_secret_access_key: str
    r2_bucket_name: str = "patient-docs"

    # JWT
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    # Password Reset
    password_reset_token_expire_hours: int = 1

    # SendGrid
    sendgrid_api_key: str = ""
    sendgrid_from_email: str = "noreply@clinic.com"
    sendgrid_from_name: str = "Dental Clinic"

    # Twilio
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_phone_number: str = ""

    # Clinic
    clinic_timezone: str = "America/New_York"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
