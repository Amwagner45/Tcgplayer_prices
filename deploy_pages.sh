#!/bin/bash
# Deploy the static opportunities site to GitHub Pages.
#
# Uses git worktree so the main working tree (and your database) is never
# touched during deployment. Only the built dist/ files are committed.
#
# Prerequisites:
#   1. Run fetch_prices.py to update the DB
#   2. Run export_opportunities.py to generate the static JSON
#
# Usage:
#   ./deploy_pages.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DEPLOY_DIR="$SCRIPT_DIR/.gh-pages-deploy"

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

# Clean up any previous deploy worktree
if [ -d "$DEPLOY_DIR" ]; then
    git worktree remove "$DEPLOY_DIR" --force 2>/dev/null || rm -rf "$DEPLOY_DIR"
fi

# Create or reset the orphan gh-pages branch
if git show-ref --quiet refs/heads/gh-pages; then
    git branch -D gh-pages
fi
# Create a new orphan branch with an empty commit
git checkout --orphan gh-pages
git rm -rf . 2>/dev/null || true
git commit --allow-empty -m "init gh-pages"
git checkout main
# Now set up a worktree for the deploy
git worktree add "$DEPLOY_DIR" gh-pages

# Copy only the built dist files into the deploy directory
rm -rf "$DEPLOY_DIR"/*
cp -r frontend/dist/* "$DEPLOY_DIR/"

# Add a .nojekyll file so GitHub doesn't try to process with Jekyll
touch "$DEPLOY_DIR/.nojekyll"

# Commit from the worktree
cd "$DEPLOY_DIR"
git add -A
git commit -m "Deploy opportunities site to GitHub Pages ($(date +%Y-%m-%d))"

# Clean up the worktree
cd "$SCRIPT_DIR"
git worktree remove "$DEPLOY_DIR" --force

echo ""
echo "=== Done! ==="
echo "Now push with:  git push origin gh-pages --force"
echo "Then enable GitHub Pages in your repo settings (branch: gh-pages, root: /)"
echo ""
echo "Site will be at: https://<your-username>.github.io/Tcgplayer_prices/"
