from fastapi import APIRouter

from app.schemas.site import SiteRead
from app.services import site_service

router = APIRouter()


@router.get("/sites", response_model=list[SiteRead])
def get_sites() -> list[SiteRead]:
    return site_service.list_sites()


@router.get("/sites/{site_id}", response_model=SiteRead)
def get_site(site_id: str) -> SiteRead:
    return site_service.get_site(site_id)
