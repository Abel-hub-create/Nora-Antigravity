#!/bin/bash

# ===========================================
# NORA - Deploy to DEVELOPMENT
# ===========================================
# Usage: ./deploy-dev.sh
#
# This script:
# 1. Builds the frontend for development (→ /dist-dev)
# 2. Reloads the development backend via PM2
# ===========================================

set -e

echo ""
echo "=========================================="
echo "  NORA - Deploying to DEVELOPMENT"
echo "=========================================="
echo ""

cd /var/www/mirora.cloud

# Frontend build
echo "[1/3] Building frontend for development..."
npm install --silent
npm run build:dev
echo "      ✓ Frontend built to /dist-dev"

# Backend
echo ""
echo "[2/3] Reloading development backend..."
cd /var/www/mirora.cloud/backend
npm install --silent
pm2 reload nora-api-dev --update-env 2>/dev/null || pm2 start ecosystem.config.cjs --only nora-api-dev
echo "      ✓ Backend reloaded on port 5001"

# Status
echo ""
echo "[3/3] Checking status..."
pm2 list | grep nora-api-dev

echo ""
echo "=========================================="
echo "  ✓ DEVELOPMENT deployment complete!"
echo "=========================================="
echo "  URL: https://dev.mirora.cloud"
echo "  Auth: abel / nora-dev-2024"
echo ""
