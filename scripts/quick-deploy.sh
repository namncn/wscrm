#!/bin/bash

# Quick Deploy Script - For experienced users
# Sử dụng script này nếu bạn đã cấu hình mọi thứ và chỉ cần update code

set -e

echo "🚀 Quick Deploy - WSCRM Platform"
echo ""

# Pull latest code
echo "📥 Pulling latest code..."
git pull

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production

# Build
echo "🔨 Building application..."
npm run build

# Restart PM2
echo "🔄 Restarting application..."
pm2 restart crm || pm2 start ecosystem.config.js

echo ""
echo "✅ Deploy completed!"

