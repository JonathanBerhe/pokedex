#!/bin/bash

# Simple test script for Pokedex API endpoints (no dependencies required)
# Make sure the server is running before executing this script
# Run with: ./test-endpoints-simple.sh

BASE_URL="http://localhost:3000"

echo "=========================================="
echo "Testing Pokedex API Endpoints"
echo "=========================================="
echo ""

# Test 1: Basic Pokemon - Pikachu
echo "1. GET /pokemon/pikachu (Basic Pokemon Info)"
echo "---"
curl -s "$BASE_URL/pokemon/pikachu"
echo ""
echo ""

# Test 2: Basic Pokemon - Mewtwo (Legendary)
echo "2. GET /pokemon/mewtwo (Legendary Pokemon)"
echo "---"
curl -s "$BASE_URL/pokemon/mewtwo"
echo ""
echo ""

# Test 3: Basic Pokemon - Zubat (Cave habitat)
echo "3. GET /pokemon/zubat (Cave Pokemon)"
echo "---"
curl -s "$BASE_URL/pokemon/zubat"
echo ""
echo ""

# Test 4: Translated Pokemon - Mewtwo (should use Yoda - legendary)
echo "4. GET /pokemon/translated/mewtwo (Yoda translation - legendary)"
echo "---"
curl -s "$BASE_URL/pokemon/translated/mewtwo"
echo ""
echo ""

# Test 5: Translated Pokemon - Pikachu (should use Shakespeare)
echo "5. GET /pokemon/translated/pikachu (Shakespeare translation)"
echo "---"
curl -s "$BASE_URL/pokemon/translated/pikachu"
echo ""
echo ""

# Test 6: Translated Pokemon - Zubat (should use Yoda - cave)
echo "6. GET /pokemon/translated/zubat (Yoda translation - cave habitat)"
echo "---"
curl -s "$BASE_URL/pokemon/translated/zubat"
echo ""
echo ""

# Test 7: Translated Pokemon - Charizard (should use Shakespeare)
echo "7. GET /pokemon/translated/charizard (Shakespeare translation)"
echo "---"
curl -s "$BASE_URL/pokemon/translated/charizard"
echo ""
echo ""

# Test 8: Error handling - Invalid Pokemon
echo "8. GET /pokemon/invalidpokemon (Error handling)"
echo "---"
curl -s "$BASE_URL/pokemon/invalidpokemon"
echo ""
echo ""

echo "=========================================="
echo "All tests completed!"
echo "=========================================="
