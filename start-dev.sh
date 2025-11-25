#!/bin/bash

# Quick development startup script
# Script khởi động nhanh cho development

set -e

echo "🚀 Starting WSCRM Platform in development mode..."
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found!"
    echo "📝 Creating .env from .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✅ Created .env file. Please update it with your configuration."
    else
        echo "❌ .env.example not found. Please create .env manually."
        exit 1
    fi
fi

echo ""
echo "🎯 Starting development server..."
echo "📍 Application will be available at http://localhost:3000"
echo ""

npm run dev

