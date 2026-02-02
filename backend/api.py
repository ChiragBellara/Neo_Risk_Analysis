import uvicorn
import time
from datetime import date, timedelta
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from neo_pipeline.runner import Runner

api = Runner()
app = FastAPI(title="NEO API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite
        "http://localhost:3000",  # CRA
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/neo/")
def get_neo_feed(start=None, end=None,):
    today = date.today()
    # If start_date_str is None, then we assign start_date as today's date - 7 days
    # If end_date_str is None, then we assign end_date as today's date
    start_date = date.fromisoformat(
        start) if start else today - timedelta(days=6)
    end_date = date.fromisoformat(end) if end else today
    if start_date > end_date:
        return {"error": "start must be <= end"}
    print(start_date, end_date)
    events = api.runner(start_date=start_date.isoformat(),
                        end_date=end_date.isoformat()) or []
    return {"start": start_date, "end": end_date, "count": len(events), "events": events}


if __name__ == "__main__":
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
