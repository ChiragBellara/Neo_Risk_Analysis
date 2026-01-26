import uvicorn
import time
from datetime import date
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
def get_neo_feed(
    start=None,
    end=None,
):
    print(start, end)
    # Quick validation: start <= end
    if start and end:
        s = date.fromisoformat(start)
        e = date.fromisoformat(end)
        if s > e:
            return {"error": "start must be <= end"}

    # Fetch + transform
    events = api.runner(start_date=start, end_date=end) or []
    return {"start": start, "end": end, "count": len(events), "events": events}


if __name__ == "__main__":
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
