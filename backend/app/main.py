import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth, imports, reports, shifts, workers
from app.seed_skills import seed


@asynccontextmanager
async def lifespan(_: FastAPI):
    if settings.auto_seed_database or os.getenv("VERCEL"):
        seed()
    yield


app = FastAPI(title="KAANTHA API", version="1.0.0", lifespan=lifespan)
app.add_middleware(
	CORSMiddleware,
	allow_origins=settings.allowed_origins,
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)
app.include_router(auth.router, prefix="/api/v1")
app.include_router(workers.router, prefix="/api/v1")
app.include_router(shifts.router, prefix="/api/v1")
app.include_router(imports.router, prefix="/api/v1")
app.include_router(reports.router, prefix="/api/v1")


@app.get("/health")
def health() -> dict[str, str]:
	return {"status": "ok"}
