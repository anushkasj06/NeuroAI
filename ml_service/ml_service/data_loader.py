from __future__ import annotations

from functools import lru_cache
from pathlib import Path
import ast
import re
from typing import Iterable

import pandas as pd

DATA_FILES = {
    "career_reco": "ai_career_reco.csv",
    "student_career": "student_career.csv",
    "candidate_roles": "candidate_job_role_dataset.csv",
    "resume_data": "resume_and_job_description.csv",
}


def _to_snake_case(value: str) -> str:
    value = re.sub(r"[^0-9a-zA-Z]+", "_", value.strip())
    value = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", value)
    value = re.sub(r"_+", "_", value)
    return value.strip("_").lower()


def _normalize_skill_token(token: str) -> str:
    return re.sub(r"\s+", " ", token.strip().lower())


def _parse_skills(value: object) -> list[str]:
    if value is None or pd.isna(value):
        return []

    if isinstance(value, list):
        return [_normalize_skill_token(str(item)) for item in value if str(item).strip()]

    raw = str(value).strip()
    if not raw:
        return []

    if raw.startswith("[") and raw.endswith("]"):
        try:
            parsed = ast.literal_eval(raw)
            if isinstance(parsed, list):
                return [_normalize_skill_token(str(item)) for item in parsed if str(item).strip()]
        except Exception:
            pass

    return [_normalize_skill_token(part) for part in re.split(r"[,;/|]+", raw) if part.strip()]


def _candidate_data_dirs() -> Iterable[Path]:
    current_dir = Path(__file__).resolve().parent
    # NeuroAI structure: ml_service/ml_service/ -> ml_service/data/
    yield current_dir.parent / "data"
    # Docker: /app/data
    yield Path("/app/data")
    # Local dev: various relative paths
    try:
        yield current_dir.parents[2] / "data"
    except IndexError:
        pass
    try:
        yield current_dir.parents[1] / "data"
    except IndexError:
        pass
    yield current_dir.parents[0] / "data"


def _resolve_csv_path(filename: str) -> Path:
    for data_dir in _candidate_data_dirs():
        candidate = data_dir / filename
        if candidate.exists():
            return candidate
    raise FileNotFoundError(f"Could not find {filename} in expected data paths")


def _normalize_frame(frame: pd.DataFrame) -> pd.DataFrame:
    frame = frame.copy()
    frame.columns = [_to_snake_case(column) for column in frame.columns]
    for column in frame.columns:
        if "skill" in column:
            frame[column] = frame[column].apply(_parse_skills)
    return frame


@lru_cache(maxsize=1)
def load_career_reco() -> pd.DataFrame:
    return _normalize_frame(pd.read_csv(_resolve_csv_path(DATA_FILES["career_reco"])))


@lru_cache(maxsize=1)
def load_student_career() -> pd.DataFrame:
    return _normalize_frame(pd.read_csv(_resolve_csv_path(DATA_FILES["student_career"])))


@lru_cache(maxsize=1)
def load_candidate_roles() -> pd.DataFrame:
    return _normalize_frame(pd.read_csv(_resolve_csv_path(DATA_FILES["candidate_roles"])))


@lru_cache(maxsize=1)
def load_resume_data() -> pd.DataFrame:
    filename = DATA_FILES["resume_data"]
    try:
        return _normalize_frame(pd.read_csv(_resolve_csv_path(filename)))
    except FileNotFoundError:
        fallback = "resume_dataset_1200.csv"
        return _normalize_frame(pd.read_csv(_resolve_csv_path(fallback)))

