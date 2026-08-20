from fastapi import APIRouter

from app.api.routes import bookings, chargers, health, sites

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(sites.router, tags=["sites"])
api_router.include_router(chargers.router, tags=["chargers"])
api_router.include_router(bookings.router, tags=["bookings"])
