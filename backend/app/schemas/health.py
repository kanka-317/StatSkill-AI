from typing import Optional, Dict
from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    app_name: str
    app_env: str
    database_connected: bool
    version: str = "0.1.0"
    free_tier_status: Dict[str, str]
    timestamp: str
