import json
from pathlib import Path
from typing import Any

from app.core.config import get_settings


def _load_json(filename: str) -> list[dict[str, Any]]:
    data_dir: Path = get_settings().DATA_DIR
    path = data_dir / filename
    with path.open(encoding="utf-8") as file:
        payload = json.load(file)
    if not isinstance(payload, list):
        raise ValueError(f"Expected a list in {path}")
    return payload


def load_sites() -> list[dict[str, Any]]:
    return _load_json("sites.json")


def load_chargers() -> list[dict[str, Any]]:
    return _load_json("chargers.json")
