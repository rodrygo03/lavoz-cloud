# Cloud Backup App

A modern desktop application for automated cloud backups using AWS S3, Cognito authentication, and scheduled backups. Built with Tauri and React.

**Version**: 0.2.0 (Scheduled Backups)
**Status**: 🟢 Production Ready (macOS)

---

## ✨ Features

### 🔐 **AWS Cognito Authentication**
- Secure user login with email/password
- Multi-factor authentication (MFA) support
- Password reset flow
- Role-based access (Admin/User)
- No manual credential management

### ⏰ **Scheduled Backups** ⭐ **NEW**
- Daily, weekly, or monthly automatic backups
- Runs even when app is closed (macOS)
- Background execution via launchd
- Permanent IAM credentials for reliability
- Synced logs visible in app dashboard

### 💾 **Manual Backups**
- One-click "Backup Now" functionality
- Preview changes before backup (files to copy/update/delete)
- Copy mode (incremental) or Sync mode (bidirectional)
- Real-time progress tracking

### 📁 **Cloud Browser**
- Browse your S3 backup files
- Search functionality
- Download/restore files
- User folder isolation for security
- Admin can view all user folders (optional)

### 🔒 **Security**
- **Dual Credential System**:
  - Temporary credentials (Cognito) for manual backups
  - Permanent credentials (IAM) for scheduled backups
- S3 folder isolation: Each user restricted to `users/{cognito-id}/`
- Token validation via Lambda
- No credentials in browser storage

### 🌐 **Multi-language Support**
- English and Spanish
- Easy language switching

### 🔧 **Zero-Config Setup**
- Auto-installs dependencies (Homebrew, rclone, AWS CLI)
- One-time JSON configuration paste
- Automatic profile creation on login

---

## 📥 Installation

### Requirements
- **macOS 10.13+** (Apple Silicon & Intel supported)
- **Internet connection** (for dependency installation)
- **AWS Cognito account** (provided by admin)

### User Setup

1. **Get Configuration from Admin**
   - Your admin will provide a JSON configuration file

