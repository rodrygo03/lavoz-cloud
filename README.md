# Cloud Backup App

A modern desktop application for automated cloud backups using AWS S3 and rclone, built with Tauri and React.

## ✨ Features

- **🔧 Automatic Setup**: Downloads and installs dependencies (Homebrew, rclone, AWS CLI) automatically
- **👑 Admin & User Modes**: Set up AWS infrastructure as admin, or connect as user with provided credentials  
- **🌐 Multi-language**: English and Spanish support
- **📁 Cloud Browser**: Browse and restore files from S3 with admin oversight
- **⚡ Native Performance**: Built with Tauri for fast, lightweight desktop experience
- **🔒 Secure**: AWS IAM integration with proper user isolation

## 📥 Download

**[Download Latest Release →](https://github.com/YOUR_USERNAME/cloud-backup-app/releases/latest)**

### Requirements
- **macOS 10.13+** (Apple Silicon optimized)
- **Internet connection** (for dependency installation)

## 🚀 Quick Start

1. **Download** the DMG file from [Releases](https://github.com/YOUR_USERNAME/cloud-backup-app/releases)
2. **Open** the DMG and drag the app to Applications
3. **Launch** the app - it will automatically install dependencies on first run
4. **Choose setup type**:
   - **Admin**: Configure AWS infrastructure and manage users
   - **User**: Connect with credentials provided by your admin

## 🔧 Development

### Prerequisites
- Node.js 18+
- Rust 1.70+
- Xcode Command Line Tools

### Setup
```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/cloud-backup-app.git
cd cloud-backup-app

# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build
```

## 📁 Project Structure

```
├── src/                     # React frontend
│   ├── components/          # UI components
│   ├── i18n/               # Internationalization
│   └── types.ts            # TypeScript definitions
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── aws.rs          # AWS integration
│   │   ├── rclone.rs       # Rclone operations
│   │   ├── downloader.rs   # Dependency management
│   │   └── ...
│   └── tauri.conf.json     # Tauri configuration
└── README.md
```

## 🏗️ Architecture

- **Frontend**: React + TypeScript + Vite
- **Backend**: Rust + Tauri
- **Dependencies**: Automatically managed via Homebrew
- **Storage**: AWS S3 with rclone synchronization
- **Authentication**: AWS IAM with profile-based access

## 🐛 Issues

Report bugs and feature requests on the [Issues page](https://github.com/YOUR_USERNAME/cloud-backup-app/issues).
