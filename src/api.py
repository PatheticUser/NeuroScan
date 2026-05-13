import os
import uvicorn
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from src.pipeline import BrainTumorPipeline

from contextlib import asynccontextmanager

MODEL_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "artifacts", "best.onnx")
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist")
pipeline = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global pipeline
    if os.path.exists(MODEL_PATH):
        pipeline = BrainTumorPipeline(MODEL_PATH)
    else:
        print(f"Warning: Model not found at {MODEL_PATH}")
    yield


app = FastAPI(title="Brain Tumor Detection API", version="1.0.0", lifespan=lifespan)

# CORS middleware for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---- API Routes ----

@app.get("/api/health")
def health_check():
    return {"status": "ok", "model_loaded": pipeline is not None}


@app.post("/api/predict")
async def predict(file: UploadFile = File(...)):
    if pipeline is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    try:
        contents = await file.read()
        result = pipeline.run(contents)
        return result
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
