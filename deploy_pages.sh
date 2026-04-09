#!/bin/bash
# Deploy the static opportunities site to GitHub Pages.
#
# Prerequisites:
#   1. Run fetch_prices.py to update the DB
#   2. Run export_opportunities.py to generate the static JSON
#
# This script:
#   - Builds the frontend with VITE_STATIC_MODE=true
#   - Deploys the dist/ folder to the gh-pages branch
#
# Usage:
#   ./deploy_pages.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== Step 1: Export opportunities JSON ==="
cd "$SCRIPT_DIR/backend"
python -m scripts.export_opportunities

echo ""
echo "=== Step 2: Build frontend (static mode) ==="
cd "$SCRIPT_DIR/frontend"
VITE_STATIC_MODE=true npm run build

echo ""
echo "=== Step 3: Deploy to gh-pages branch ==="
cd "$SCRIPT_DIR"

# Check if gh-pages branch exists
if git show-ref --quiet refs/heads/gh-pages; then
    git branch -D gh-pages
fi

# Create an orphan gh-pages branch with just the dist contents
git checkout --orphan gh-pages
git rm -rf . 2>/dev/null || true

# Copy built files to root
cp -r frontend/dist/* .

# Add a .nojekyll file so GitHub doesn't try to process with Jekyll
touch .nojekyll

git add -A
git commit -m "Deploy opportunities site to GitHub Pages ($(date +%Y-%m-%d))"

echo ""
echo "=== Done! ==="
echo "Now push with:  git push origin gh-pages --force"
echo "Then enable GitHub Pages in your repo settings (branch: gh-pages, root: /)"
echo ""
echo "Switching back to your previous branch..."
git checkout -

echo "Site will be at: https://<your-username>.github.io/Tcgplayer_prices/"
