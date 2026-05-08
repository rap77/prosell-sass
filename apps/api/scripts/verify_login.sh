#!/bin/bash
# Login verification script for ProSell SaaS

echo "========================================="
echo "ProSell SaaS Login Verification"
echo "========================================="
echo ""

# Test credentials
EMAIL="admin@prosell.saas"
PASSWORD="Admin123!"
API_URL="http://localhost:8000/api/v1/auth/login"

echo "Testing login with:"
echo "  Email: $EMAIL"
echo "  Password: $PASSWORD"
echo "  API URL: $API_URL"
echo ""

# Make login request
echo "Sending login request..."
RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

# Check if login was successful
if echo "$RESPONSE" | grep -q "access_token"; then
    echo "✅ Login SUCCESSFUL!"
    echo ""
    echo "Response:"
    echo "$RESPONSE" | jq '{
      access_token: (.access_token[:50] + "..."),
      refresh_token: (.refresh_token[:50] + "..."),
      user_email: .user.email,
      user_roles: .user.roles,
      requires_2fa: .requires_2fa
    }' 2>/dev/null || echo "$RESPONSE"
    echo ""
    echo "========================================="
    echo "✅ Authentication system is working correctly"
    echo "========================================="
    exit 0
else
    echo "❌ Login FAILED"
    echo ""
    echo "Response:"
    echo "$RESPONSE"
    echo ""
    echo "========================================="
    echo "❌ Authentication system has issues"
    echo "========================================="
    exit 1
fi
