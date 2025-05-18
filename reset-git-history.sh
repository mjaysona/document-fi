#!/bin/bash

# Script to reset git history to a single commit while preserving remote origin
# This will preserve all current code but remove all commit history

echo "🔄 Resetting Git history to a single commit..."

# Verify we're in a git repository
if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
  echo "❌ Error: Not in a git repository"
  exit 1
fi

# Get the repository root directory
REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT" || exit 1

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
  echo "⚠️ You have uncommitted changes. Please commit or stash them first."
  exit 1
fi

# Save the current remote origin URL
REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")
if [ -n "$REMOTE_URL" ]; then
  echo "📝 Saved remote origin: $REMOTE_URL"
fi

# Get current branch name to restore later
CURRENT_BRANCH=$(git branch --show-current)
echo "📝 Current branch: $CURRENT_BRANCH"

# Create an orphan branch
echo "🌱 Creating a new branch with no history..."
git checkout --orphan temp-reset-branch

# Add all files
git add .

# Commit everything
git commit -m "Initial commit - Payload v3 Boilerplate"

# Delete the old branch
echo "🗑️ Removing old branch..."
git branch -D "$CURRENT_BRANCH"

# Rename the current branch
git branch -m "$CURRENT_BRANCH"

# Restore remote origin if it existed
if [ -n "$REMOTE_URL" ]; then
  echo "🔄 Restoring remote origin..."
  git remote add origin "$REMOTE_URL"
  echo "⚠️ Note: You'll need to force push to update the remote repository:"
  echo "    git push -f origin $CURRENT_BRANCH"
fi

echo "✅ Git history has been reset to a single commit."
echo "📊 New repository status:"
git log --oneline
git status

echo ""
if [ -n "$REMOTE_URL" ]; then
  echo "Next steps:"
  echo "1. To update your remote repository, run: git push -f origin $CURRENT_BRANCH"
  echo ""
  echo "⚠️ CAUTION: Force pushing will overwrite the remote history. Make sure this is what you want!"
else
  echo "Next steps:"
  echo "1. To add a remote origin: git remote add origin <your-repository-url>"
  echo "2. To push to remote: git push -u origin $CURRENT_BRANCH"
fi