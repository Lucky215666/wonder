from fastapi import APIRouter, HTTPException
from backend.core.history import HistoryManager
from backend.models.schemas import HistoryListResponse, HistoryItem

router = APIRouter(prefix="/api/history", tags=["history"])

history_manager = HistoryManager("data/outputs")


@router.get("")
async def list_history():
    items = history_manager.list_items()
    return HistoryListResponse(items=items, total=len(items))


@router.get("/{record_id}")
async def get_history_item(record_id: str):
    item = history_manager.get_item(record_id)
    if not item:
        raise HTTPException(status_code=404, detail="Record not found")
    return item


@router.delete("/{record_id}")
async def delete_history_item(record_id: str):
    success = history_manager.delete_item(record_id)
    if not success:
        raise HTTPException(status_code=404, detail="Record not found")
    return {"status": "deleted"}
