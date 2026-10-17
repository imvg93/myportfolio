from typing import List, Optional
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

# Determine project paths
BASE_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = BASE_DIR.parent

class Settings(BaseSettings):
    """Application settings and environment variable configuration."""

    # Project metadata
    PROJECT_NAME: str = "Gireesh Insight AI API"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"

    # AI Model Providers
    OPENAI_API_KEY: Optional[str] = None
    HUGGINGFACE_API_KEY: Optional[str] = None
    HF_TEXT_MODEL: Optional[str] = None
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"

    # Vector Database (Pinecone)
    PINECONE_API_KEY: Optional[str] = None
    PINECONE_INDEX_NAME: str = "gireesh-life"
    PINECONE_ENVIRONMENT: str = "us-east1-gcp"

    # Supabase / External data
    SUPABASE_JSON_URL: Optional[str] = None
    SUPABASE_URL: Optional[str] = None
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None

    # CORS settings
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://*.vercel.app",
        "*"
    ]

    # Model configuration for pydantic-settings
    model_config = SettingsConfigDict(
        env_file=(
            ROOT_DIR / ".env.local",
            ROOT_DIR / ".env",
            BASE_DIR / ".env.local",
            BASE_DIR / ".env",
        ),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
