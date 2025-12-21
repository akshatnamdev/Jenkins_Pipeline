from pydantic import BaseSettings

class Settings(BaseSettings):
    MODEL_NAME: str = "llama3"
    MAX_TOKENS: int = 256

settings = Settings()
