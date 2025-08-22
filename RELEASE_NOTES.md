# Cloud Backup App v0.1.0 - Release Notes

## 🎉 First Release!

### Features:
- ✅ Automatic dependency installation (Homebrew, rclone, AWS CLI)
- ✅ Admin and User setup modes  
- ✅ AWS S3 integration with IAM security
- ✅ Cloud file browser with restore functionality
- ✅ Multi-language support (English/Spanish)

## 📥 Installation

### Requirements:
- **macOS 10.13+** (Apple Silicon optimized)
- **Internet connection** (for dependency installation)

### Steps:
1. **Download** the DMG file below
2. **Open** the DMG file
3. **Drag** the app to the Applications folder
4. **Close** the DMG window
5. **Launch** the app from Applications

## ⚠️ macOS Security Fix

If you see **"app is damaged and can't be opened"** error:

### Method 1: Terminal Command (Recommended)
1. Open **Terminal** (Applications → Utilities → Terminal)
2. Copy and paste this command:
   ```bash
   xattr -cr /Applications/cloud-backup-app.app
   ```
3. Press **Enter**
4. Launch the app - it should work now!


## 🚀 First Launch

The app will automatically:
1. **Install dependencies** (Homebrew, rclone, AWS CLI)
2. **Show setup options** (Admin or User mode)
3. **Guide you through configuration**

No manual terminal setup required!

## 🐛 Issues?

Report problems at: https://github.com/rodrygo03/lavoz-cloud/issues