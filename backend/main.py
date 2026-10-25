from contextlib import asynccontextmanager
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers.policy import router as policy_router
from app.routers.explainer import router as explainer_router
from app.routers.finances import router as finances_router
from app.services import explainer_service

@asynccontextmanager
async def lifespan(app: FastAPI):
    explainer_service.warm_up()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend API for Return Policy: Personal Wealth Compounding & Financial Health Advisor",
    lifespan=lifespan,
)

# CORS setup for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(policy_router)
app.include_router(explainer_router)
app.include_router(finances_router)

@app.get("/")
def root():
    return {
        "message": "Welcome to Return Policy API. Visit /docs for OpenAPI documentation.",
        "version": settings.VERSION
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
