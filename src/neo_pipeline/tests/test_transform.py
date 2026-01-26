import json
from pathlib import Path

import pandas as pd
import pytest

from neo_pipeline.transform import Transformer

PROJECT_ROOT = Path(__file__).resolve().parents[3]
FIXTURE_PATH = PROJECT_ROOT / "data" / "raw" / "neo_extract_2026-01-19.json"
transform = Transformer()


@pytest.fixture(scope="session")
def parsed_outputs():
    if not FIXTURE_PATH.exists():
        pytest.skip(f"Fixture file not found: {FIXTURE_PATH}")

    feed = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))
    return transform._parse_json_feed(feed)


def test_neos_not_empty(parsed_outputs):
    neos = parsed_outputs.neos
    assert not neos.empty, "NEOs table should not be empty"


def test_close_approaches_not_empty(parsed_outputs):
    ca = parsed_outputs.close_approaches
    assert not ca.empty, "Close approaches table should not be empty"


def test_neo_ids_present(parsed_outputs):
    neos = parsed_outputs.neos
    assert neos["neo_id"].notnull().all(), "All NEOs must have an id"
    assert neos["neo_id"].astype(str).str.len().min() > 0


def test_unique_neo_ids(parsed_outputs):
    neos = parsed_outputs.neos
    assert neos["neo_id"].is_unique, "NEO ids should be unique in entity table"


def test_positive_diameters(parsed_outputs):
    neos = parsed_outputs.neos
    diam = neos["diameter_mean_km"].dropna()
    assert (diam > 0).all(), "All diameters must be positive"


def test_close_approach_physics_sanity(parsed_outputs):
    ca = parsed_outputs.close_approaches

    assert (ca["relative_velocity_km_s"] > 0).all()
    assert (ca["miss_distance_km"] > 0).all()

    # velocities should be in a realistic range (km/s)
    assert ca["relative_velocity_km_s"].max() < 100


def test_hazard_flag_boolean(parsed_outputs):
    neos = parsed_outputs.neos
    assert neos["is_potentially_hazardous_asteroid"].dtype == bool
