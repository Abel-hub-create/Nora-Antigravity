#!/bin/bash

# ===========================================
# NORA - Setup Development Nginx Configuration
# ===========================================
# This script requires root/sudo access
#
# Usage: sudo ./setup-dev-nginx.sh
# ===========================================

set -e

echo ""
echo "=========================================="
echo "  NORA - Setup DEV Nginx Configuration"
echo "=========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Error: This script must be run as root (use sudo)"
    exit 1
fi

# Create xcloud-conf directories for dev.mirora.cloud
echo "[1/5] Creating xcloud-conf directories..."
mkdir -p /etc/nginx/xcloud-conf/dev.mirora.cloud/before
mkdir -p /etc/nginx/xcloud-conf/dev.mirora.cloud/after
mkdir -p /etc/nginx/xcloud-conf/dev.mirora.cloud/server
echo "      ✓ Directories created"

# Copy htpasswd file
echo ""
echo "[2/5] Installing Basic Auth credentials..."
cp /var/www/mirora.cloud/nginx/.htpasswd-nora-dev /etc/nginx/.htpasswd-nora-dev
chmod 644 /etc/nginx/.htpasswd-nora-dev
echo "      ✓ Credentials installed"

# Copy nginx config
echo ""
echo "[3/5] Installing Nginx configuration..."
cp /var/www/mirora.cloud/nginx/dev.mirora.cloud.conf /etc/nginx/sites-available/dev.mirora.cloud
echo "      ✓ Configuration copied"

# Create symlink
echo ""
echo "[4/5] Enabling site..."
ln -sf /etc/nginx/sites-available/dev.mirora.cloud /etc/nginx/sites-enabled/dev.mirora.cloud
echo "      ✓ Site enabled"

# Test and reload nginx
echo ""
echo "[5/5] Testing and reloading Nginx..."
nginx -t
systemctl reload nginx
echo "      ✓ Nginx reloaded"

echo ""
echo "=========================================="
echo "  ✓ DEV Nginx setup complete!"
echo "=========================================="
echo ""
echo "IMPORTANT: You still need to configure DNS!"
echo ""
echo "Add this DNS record in Cloudflare:"
echo "  Type: A (or CNAME)"
echo "  Name: dev"
echo "  Content: [same IP as mirora.cloud]"
echo "  Proxy status: Proxied"
echo ""
echo "After DNS propagation (1-5 min):"
echo "  URL: https://dev.mirora.cloud"
echo "  User: abel"
echo "  Password: nora-dev-2024"
echo ""
