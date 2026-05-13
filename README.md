# NeuroScan

> **NeuroScan** — AI-powered brain tumor detection from MRI scans using YOLO-based object detection.
>
> 🚀 **Live demo-ready** — Upload an MRI scan, get instant results with bounding boxes and confidence scores.

[![Python](https://img.shields.io/badge/python-3.11+-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4.svg)](https://tailwindcss.com)

---

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   React     │────▶│   FastAPI    │────▶│   ONNX       │
│   Frontend  │     │   Backend    │     │   Runtime    │
│  (Vite SPA) │◀────│  (Python)    │◀────│  (Inference) │
└─────────────┘     └──────────────┘     └──────────────┘
```

- **Frontend**: React 19 + TypeScript + Tailwind CSS v4 (Vite)
- **Backend**: FastAPI (Python 3.11+) serving inference via ONNX Runtime
- **Model**: YOLO-based brain tumor detection (4 classes + normal)

### Tumor Classes Detected

| Class | Type |
|---|---|
| `glioma` | Glioma tumor |
| `meningioma` | Meningioma tumor |
| `pituitary` | Pituitary tumor |
| `space-occupying lesion-` | Space-occupying lesion |
| `NO_tumor` | Normal scan |

---

## Quick Start

### Prerequisites

- **Python 3.11+** with [`uv`](https://docs.astral.sh/uv/) (`curl -LsSf https://astral.sh/uv/install.sh | sh`)
- **Node.js 20+** with npm

### Run (Development)

```bash
chmod +x run.sh
./run.sh --dev
```

This starts:
- **Frontend** at `http://localhost:5173` (with HMR + API proxy)
- **Backend** at `http://localhost:8000` (with auto-reload)
- **API Docs** at `http://localhost:8000/docs`

### Run (Production)

```bash
./run.sh --prod
```

Builds the frontend and serves everything from a single FastAPI server at `http://localhost:8000`.

### Manual Setup

```bash
# Backend
uv sync
uv run uvicorn src.api:app --host 0.0.0.0 --port 8000 --reload

# Frontend (separate terminal)
cd frontend
npm install
npm run dev        # development with API proxy
# or
npm run build      # production build (served by FastAPI)
```

---

## Project Structure

```
├── run.sh                         # Dev & production runner
├── src/
│   ├── api.py                     # FastAPI app & routes
│   ├── pipeline.py                # ONNX inference pipeline
│   └── __init__.py
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Hero.tsx           # Landing section
│   │   │   ├── ImageUpload.tsx    # Drag & drop upload
│   │   │   ├── ResultDisplay.tsx  # Annotated image + predictions
│   │   │   ├── HowItWorks.tsx     # 3-step explanation
│   │   │   └── Footer.tsx         # Footer
│   │   ├── App.tsx                # Main app with view routing
│   │   ├── types.ts               # TypeScript types
│   │   ├── main.tsx               # React entry point
│   │   └── index.css              # Tailwind + animations
│   ├── index.html
│   ├── vite.config.ts             # Vite + Tailwind + API proxy
│   ├── package.json
│   └── tsconfig.json
├── artifacts/
│   └── best.onnx                  # Trained YOLO model
├── test_images/                   # Sample MRI scans for testing
├── data/                          # Training/validation datasets
├── notebooks/                     # Jupyter notebooks
├── Dockerfile                     # Multi-stage Docker build
├── pyproject.toml                 # Python deps + CLI entry
├── .env.example                   # Env vars template
└── README.md                      # This file
```

---

## API Reference

Interactive docs available at **`/docs`** when running the server.

### `POST /api/predict`

Upload an MRI scan for tumor detection.

**Request:** `multipart/form-data` with a `file` field (image).

**Response:**
```json
{
  "status": "success",
  "tumor_detected": true,
  "predictions": [
    {
      "class_id": 1,
      "class_name": "glioma",
      "confidence": 0.9532,
      "bbox": [120.5, 80.3, 280.1, 210.7]
    }
  ]
}
```

### `GET /api/health`

Health check endpoint.

```json
{
  "status": "ok",
  "model_loaded": true
}
```

---

## Docker

### Build & Run

```bash
docker build -t neuroscan .
docker run -p 8000:8000 neuroscan
```

Open **http://localhost:8000** to use the app. API docs are at **http://localhost:8000/docs**.

The image uses a multi-stage build:
1. **Node 22-alpine** — installs frontend dependencies and builds the Vite SPA
2. **Python 3.11-slim** — installs Python deps via uv, copies the built frontend, and runs uvicorn

Healthcheck is configured at `/api/health` (interval: 30s).

---

## Development

### Adding dependencies

```bash
# Python (using uv)
uv add <package-name>

# Frontend (using npm)
cd frontend && npm install <package-name>
```

### Code Quality

```bash
# Backend
# Install ruff: uv add --dev ruff
# uv run ruff check src/

# Frontend (includes TypeScript type checking)
cd frontend && npm run build
```

---

## License

MIT

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Tailwind CSS v4, Vite |
| Backend | FastAPI (Python 3.11+), uvicorn |
| Inference | ONNX Runtime (CPU) |
| Model | YOLO-based brain tumor detection |
| Container | Multi-stage Docker (Node 22 → Python 3.11-slim) |

