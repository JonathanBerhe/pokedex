#!/bin/bash

# Test script for Pokedex API endpoints

BASE_URL="http://localhost:3000"

echo "=========================================="
echo "Testing Pokedex API Endpoints"
echo "=========================================="
echo ""

echo "1. GET /pokemon/pikachu (Basic Pokemon Info)"
echo "---"
curl -s "$BASE_URL/pokemon/pikachu" | jq '.'
echo ""
echo ""

echo "2. GET /pokemon/mewtwo (Legendary Pokemon)"
echo "---"
curl -s "$BASE_URL/pokemon/mewtwo" | jq '.'
echo ""
echo ""

echo "3. GET /pokemon/zubat (Cave Pokemon)"
echo "---"
curl -s "$BASE_URL/pokemon/zubat" | jq '.'
echo ""
echo ""

echo "4. GET /pokemon/translated/mewtwo (Yoda translation - legendary)"
echo "---"
curl -s "$BASE_URL/pokemon/translated/mewtwo" | jq '.'
echo ""
echo ""

echo "5. GET /pokemon/translated/pikachu (Shakespeare translation)"
echo "---"
curl -s "$BASE_URL/pokemon/translated/pikachu" | jq '.'
echo ""
echo ""

echo "6. GET /pokemon/translated/zubat (Yoda translation - cave habitat)"
echo "---"
curl -s "$BASE_URL/pokemon/translated/zubat" | jq '.'
echo ""
echo ""

echo "7. GET /pokemon/translated/charizard (Shakespeare translation)"
echo "---"
curl -s "$BASE_URL/pokemon/translated/charizard" | jq '.'
echo ""
echo ""

echo "8. GET /pokemon/invalidpokemon (Error handling)"
echo "---"
curl -s "$BASE_URL/pokemon/invalidpokemon" | jq '.'
echo ""
echo ""

echo "=========================================="
echo "All tests completed!"
echo "=========================================="
