import uvicorn
from fastapi import FastAPI
from contextlib import asynccontextmanager
import logging
import sys
from pathlib import Path

from shared.database import connect_to_db, close_db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from .api import router

@asynccontextmanager
async def lifespan(_: FastAPI):
    logger.info("Notification Service starting up...")
    await connect_to_db()
    yield
    logger.info("Notification Service shutting down...")
    await close_db()

app = FastAPI(
    title="Notification Service",
    description="Email and SMS notification microservice",
    version="1.0.0",
    lifespan=lifespan
)

app.include_router(router)

@app.get("/health")
async def health():
    return {"status": "ok", "service": "notification"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8004, reload=True)