2. **Download & Install App**
   - Download the DMG from [Releases](https://github.com/rodrygo03/lavoz-cloud/releases)
   - Open DMG and drag to Applications
   - Launch the app

3. **Configure App**
   - On first launch, paste the JSON configuration provided by admin
   - Click "Import and Continue"

4. **Login**
   - Enter your Cognito email and password
   - Complete MFA if enabled

5. **Start Backing Up**
   - Select folders to backup in Settings
   - Click "Backup Now" for immediate backup
   - Or schedule automatic backups

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                   User Login (Cognito)              │
└─────────────────┬───────────────────────────────────┘
                  │
        ┌─────────▼────────┐
        │  App Gets TWO    │
        │  Credential Sets │
        └─────────┬────────┘
                  │
         ┌────────┴────────┐
         │                 │
    ┌────▼─────┐      ┌───▼──────┐
    │ Cognito  │      │   IAM    │
    │   Temp   │      │Permanent │
    │  (ASIA)  │      │  (AKIA)  │
    └────┬─────┘      └────┬─────┘
         │                 │
         ▼                 ▼
   Manual Backups    Scheduled Backups
   Cloud Browser     Background Jobs
```

### Technology Stack
- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Rust + Tauri 2
- **Storage**: AWS S3 + rclone
- **Authentication**: AWS Cognito (User Pool + Identity Pool)
- **Scheduling**: macOS launchd
- **Serverless**: AWS Lambda (IAM user creation)
- **i18n**: i18next

---

## 🔧 Development

### Prerequisites
- Node.js 18+
- Rust 1.70+
- Xcode Command Line Tools (macOS)

### Setup

```bash
# Clone the repository
git clone https://github.com/rodrygo03/lavoz-cloud.git
cd lavoz-cloud

# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build
```

### Project Structure

```
lavoz-cloud/
├── src/                          # React frontend
│   ├── components/               # UI components
│   │   ├── CognitoLogin.tsx     # Login screen
│   │   ├── Dashboard.tsx        # Main dashboard
│   │   ├── CloudBrowser.tsx     # File browser
│   │   ├── Settings.tsx         # Settings & schedule
│   │   └── ...
│   ├── services/
│   │   ├── cognitoAuth.ts       # Cognito auth logic
│   │   ├── awsCredentials.ts    # Temporary credentials
│   │   └── iamCredentials.ts    # IAM user creation
│   ├── i18n/                    # Translations
│   └── types.ts                 # TypeScript types
├── src-tauri/                   # Rust backend
│   ├── src/
│   │   ├── lib.rs              # Tauri command handlers
│   │   ├── config.rs           # Profile management
│   │   ├── rclone.rs           # rclone integration
│   │   ├── schedule.rs         # Backup scheduling
│   │   ├── iam_storage.rs      # IAM credential storage
│   │   └── ...
│   └── Cargo.toml
├── lambda/                      # AWS Lambda functions
│   └── create-iam-user/        # IAM user creation Lambda
│       ├── index.js
│       └── package.json
├── DEPLOYMENT_COMPLETE.md       # Deployment status
├── NEXT_STEPS.md               # Future roadmap
├── SCHEDULED_BACKUPS_SETUP.md  # Lambda deployment guide
└── AWS_SETUP_INSTRUCTIONS.md   # AWS configuration guide
```

---

## 📚 Documentation

- **[DEPLOYMENT_COMPLETE.md](DEPLOYMENT_COMPLETE.md)** - Current deployment status and what's working
- **[NEXT_STEPS.md](NEXT_STEPS.md)** - Development roadmap and future features
- **[SCHEDULED_BACKUPS_SETUP.md](SCHEDULED_BACKUPS_SETUP.md)** - Complete Lambda deployment guide
- **[AWS_SETUP_INSTRUCTIONS.md](AWS_SETUP_INSTRUCTIONS.md)** - AWS Cognito and IAM configuration
- **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** - Technical implementation details
- **[DEMO_GUIDE.md](DEMO_GUIDE.md)** - UI demo and feature walkthrough

---

## 🚀 Deployment

### For Admins: Setting Up for Your Organization

1. **AWS Infrastructure**
   - Follow [AWS_SETUP_INSTRUCTIONS.md](AWS_SETUP_INSTRUCTIONS.md)
   - Deploy Lambda function: [SCHEDULED_BACKUPS_SETUP.md](SCHEDULED_BACKUPS_SETUP.md)

2. **Create Users in Cognito**
   - Add users via AWS Cognito Console
   - Assign to "Admins" group if needed

3. **Distribute Configuration**
   - Generate JSON config for employees:
   ```json
   {
     "cognito_user_pool_id": "us-east-1_XXXXX",
     "cognito_app_client_id": "xxxxxxxxx",
     "cognito_identity_pool_id": "us-east-1:xxxx-yyyy",
     "cognito_region": "us-east-1",
     "bucket_name": "your-bucket-name",
     "lambda_api_url": "https://xxxxx.execute-api.us-east-1.amazonaws.com/prod/create-user"
   }
   ```

4. **Distribute App**
   - Build production release
   - Provide DMG to employees
   - Share configuration JSON

---

## 🎯 Current Status

### ✅ Working Features
- Cognito authentication (login, MFA, password reset)
- Dual credential system (temporary + permanent)
- Manual backups with preview
- Scheduled backups (macOS only)
- Cloud file browser
- S3 folder isolation
- Multi-language support (EN/ES)
- Dependency auto-installation

### ⚠️ Platform Limitations
- **macOS**: Full support (manual + scheduled backups)
- **Windows**: Manual backups only (scheduled not implemented)
- **Linux**: Manual backups only (scheduled not implemented)

### 🚧 Known TODOs
- Windows Task Scheduler integration
- Linux systemd timer integration
- `.user-info.json` creation on first backup
- Automated testing suite
- Production release builds

See [NEXT_STEPS.md](NEXT_STEPS.md) for complete roadmap.

---

## 🐛 Issues & Support

Report bugs and feature requests:
- **GitHub Issues**: [lavoz-cloud/issues](https://github.com/rodrygo03/lavoz-cloud/issues)
- **Email**: support@yourcompany.com (if applicable)

---

## 📄 License

[Add your license here]

---

## 🙏 Acknowledgments

Built with:
- [Tauri](https://tauri.app/) - Desktop application framework
- [React](https://react.dev/) - UI framework
- [rclone](https://rclone.org/) - Cloud storage sync
- [AWS Cognito](https://aws.amazon.com/cognito/) - Authentication
- [AWS Lambda](https://aws.amazon.com/lambda/) - Serverless functions

---

**Version History**:
- **v0.2.0** (Oct 2025) - Added scheduled backups with IAM credentials
- **v0.1.0** (Oct 2025) - Initial release with Cognito auth and manual backups
