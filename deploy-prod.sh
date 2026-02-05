#!/bin/bash

# ===========================================
# NORA - Deploy to PRODUCTION
# ===========================================
# Usage: ./deploy-prod.sh
#
# This script:
# 1. Builds the frontend for production (→ /dist)
# 2. Reloads the production backend via PM2
# ===========================================

set -e

echo ""
echo "=========================================="
echo "  NORA - Deploying to PRODUCTION"
echo "=========================================="
echo ""

cd /var/www/mirora.cloud

# Frontend build
echo "[1/3] Building frontend for production..."
npm install --silent
npm run build:prod
echo "      ✓ Frontend built to /dist"

# Backend
echo ""
echo "[2/3] Reloading production backend..."
cd /var/www/mirora.cloud/backend
npm install --silent
pm2 reload nora-api-prod --update-env 2>/dev/null || pm2 start ecosystem.config.cjs --only nora-api-prod
echo "      ✓ Backend reloaded on port 5000"

# Status
echo ""
echo "[3/3] Checking status..."
pm2 list | grep nora-api-prod

echo ""
echo "=========================================="
echo "  ✓ PRODUCTION deployment complete!"
echo "=========================================="
echo "  URL: https://mirora.cloud"
echo ""
