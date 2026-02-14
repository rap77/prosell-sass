#!/bin/bash
# generate-jwt-keys.sh - Generate RSA key pair for JWT signing

set -e

KEYS_DIR="./apps/api/keys"
mkdir -p "$KEYS_DIR"

echo "🔑 Generating RSA key pair for JWT..."

openssl genrsa -out "$KEYS_DIR/private.pem" 2048
openssl rsa -in "$KEYS_DIR/private.pem" -pubout -out "$KEYS_DIR/public.pem"

# Set permissions
chmod 600 "$KEYS_DIR/private.pem"
chmod 644 "$KEYS_DIR/public.pem"

echo "✅ Keys generated successfully!"
echo "   Private: $KEYS_DIR/private.pem"
echo "   Public:  $KEYS_DIR/public.pem"
echo ""
echo "📝 Add to .env:"
echo "   JWT_PRIVATE_KEY_PATH=$KEYS_DIR/private.pem"
echo "   JWT_PUBLIC_KEY_PATH=$KEYS_DIR/public.pem"
