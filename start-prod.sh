#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored messages
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Array to store background process PIDs and process groups
PIDS=()
PROCESS_GROUPS=()

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to kill process on port
kill_port() {
    local port=$1
    local pid=$(lsof -ti :$port)
    if [ -n "$pid" ]; then
        print_warning "Killing process on port $port (PID: $pid)"
        kill -TERM "$pid" 2>/dev/null
        sleep 2
        if kill -0 "$pid" 2>/dev/null; then
            kill -KILL "$pid" 2>/dev/null
        fi
    fi
}

# Function to cleanup on exit
cleanup() {
    print_warning "Shutting down all services..."
    
    # Kill all background processes by PID
    for pid in "${PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            print_info "Stopping process $pid..."
            # Try to kill the process group first (if it was started with setsid)
            # Then try to kill the process itself
            kill -TERM -"$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null
        fi
    done
    
    # Wait a bit for graceful shutdown
    sleep 3
    
    # Force kill if still running
    for pid in "${PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            print_warning "Force killing process $pid..."
            kill -KILL -"$pid" 2>/dev/null || kill -KILL "$pid" 2>/dev/null
        fi
    done
    
    # Kill processes on specific ports (fallback)
    kill_port 3000  # Backend
    kill_port 4173  # Frontend preview
    
    # Stop docker-compose
    print_info "Stopping Docker services..."
    cd "$SCRIPT_DIR/backend" || exit
    if [ -n "$DOCKER_COMPOSE_CMD" ]; then
        $DOCKER_COMPOSE_CMD down 2>/dev/null
    else
        if command -v docker-compose &> /dev/null; then
            docker-compose down 2>/dev/null
        elif docker compose version &> /dev/null; then
            docker compose down 2>/dev/null
        fi
    fi
    
    print_info "All services stopped."
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM EXIT

# Check prerequisites
print_step "Checking prerequisites..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check for docker-compose or docker compose
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
elif docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
else
    print_error "docker-compose or docker compose not found. Please install Docker Compose."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm."
    exit 1
fi

# Check if ports are available
print_step "Checking ports..."
if check_port 3000; then
    print_warning "Port 3000 is already in use. Attempting to free it..."
    kill_port 3000
    sleep 2
fi

if check_port 4173; then
    print_warning "Port 4173 is already in use. Attempting to free it..."
    kill_port 4173
    sleep 2
fi

if check_port 5432; then
    print_warning "Port 5432 is already in use. This might be the database."
fi

# Start PostgreSQL with docker-compose
print_step "Starting PostgreSQL database..."
cd "$SCRIPT_DIR/backend" || exit
$DOCKER_COMPOSE_CMD up -d postgres

# Wait for PostgreSQL to be ready
print_info "Waiting for PostgreSQL to be ready..."
sleep 3
MAX_RETRIES=30
RETRY_COUNT=0
while ! $DOCKER_COMPOSE_CMD exec -T postgres pg_isready -U postgres > /dev/null 2>&1; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        print_error "PostgreSQL failed to start after $MAX_RETRIES attempts"
        cleanup
        exit 1
    fi
    sleep 1
done
print_info "PostgreSQL is ready!"

# Build and start backend
print_step "Building backend..."
cd "$SCRIPT_DIR/backend" || exit

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    print_warning "Backend node_modules not found. Installing dependencies..."
    npm install
fi

# Build backend
print_info "Building backend for production..."
npm run build
if [ $? -ne 0 ]; then
    print_error "Backend build failed!"
    cleanup
    exit 1
fi

# Generate Prisma client
print_info "Generating Prisma client..."
npm run db:generate

# Start backend in production mode
print_info "Starting backend server in production mode..."
cd "$SCRIPT_DIR/backend" || exit
NODE_ENV=production npm run start:prod > /tmp/backend-prod.log 2>&1 &
BACKEND_PID=$!
PIDS+=($BACKEND_PID)
print_info "Backend started (PID: $BACKEND_PID)"
print_info "View backend logs: tail -f /tmp/backend-prod.log"

# Wait for backend to be ready
print_info "Waiting for backend to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0
while true; do
    # Try multiple methods to check if backend is ready
    if command -v curl &> /dev/null; then
        if curl -s http://localhost:3000 > /dev/null 2>&1; then
            break
        fi
    elif command -v wget &> /dev/null; then
        if wget -q --spider http://localhost:3000 > /dev/null 2>&1; then
            break
        fi
    else
        # Fallback: check if process is still running and port is listening
        if kill -0 "$BACKEND_PID" 2>/dev/null && check_port 3000; then
            sleep 2  # Give it a bit more time
            break
        fi
    fi
    
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        print_error "Backend failed to start after $MAX_RETRIES attempts"
        print_error "Check logs: tail -f /tmp/backend-prod.log"
        cleanup
        exit 1
    fi
    sleep 1
done
print_info "Backend is ready!"

# Build and start frontend
print_step "Building frontend..."
cd "$SCRIPT_DIR/frontend" || exit

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    print_warning "Frontend node_modules not found. Installing dependencies..."
    npm install
fi

# Build frontend
print_info "Building frontend for production..."
npm run build
if [ $? -ne 0 ]; then
    print_error "Frontend build failed!"
    cleanup
    exit 1
fi

# Start frontend preview server
print_info "Starting frontend preview server..."
cd "$SCRIPT_DIR/frontend" || exit
npm run preview > /tmp/frontend-prod.log 2>&1 &
FRONTEND_PID=$!
PIDS+=($FRONTEND_PID)
print_info "Frontend started (PID: $FRONTEND_PID)"
print_info "View frontend logs: tail -f /tmp/frontend-prod.log"

# Wait for frontend to be ready
print_info "Waiting for frontend to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0
while true; do
    # Try multiple methods to check if frontend is ready
    if command -v curl &> /dev/null; then
        if curl -s http://localhost:4173 > /dev/null 2>&1; then
            break
        fi
    elif command -v wget &> /dev/null; then
        if wget -q --spider http://localhost:4173 > /dev/null 2>&1; then
            break
        fi
    else
        # Fallback: check if process is still running and port is listening
        if kill -0 "$FRONTEND_PID" 2>/dev/null && check_port 4173; then
            sleep 2  # Give it a bit more time
            break
        fi
    fi
    
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        print_error "Frontend failed to start after $MAX_RETRIES attempts"
        print_error "Check logs: tail -f /tmp/frontend-prod.log"
        cleanup
        exit 1
    fi
    sleep 1
done
print_info "Frontend is ready!"

# Print status
echo ""
print_info "=========================================="
print_info "All services are running in PRODUCTION mode!"
print_info "=========================================="
print_info "Backend:  http://localhost:3000"
print_info "Frontend: http://localhost:4173"
print_info "Database: localhost:5432"
print_info ""
print_info "Logs:"
print_info "  Backend:  tail -f /tmp/backend-prod.log"
print_info "  Frontend: tail -f /tmp/frontend-prod.log"
print_info ""
print_info "Press Ctrl+C to stop all services"
print_info "=========================================="
echo ""

# Monitor processes and wait
wait

