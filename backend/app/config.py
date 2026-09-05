import os
from typing import List
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Load .env file explicitly from backend directory or parent
load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "Return Policy - Personal Wealth & Financial Health Advisor"
    VERSION: str = "1.0.0"
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL: str = "openai/gpt-oss-20b"
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "*"
    ]

    class Config:
        case_sensitive = True

settings = Settings()
