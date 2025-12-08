#!/bin/bash
set -e

echo "🔧 Setting up rclone binaries for bundling..."

BINARIES_DIR="src-tauri/binaries"
mkdir -p "$BINARIES_DIR"

# Detect current architecture
ARCH=$(uname -m)
echo "📦 Detected architecture: $ARCH"

# Function to download and extract rclone
download_rclone() {
    local arch=$1
    local filename=$2
    local url=$3

    echo "⬇️  Downloading rclone for $arch..."

    # Create temp directory
    TEMP_DIR=$(mktemp -d)
    cd "$TEMP_DIR"

    # Download
    curl -L -o rclone.zip "$url"

    # Extract
    unzip -q rclone.zip

    # Find the rclone binary
    RCLONE_BIN=$(find . -name "rclone" -type f | head -n 1)

    if [ -z "$RCLONE_BIN" ]; then
        echo "❌ Failed to find rclone binary in archive"
        cd -
        rm -rf "$TEMP_DIR"
        return 1
    fi

    # Copy to binaries directory
    cd -
    cp "$TEMP_DIR/$RCLONE_BIN" "$BINARIES_DIR/$filename"
    chmod +x "$BINARIES_DIR/$filename"

    # Cleanup
    rm -rf "$TEMP_DIR"

    echo "✅ $filename installed"
}

# Download for both architectures
echo ""
echo "📥 Downloading rclone binaries..."
echo ""

# Apple Silicon (arm64)
download_rclone "Apple Silicon" "rclone-aarch64-apple-darwin" \
    "https://downloads.rclone.org/rclone-current-osx-arm64.zip"

# Intel (x86_64)
download_rclone "Intel" "rclone-x86_64-apple-darwin" \
    "https://downloads.rclone.org/rclone-current-osx-amd64.zip"

echo ""
echo "✨ Setup complete!"
echo ""
echo "Installed binaries:"
ls -lh "$BINARIES_DIR"/rclone-*

echo ""
echo "You can now build the app with:"
echo "  npm run tauri build"
