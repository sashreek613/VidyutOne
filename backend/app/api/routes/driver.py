from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import require_driver
from app.database.session import get_db
from app.models.charger import Charger
from app.schemas.auth import AuthUser
from app.schemas.charging import (
    ChargingQuoteRead,
    ChargingQuoteRequest,
    ChargingSessionRead,
    ChargingSummaryRead,
)
from app.schemas.driver_assistant import DriverAssistantChatRequest, DriverAssistantChatResponse
from app.services import charging_service, lyzr_driver_service

router = APIRouter()


@router.get("/driver/charging-summary", response_model=ChargingSummaryRead)
def get_charging_summary(
    db: Session = Depends(get_db),
    current: AuthUser = Depends(require_driver),
) -> ChargingSummaryRead:
    return charging_service.build_charging_summary(db, current.id)


@router.get("/driver/charging-history", response_model=list[ChargingSessionRead])
def get_charging_history(
    db: Session = Depends(get_db),
    current: AuthUser = Depends(require_driver),
) -> list[ChargingSessionRead]:
    return charging_service.list_charging_history(db, current.id)


@router.post("/driver/charging-quote", response_model=ChargingQuoteRead)
def post_charging_quote(
    payload: ChargingQuoteRequest,
    db: Session = Depends(get_db),
    current: AuthUser = Depends(require_driver),
) -> ChargingQuoteRead:
    charger = db.get(Charger, payload.charger_id)
    if charger is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Charger not found")
    return charging_service.quote_charging_slots(db, current.id, charger, payload.slots)


@router.post("/driver/voice-assistant", response_model=DriverAssistantChatResponse)
def post_voice_assistant(
    payload: DriverAssistantChatRequest,
    current: AuthUser = Depends(require_driver),
) -> DriverAssistantChatResponse:
    reply = lyzr_driver_service.ask_driver_assistant(payload.message, payload.session_id, payload.context_summary)
    return DriverAssistantChatResponse(reply=reply)
