#!/bin/bash
# Quick setup script — installs deps, copies .env, and starts dev server.
# Run this after cloning.

set -e

echo "Setting up SmartDoc..."

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example — fill in your API keys before starting"
fi

npm install

echo ""
echo "Done. Run 'npm run dev' to start."
echo "Or 'docker compose up --build' if you want Mongo + Redis included."
