from fastapi import APIRouter

from app.api.routes import bookings, chargers, driver, health, me, pricing, sites, vehicles

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(me.router, tags=["auth"])
api_router.include_router(sites.router, tags=["sites"])
api_router.include_router(chargers.router, tags=["chargers"])
api_router.include_router(bookings.router, tags=["bookings"])
api_router.include_router(vehicles.router, tags=["vehicles"])
api_router.include_router(pricing.router, tags=["pricing"])
api_router.include_router(driver.router, tags=["driver"])

