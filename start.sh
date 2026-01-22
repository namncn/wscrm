#!/bin/bash

# WSCRM Platform - Application Startup Script
# Script khởi động ứng dụng CRM

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored messages
print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✅${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

print_error() {
    echo -e "${RED}❌${NC} $1"
}

# Banner
echo ""
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   WSCRM Platform - Startup Script     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Check Node.js
print_info "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js >= 20 LTS (khuyến nghị Node.js 20.x)"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    print_error "Node.js version must be >= 20. Current version: $(node -v)"
    print_error "Khuyến nghị sử dụng Node.js 20.x LTS để có hiệu năng và bảo mật tốt nhất"
    exit 1
fi

print_success "Node.js $(node -v) is installed"

# Check npm
print_info "Checking npm installation..."
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    exit 1
fi

print_success "npm $(npm -v) is installed"

# Check if node_modules exists
print_info "Checking dependencies..."
if [ ! -d "node_modules" ]; then
    print_warning "node_modules not found. Installing dependencies..."
    npm install
    print_success "Dependencies installed"
else
    print_success "Dependencies found"
fi

# Check .env file
print_info "Checking environment configuration..."
if [ ! -f ".env" ]; then
    print_warning ".env file not found!"
    print_warning "Please create .env file with required environment variables:"
    echo ""
    echo "Required variables:"
    echo "  - NEXTAUTH_URL"
    echo "  - NEXTAUTH_SECRET"
    echo "  - DB_HOST"
    echo "  - DB_PORT"
    echo "  - DB_USER"
    echo "  - DB_PASSWORD"
    echo "  - DB_NAME"
    echo "  - SMTP_HOST"
    echo "  - SMTP_PORT"
    echo "  - SMTP_USER"
    echo "  - SMTP_PASSWORD"
    echo ""
    read -p "Do you want to continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Startup cancelled. Please create .env file first."
        exit 1
    fi
else
    print_success ".env file found"
fi

# Ask about database setup
echo ""
read -p "Do you want to push database schema? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Pushing database schema..."
    npm run db:push || print_warning "Database push failed. Make sure database is running and configured correctly."
fi

# Ask for mode
echo ""
echo "Select mode:"
echo "  1) Development (npm run dev)"
echo "  2) Production (npm run build && npm run start)"
read -p "Enter choice [1-2] (default: 1): " -n 1 -r
echo

MODE=${REPLY:-1}

# Start application
echo ""
print_info "Starting application..."
echo ""

if [ "$MODE" == "2" ]; then
    print_info "Building for production..."
    npm run build
    print_success "Build completed"
    print_info "Starting production server..."
    npm run start
else
    print_info "Starting development server..."
    print_success "Application will be available at http://localhost:3000"
    echo ""
    npm run dev
fi

