# Bundled Binaries

This directory contains external binaries that are bundled with the application.

## rclone

The rclone binary is required for backup operations. You need to provide architecture-specific binaries:

- `rclone-aarch64-apple-darwin` - For Apple Silicon Macs (M1, M2, M3, etc.)
- `rclone-x86_64-apple-darwin` - For Intel Macs

### How to get rclone binaries

#### Option 1: Download from official site

```bash
# For Apple Silicon (arm64)
curl -O https://downloads.rclone.org/rclone-current-osx-arm64.zip
unzip rclone-current-osx-arm64.zip
cd rclone-*-osx-arm64
cp rclone ../rclone-aarch64-apple-darwin
chmod +x ../rclone-aarch64-apple-darwin

# For Intel (x86_64)
curl -O https://downloads.rclone.org/rclone-current-osx-amd64.zip
unzip rclone-current-osx-amd64.zip
cd rclone-*-osx-amd64
cp rclone ../rclone-x86_64-apple-darwin
chmod +x ../rclone-x86_64-apple-darwin
```

#### Option 2: Use the setup script

Run the `setup-rclone.sh` script from the project root:

```bash
./setup-rclone.sh
```

### Verification

After adding the binaries, verify they exist:

```bash
ls -lh src-tauri/binaries/rclone-*
```

You should see both architecture binaries with executable permissions.
