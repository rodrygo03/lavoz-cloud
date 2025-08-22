#!/bin/bash

echo "🧹 Cleaning up Cloud Backup dependencies for testing..."

# Remove only the specific packages we want to test
echo "Removing rclone..."
brew uninstall rclone 2>/dev/null || echo "rclone not installed via brew"

echo "Removing awscli..."
brew uninstall awscli 2>/dev/null || echo "awscli not installed via brew"

# Also remove any downloaded binaries from our app's data directory
echo "Removing app data directory..."
rm -rf ~/Library/Application\ Support/cloud-backup-app/

echo "✅ Cleanup complete!"
echo ""
echo "Your other brew packages are preserved:"
echo "- node (for development)"
echo "- go (programming language)"
echo "- python@3.13 (development)"
echo "- podman (containers)"
echo "- ollama (AI models)"
echo "- And other development tools"
echo ""
echo "Only rclone and awscli have been removed for testing."
echo "Run 'npm run tauri dev' to test the dependency installation!"