# =============================================================================
# Stage 1 — Build frontend
# =============================================================================
FROM node:22-alpine AS frontend-builder

# Better shell for pipefail awareness
SHELL ["/bin/sh", "-o", "pipefail", "-c"]

WORKDIR /build

# Copy dependency manifests first for layer caching
COPY frontend/package.json frontend/package-lock.json ./

# Install ALL dependencies (devDeps needed for tsc + vite)
RUN npm ci --silent --no-fund --no-audit

# Copy source code and build
COPY frontend/ .
RUN npm run build

# =============================================================================
# Stage 2 — Backend runtime
# =============================================================================
FROM python:3.11-slim-bookworm AS backend

# ── Metadata labels (https://github.com/dnaprawa/dockerfile-best-practices) ──
LABEL org.opencontainers.image.title="NeuroScan — Brain Tumor Detection"
LABEL org.opencontainers.image.description="AI-powered brain tumor detection from MRI scans using YOLO-based object detection"
LABEL org.opencontainers.image.source="https://github.com/neuroscan/brain-tumor-detection"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.authors="NeuroScan Team"

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# ── System dependencies ──
# Only essential runtime libraries; no build tools needed since ONNX is pre-compiled
# RUN apt-get update && apt-get install -y --no-install-recommends \
#     curl \
#     && rm -rf /var/lib/apt/lists/*

# Replace your current apt-get block with this:
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libxcb1 \
    libx11-6 \
    && rm -rf /var/lib/apt/lists/*

# ── Install uv (faster package manager) ──
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# ── Create non-root user ──
RUN groupadd --system --gid 1001 neuroscan \
    && useradd --system --uid 1001 --gid neuroscan --no-create-home --home-dir /app neuroscan

WORKDIR /app

# ── Environment variables ──
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_HTTP_TIMEOUT=300 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:$PATH"

# ── Install Python dependencies (cached layer — only invalidated on pyproject.toml/uv.lock changes) ──
RUN --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-install-project --no-dev

# ── Copy application code ──
COPY src/ src/
COPY pyproject.toml uv.lock ./

# ── Copy model artifacts ──
COPY artifacts/ artifacts/

# ── Copy built frontend from Stage 1 ──
COPY --from=frontend-builder --chown=neuroscan:neuroscan /build/dist/ frontend/dist/

# ── Final sync: install the project package itself ──
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev

# ── Hardening: drop root privileges ──
RUN chown -R neuroscan:neuroscan /app
USER neuroscan:neuroscan

# REMOVE THE APT-GET BLOCK ENTIRELY
# RUN apt-get update && apt-get install -y --no-install-recommends curl ...

# UPDATE THE HEALTHCHECK TO USE PYTHON INSTEAD OF CURL
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health', timeout=5)" || exit 1

# ── Port ──
EXPOSE 8000

# ── Start ──
CMD ["uvicorn", "src.api:app", "--host", "0.0.0.0", "--port", "8000"]
