#!/bin/bash

# WSCRM Platform - Deployment Script
# Script tự động deploy ứng dụng lên VPS

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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
echo -e "${BLUE}║   WSCRM Platform - Deploy Script      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi

# Check Node.js
print_info "Checking Node.js..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    exit 1
fi
print_success "Node.js $(node -v) found"

# Check PM2
print_info "Checking PM2..."
if ! command -v pm2 &> /dev/null; then
    print_warning "PM2 not found. Installing..."
    npm install -g pm2
fi
print_success "PM2 found"

# Check .env file
print_info "Checking .env file..."
if [ ! -f ".env" ]; then
    print_warning ".env file not found!"
    if [ -f ".env.example" ]; then
        print_info "Creating .env from .env.example..."
        cp .env.example .env
        print_warning "Please update .env file with your configuration before continuing"
        exit 1
    else
        print_error ".env.example not found. Please create .env manually."
        exit 1
    fi
fi
print_success ".env file found"

# Create logs directory
print_info "Creating logs directory..."
mkdir -p logs
print_success "Logs directory ready"

# Install dependencies
print_info "Installing dependencies..."
npm install --production
print_success "Dependencies installed"

# Build application
print_info "Building application..."
npm run build
print_success "Build completed"

# Database migration (optional)
read -p "Do you want to run database migration? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Running database migration..."
    npm run db:push || print_warning "Database migration failed or skipped"
fi

# Start/restart with PM2
print_info "Starting application with PM2..."

if pm2 list | grep -q "crm"; then
    print_info "Application already running. Restarting..."
    pm2 restart crm
else
    print_info "Starting new PM2 process..."
    pm2 start ecosystem.config.js
fi

# Save PM2 configuration
pm2 save

print_success "Application started with PM2"
print_info "Use 'pm2 status' to check status"
print_info "Use 'pm2 logs crm' to view logs"

echo ""
print_success "Deployment completed! 🚀"

