#!/bin/bash

# Test Rate Limiting for Pokedex API

echo "========================================"
echo "Testing Basic Endpoint Rate Limit"
echo "Expected: 10 requests succeed, 11th fails with 429"
echo "========================================"
echo ""

for i in {1..11}; do
  echo "Request $i:"
  response=$(curl -s -w "\n%{http_code}" http://localhost:3000/pokemon/pikachu)
  status_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')

  if [ "$status_code" = "429" ]; then
    echo "✓ Rate limited (HTTP 429)"
    echo "Response: $body"
  elif [ "$status_code" = "200" ]; then
    echo "✓ Success (HTTP 200)"
  else
    echo "✗ Unexpected status: $status_code"
    echo "Response: $body"
  fi
  echo ""
done

echo ""
echo "========================================"
echo "Testing Translated Endpoint Rate Limit"
echo "Expected: 5 requests succeed, 6th fails with 429"
echo "========================================"
echo ""

for i in {1..6}; do
  echo "Request $i:"
  response=$(curl -s -w "\n%{http_code}" http://localhost:3000/pokemon/translated/mewtwo)
  status_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')

  if [ "$status_code" = "429" ]; then
    echo "✓ Rate limited (HTTP 429)"
    echo "Response: $body"
  elif [ "$status_code" = "200" ]; then
    echo "✓ Success (HTTP 200)"
  else
    echo "✗ Unexpected status: $status_code"
    echo "Response: $body"
  fi
  echo ""
done

echo "========================================"
echo "Rate Limit Testing Complete"
echo "========================================"
