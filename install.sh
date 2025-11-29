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

print_step "Installing all project dependencies..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

print_info "Node.js version: $(node --version)"
print_info "npm version: $(npm --version)"

# Install backend dependencies
print_step "Installing backend dependencies..."
cd "$SCRIPT_DIR/backend" || exit 1

if [ ! -f "package.json" ]; then
    print_error "package.json not found in backend directory"
    exit 1
fi

print_info "Running npm install in backend..."
npm install

if [ $? -ne 0 ]; then
    print_error "Failed to install backend dependencies"
    exit 1
fi

print_info "Backend dependencies installed successfully!"

# Generate Prisma client (optional, but recommended)
if [ -f "prisma/schema.prisma" ]; then
    print_step "Generating Prisma client..."
    npm run db:generate
    if [ $? -eq 0 ]; then
        print_info "Prisma client generated successfully!"
    else
        print_warning "Failed to generate Prisma client (this is okay if database is not set up yet)"
    fi
fi

# Install frontend dependencies
print_step "Installing frontend dependencies..."
cd "$SCRIPT_DIR/frontend" || exit 1

if [ ! -f "package.json" ]; then
    print_error "package.json not found in frontend directory"
    exit 1
fi

print_info "Running npm install in frontend..."
npm install

if [ $? -ne 0 ]; then
    print_error "Failed to install frontend dependencies"
    exit 1
fi

print_info "Frontend dependencies installed successfully!"

# Print summary
echo ""
print_info "=========================================="
print_info "All dependencies installed successfully!"
print_info "=========================================="
print_info "Backend:  $SCRIPT_DIR/backend"
print_info "Frontend: $SCRIPT_DIR/frontend"
echo ""

