#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# NeuroScan — Development & Production Runner
# =============================================================================
# Usage:
#   ./run.sh            # Dev mode: backend + frontend dev server (concurrent)
#   ./run.sh --dev      # Same as above
#   ./run.sh --prod     # Production: build frontend, then start backend only
#   ./run.sh --build    # Build frontend only
# =============================================================================

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

# ---- Preflight Checks ----

check_deps() {
  if ! command -v uv &>/dev/null; then
    echo -e "${RED}Error: uv is not installed.${NC}"
    echo "Install it: curl -LsSf https://astral.sh/uv/install.sh | sh"
    exit 1
  fi
  if ! command -v npm &>/dev/null; then
    echo -e "${RED}Error: npm is not installed.${NC}"
    exit 1
  fi
}

install_python_deps() {
  echo -e "${BLUE}[1/3] Installing Python dependencies...${NC}"
  uv sync
  echo -e "${GREEN}  ✓ Python dependencies installed${NC}"
}

install_python_deps_dev() {
  echo -e "${BLUE}[1/3] Installing Python dependencies (with dev extras)...${NC}"
  uv sync --all-extras
  echo -e "${GREEN}  ✓ Python dependencies installed${NC}"
}

install_frontend_deps() {
  echo -e "${BLUE}[2/3] Installing frontend dependencies...${NC}"
  cd frontend
  npm install --silent
  cd ..
  echo -e "${GREEN}  ✓ Frontend dependencies installed${NC}"
}

build_frontend() {
  echo -e "${BLUE}[3/3] Building frontend...${NC}"
  cd frontend
  npm run build
  cd ..
  echo -e "${GREEN}  ✓ Frontend built successfully${NC}"
}

cleanup() {
  echo ""
  echo -e "${YELLOW}Shutting down...${NC}"
  [ -n "${BACKEND_PID:-}" ] && kill "$BACKEND_PID" 2>/dev/null
  [ -n "${FRONTEND_PID:-}" ] && kill "$FRONTEND_PID" 2>/dev/null
  wait 2>/dev/null
  echo -e "${GREEN}Done.${NC}"
  exit 0
}

trap cleanup SIGINT SIGTERM

# ---- Modes ----

MODE="${1:---dev}"

case "$MODE" in
  --dev)
    echo -e "${CYAN}╔══════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║     🧠 NeuroScan — Dev Mode         ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════╝${NC}"
    echo ""
    check_deps
    install_python_deps_dev
    install_frontend_deps

    # Start backend with auto-reload and wait for it to be ready
    echo -e "${GREEN}🚀 Starting backend on http://localhost:8000${NC}"
    uv run uvicorn src.api:app --host 0.0.0.0 --port 8000 --reload &
    BACKEND_PID=$!

    # Poll until the backend health endpoint responds
    echo -e "${BLUE}  Waiting for backend to be ready...${NC}"
    for i in $(seq 1 30); do
      if python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')" 2>/dev/null; then
        echo -e "${GREEN}  ✓ Backend is ready${NC}"
        break
      fi
      if [ "$i" -eq 30 ]; then
        echo -e "${RED}  ✗ Backend failed to start${NC}"
      fi
      sleep 1
    done

    # Start frontend dev server
    echo -e "${GREEN}🚀 Starting frontend on http://localhost:5173${NC}"
    cd frontend
    npm run dev &
    FRONTEND_PID=$!
    cd ..

    echo ""
    echo -e "${YELLOW}────────────────────────────────────────${NC}"
    echo -e "${YELLOW}  Frontend:  http://localhost:5173${NC}"
    echo -e "${YELLOW}  Backend:   http://localhost:8000${NC}"
    echo -e "${YELLOW}  API Docs:  http://localhost:8000/docs${NC}"
    echo -e "${YELLOW}────────────────────────────────────────${NC}"
    echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
    echo ""

    # Wait for background processes
    wait
    ;;

  --prod)
    echo -e "${CYAN}╔══════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║   🧠 NeuroScan — Production Mode    ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════╝${NC}"
    echo ""
    check_deps
    install_python_deps
    install_frontend_deps
    build_frontend

    echo -e "${GREEN}🚀 Starting server on http://localhost:8000${NC}"
    echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
    echo ""
    uv run uvicorn src.api:app --host 0.0.0.0 --port 8000
    ;;

  --build)
    echo -e "${CYAN}╔══════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║    🧠 NeuroScan — Build Frontend    ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════╝${NC}"
    echo ""
    check_deps
    install_frontend_deps
    build_frontend
    echo -e "${GREEN}  ✓ Frontend ready in frontend/dist/${NC}"
    ;;

  *)
    echo -e "${RED}Unknown mode: $MODE${NC}"
    echo "Usage: ./run.sh [--dev|--prod|--build]"
    exit 1
    ;;
esac
