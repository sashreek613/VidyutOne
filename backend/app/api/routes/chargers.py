from fastapi import APIRouter

from app.schemas.charger import ChargerRead
from app.services import charger_service

router = APIRouter()


@router.get("/chargers", response_model=list[ChargerRead])
def get_chargers() -> list[ChargerRead]:
    return charger_service.list_chargers()


@router.get("/chargers/{charger_id}", response_model=ChargerRead)
def get_charger(charger_id: str) -> ChargerRead:
    return charger_service.get_charger(charger_id)
