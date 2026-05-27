from fastapi import APIRouter, HTTPException
from backend.core.config import ConfigManager
from backend.models.schemas import ConfigModel

router = APIRouter(prefix="/api/config", tags=["config"])

config_manager = ConfigManager("data/config.json")


@router.get("")
async def get_config():
    return config_manager.load()


@router.put("")
async def update_config(config: ConfigModel):
    config_manager.update(config.dict())
    return {"status": "ok"}
