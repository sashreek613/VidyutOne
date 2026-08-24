from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import get_settings
from app.schemas.health import HealthResponse


def create_app() -> FastAPI:
    settings = get_settings()
    if "sqlite" in settings.DATABASE_URL:
        from app.database.session import Base, engine
        Base.metadata.create_all(bind=engine)

    app = FastAPI(
        title="VidyutOne API",
        description="EV mobility intelligence platform — MVP backend",
        version="0.1.0",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(api_router, prefix="/api")

    @app.get("/", response_model=HealthResponse, tags=["health"])
    def get_root() -> HealthResponse:
        return HealthResponse(status="ok", service="VidyutOne backend")

    return app


app = create_app()
