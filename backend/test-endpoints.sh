#!/bin/bash

# Script de test des endpoints critiques
# Identifie les bugs et problèmes potentiels

BASE_URL="http://localhost:5000"
ERRORS=0

echo "=== AUDIT COMPLET DES ENDPOINTS NORA ==="
echo ""

# Test 1: Health check
echo "1. Health check..."
HEALTH=$(curl -s "$BASE_URL/health")
if echo "$HEALTH" | grep -q "ok"; then
    echo "✓ Health check OK"
else
    echo "✗ Health check FAILED"
    ((ERRORS++))
fi

# Test 2: Plans publics
echo "2. Plans publics..."
PLANS=$(curl -s "$BASE_URL/api/subscription/plans")
if echo "$PLANS" | grep -q "plans"; then
    echo "✓ Plans endpoint OK"
else
    echo "✗ Plans endpoint FAILED"
    ((ERRORS++))
fi

# Test 3: Admin login (sans auth)
echo "3. Admin login endpoint..."
ADMIN_LOGIN=$(curl -s -X POST "$BASE_URL/api/admin/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}' 2>&1)
if echo "$ADMIN_LOGIN" | grep -q "error"; then
    echo "✓ Admin login endpoint OK (rejects invalid creds)"
else
    echo "✗ Admin login endpoint FAILED"
    ((ERRORS++))
fi

# Test 4: Auth endpoints (sans token)
echo "4. Auth protection..."
AUTH_TEST=$(curl -s "$BASE_URL/api/syntheses")
if echo "$AUTH_TEST" | grep -q "Authentification requise\|error"; then
    echo "✓ Auth middleware OK"
else
    echo "✗ Auth middleware FAILED - endpoints non protégés!"
    ((ERRORS++))
fi

# Test 5: Conversations endpoint (sans auth)
echo "5. Conversations protection..."
CONV_TEST=$(curl -s "$BASE_URL/api/conversations")
if echo "$CONV_TEST" | grep -q "Authentification requise\|error"; then
    echo "✓ Conversations protected OK"
else
    echo "✗ Conversations NOT protected!"
    ((ERRORS++))
fi

# Test 6: AI endpoints (sans auth)
echo "6. AI endpoints protection..."
AI_TEST=$(curl -s -X POST "$BASE_URL/api/ai/generate-content" \
    -H "Content-Type: application/json" \
    -d '{"text":"test"}')
if echo "$AI_TEST" | grep -q "Authentification requise\|error"; then
    echo "✓ AI endpoints protected OK"
else
    echo "✗ AI endpoints NOT protected!"
    ((ERRORS++))
fi

echo ""
echo "=== RÉSUMÉ ==="
if [ $ERRORS -eq 0 ]; then
    echo "✓ Tous les tests passés! ($ERRORS erreurs)"
else
    echo "✗ $ERRORS erreur(s) détectée(s)"
fi

exit $ERRORS
