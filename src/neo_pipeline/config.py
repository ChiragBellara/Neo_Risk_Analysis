from pathlib import Path
from dotenv import load_dotenv
import os

load_dotenv()

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data"

RAW_DIR = DATA_DIR / "raw"
BRONZE_DIR = DATA_DIR / "bronze"
SILVER_DIR = DATA_DIR / "silver"
GOLD_DIR = DATA_DIR / "gold"

NASA_FEED_URL = "https://api.nasa.gov/neo/rest/v1/feed"
NASA_API_KEY = os.getenv("NASA_API_KEY", "DEMO_KEY")
