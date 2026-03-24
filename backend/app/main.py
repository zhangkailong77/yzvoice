
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api import endpoints
from app.core.config import settings
import os

app = FastAPI(
    title="AI Video Translation API",
    description="API for video translation and lip-syncing",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for accessing generated media
# Access files at http://localhost:8000/files/filename.mp3
app.mount("/files", StaticFiles(directory=settings.TEMP_DIR), name="files")

# Include routers
app.include_router(endpoints.router, prefix="/api/v1", tags=["video-translation"])

@app.get("/")
async def root():
    return {"message": "Welcome to AI Video Translation API. Visit /docs for documentation."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
