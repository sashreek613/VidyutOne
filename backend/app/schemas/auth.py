from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.user import ROLE_DRIVER, ROLE_PLANNER


class AuthUser(BaseModel):
    id: str
    email: str
    full_name: str
    role: str

    @property
    def is_planner(self) -> bool:
        return self.role == ROLE_PLANNER

    @property
    def is_driver(self) -> bool:
        return self.role == ROLE_DRIVER


class ProfileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    full_name: str
    email: str
    role: str
    created_at: datetime
