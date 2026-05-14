import os
import time
import uvicorn
from fastapi import FastAPI, File, UploadFile, HTTPException, Request
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from src.pipeline import BrainTumorPipeline

from contextlib import asynccontextmanager

MODEL_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "artifacts", "best.onnx")
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist")

# Configuration from environment variables
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
MAX_FILE_SIZE_MB = int(os.getenv("MAX_FILE_SIZE_MB", "10"))
RATE_LIMIT = os.getenv("RATE_LIMIT", "20/minute")

# Allowed image MIME types
ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/bmp",
}

pipeline = None

limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    global pipeline
    if os.path.exists(MODEL_PATH):
        pipeline = BrainTumorPipeline(MODEL_PATH)
    else:
        print(f"Warning: Model not found at {MODEL_PATH}")
    yield


app = FastAPI(title="NeuroScan API", version="1.0.0", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---- Request Logging Middleware ----

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = time.time() - start
    print(f"{request.method} {request.url.path} → {response.status_code} ({duration:.3f}s)")
    return response


# ---- File Validation Helpers ----

MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024


async def validate_file(file: UploadFile) -> bytes:
    """Validate file size and type, return contents."""
    # Check content type
    if file.content_type and file.content_type not in ALLOWED_MIME_TYPES:
        # Allow .dcm files even though their MIME type may not match
        if not (file.filename and (file.filename.endswith(".dcm") or file.filename.endswith(".dicom"))):
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: {file.content_type}. Accepted: JPEG, PNG, WebP, BMP, DICOM."
            )

    # Read file contents with size check
    contents = await file.read()

    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large ({len(contents) / 1024 / 1024:.1f} MB). Maximum allowed: {MAX_FILE_SIZE_MB} MB."
        )

    return contents


# ---- API Routes ----

@app.get("/api/health")
def health_check():
    return {"status": "ok", "model_loaded": pipeline is not None}


@app.post("/api/predict")
@limiter.limit(RATE_LIMIT)
async def predict(request: Request, file: UploadFile = File(...)):
    if pipeline is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    try:
        contents = await validate_file(file)
        result = pipeline.run(contents)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---- Frontend Static File Serving ----

# If the frontend dist directory exists, serve it
if os.path.isdir(FRONTEND_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIR, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # Skip API routes and FastAPI's built-in docs routes
        if full_path.startswith("api/") or full_path in ("docs", "redoc", "openapi.json"):
            raise HTTPException(status_code=404)

        file_path = os.path.join(FRONTEND_DIR, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)

        # SPA fallback: serve index.html for all other routes
        index_path = os.path.join(FRONTEND_DIR, "index.html")
        if os.path.isfile(index_path):
            return FileResponse(index_path)

        raise HTTPException(status_code=404)
else:
    # Fallback when frontend hasn't been built
    @app.get("/api")
    def read_root():
        return {
            "message": "Welcome to the Brain Tumor Detection API. "
                       "Build the frontend with 'cd frontend && npm run build' "
                       "or visit /docs for the interactive API documentation."
        }


def main():
    """Entry point for `uv run neuroscan`."""
    uvicorn.run("src.api:app", host="0.0.0.0", port=8000)


if __name__ == "__main__":
    main()
