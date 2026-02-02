from pathlib import Path
from typing import Any
import json


def ensure_dir(p: Path) -> None:
    p.mkdir(parents=True, exist_ok=True)


def write_json(path: str | Path, obj) -> None:
    path = Path(path)
    with path.open('w', encoding="utf-8") as file:
        json.dump(obj, file, indent=2)


def _safe_float(x: Any) -> float | None:
    if x is None:
        return None
    try:
        return float(x)
    except (ValueError, TypeError):
        return None
