# Scheduled Backups with IAM Users - Complete Setup Guide

## Overview

This guide explains how to enable **scheduled backups** that run in the background without the app being open.

### The Problem
- Cognito temporary credentials expire after ~1 hour
- Scheduled backups run in the background (app might be closed)
- Expired credentials = failed backups

### The Solution
- **Manual Backups**: Use Cognito temporary credentials (secure, short-lived)
- **Scheduled Backups**: Use permanent IAM user credentials (created automatically via Lambda)

---

## Architecture

```
User Login (Cognito)
    ↓
App gets TWO credential sets:
    ├─→ Temporary Cognito Credentials (for manual backups when app is open)
    └─→ Permanent IAM Credentials (for scheduled backups)
        ↓
        Lambda Function creates IAM user
        ↓
        IAM credentials stored locally
        ↓
        Scheduled backups use IAM credentials
```

---

## Part 1: Deploy Lambda Function (One-Time Setup)

### Prerequisites
- AWS account with admin access
- AWS CLI installed (optional, for CLI deployment)

### Steps

#### 1. Install Lambda Dependencies
```bash
cd lambda/create-iam-user
npm install
```

#### 2. Create Deployment Package
```bash
zip -r function.zip index.js node_modules package.json
```

#### 3. Deploy Lambda Function

**Using AWS Console** (Easiest):

1. Go to **AWS Console → Lambda**
2. Click **"Create function"**
3. Settings:
   - Function name: `CreateBackupIAMUser`
   - Runtime: Node.js 18.x
   - Architecture: x86_64
4. Click **"Create function"**
5. Upload code:
   - Code tab → Upload from → .zip file
   - Upload `function.zip`
   - Click **"Save"**

#### 4. Configure Lambda

**Environment Variables:**
1. Configuration → Environment variables → Edit
2. Add:
   ```
   AWS_REGION = us-east-1
   BUCKET_NAME = lavoz-backupapp-demo
   ```

**Timeout:**
1. Configuration → General configuration → Edit
2. Set Timeout: **30 seconds**
3. Click **"Save"**

**IAM Permissions:**
1. Configuration → Permissions → Click execution role link
2. Add permissions → Create inline policy
3. Use JSON editor:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ManageIAMUsers",
      "Effect": "Allow",
      "Action": [
        "iam:CreateUser",
        "iam:GetUser",
        "iam:PutUserPolicy",
        "iam:CreateAccessKey",
        "iam:TagUser"
      ],
      "Resource": "arn:aws:iam::*:user/backup-user-*"
    },
    {
      "Sid": "ValidateCognitoTokens",
      "Effect": "Allow",
      "Action": "cognito-idp:GetUser",
      "Resource": "*"
    }
  ]
}
```
4. Name: `LambdaBackupUserManagement`
5. Click **"Create policy"**

#### 5. Create API Gateway

1. Go to **AWS Console → API Gateway**
2. Click **"Create API"**
3. Choose **"REST API"** (not private) → Build
4. Settings:
   - API name: `BackupUserAPI`
   - Endpoint Type: Regional
5. Click **"Create API"**

#### 6. Create Resource & Method

1. Actions → Create Resource:
   - Resource Name: `create-user`
   - Resource Path: `/create-user`
   - ✅ Enable API Gateway CORS
   - Create Resource

2. Select `/create-user` resource
3. Actions → Create Method → Choose **"POST"** → ✓

4. Configure POST method:
   - Integration type: Lambda Function
   - ✅ Use Lambda Proxy integration
   - Lambda Region: us-east-1
   - Lambda Function: `CreateBackupIAMUser`
   - Save → OK

5. Enable CORS:
   - Select `/create-user` resource
   - Actions → Enable CORS
   - Keep defaults
   - Enable CORS and replace existing CORS headers
   - Confirm

#### 7. Deploy API

1. Actions → Deploy API
2. Deployment stage: [New Stage]
3. Stage name: `prod`
4. Deploy

#### 8. Copy API URL

After deployment, you'll see **"Invoke URL"** at the top:
```
https://abc123xyz.execute-api.us-east-1.amazonaws.com/prod
```

Your full endpoint will be:
```
https://abc123xyz.execute-api.us-east-1.amazonaws.com/prod/create-user
```

**⚠️ SAVE THIS URL** - you'll need it in the next step!

---

## Part 2: Configure App to Use Lambda

### Option A: Manual Configuration (Current Users)

If you already have the app configured:

1. Open browser console (while app is running)
2. Run this command (replace with your Lambda URL):
```javascript
const config = JSON.parse(localStorage.getItem('app_config'));
config.lambda_api_url = 'https://YOUR-API-URL.execute-api.us-east-1.amazonaws.com/prod/create-user';
localStorage.setItem('app_config', JSON.stringify(config));
console.log('Lambda API URL configured!');
```

3. Restart the app

### Option B: Fresh Configuration (New Users)

The `ConfigSetup` component needs to be updated to include the Lambda API URL field.

Update `src/components/ConfigSetup.tsx` to include a field for `lambda_api_url` (future enhancement).

---

## Part 3: Test the Setup

### Test 1: Check Lambda is Working

Using curl (replace with your actual values):
```bash
curl -X POST https://YOUR-API-URL.execute-api.us-east-1.amazonaws.com/prod/create-user \
  -H "Content-Type: application/json" \
  -d '{
    "cognito_user_id": "test-123",
    "email": "test@example.com",
    "id_token": "YOUR-COGNITO-ACCESS-TOKEN-HERE"
  }'
```

Expected response:
```json
{
  "success": true,
  "iam_username": "backup-user-test-123",
  "access_key_id": "AKIA...",
  "secret_access_key": "...",
  "region": "us-east-1"
}
```

### Test 2: Login to App

1. Delete old profile (if exists):
   ```bash
   rm "/Users/YOUR-USERNAME/Library/Application Support/cloud-backup-app/config.json"
   ```

2. Launch app and login with Cognito

3. Check browser console for:
   ```
   Getting IAM credentials for scheduled backups...
   IAM credentials obtained: backup-user-XXXXX
   ✅ Scheduled backups enabled with IAM credentials
   ```

### Test 3: Verify IAM User Created

1. Go to **AWS Console → IAM → Users**
2. You should see: `backup-user-{cognito-user-id}`
3. Click on the user → Permissions → You should see `BackupS3Access` policy

### Test 4: Check Stored Credentials

```bash
# Check IAM credentials stored
cat "/Users/YOUR-USERNAME/Library/Application Support/cloud-backup-app/iam-YOUR-USER-ID.json"

# Check scheduled rclone config
cat "/Users/YOUR-USERNAME/Library/Application Support/cloud-backup-app/rclone-scheduled.conf"
```

You should see:
```ini
[aws]
type = s3
provider = AWS
env_auth = false
access_key_id = AKIA...
secret_access_key = ...
region = us-east-1
acl = private
```

### Test 5: Schedule a Backup

1. In app, go to Settings
2. Add a backup source (e.g., a test folder)
3. Enable scheduled backups (e.g., Daily at a future time)
4. Check the generated script:
```bash
cat "/Users/YOUR-USERNAME/Library/Application Support/cloud-backup-app/scripts/backup-PROFILE-ID.sh"
```

You should see:
```bash
RCLONE_CONFIG="/Users/YOUR-USERNAME/Library/Application Support/cloud-backup-app/rclone-scheduled.conf"
```

### Test 6: Manually Run Scheduled Script

```bash
# Run the backup script manually to test
"/Users/YOUR-USERNAME/Library/Application Support/cloud-backup-app/scripts/backup-PROFILE-ID.sh"

# Check the log
cat ~/.config/cloud-backup-app/logs/backup-PROFILE-ID.log
```

If successful, you should see backup progress in the log.

---

## How It Works

### First Login Flow:

1. User logs in with Cognito (email + password + MFA)
2. App gets Cognito temporary credentials
3. App calls Lambda: "Create IAM user for this Cognito user"
4. Lambda:
   - Validates Cognito token
   - Creates IAM user: `backup-user-{cognito-user-id}`
   - Attaches S3 policy (restricted to `users/{cognito-user-id}/`)
   - Generates access key
   - Returns credentials
5. App stores IAM credentials locally
6. App creates `rclone-scheduled.conf` with IAM credentials

### Subsequent Logins:

1. User logs in with Cognito
2. App finds stored IAM credentials
3. Uses stored credentials (no Lambda call needed)
4. Updates `rclone.conf` with fresh temporary credentials (for manual backups)

### Manual Backup (App Open):

```
User clicks "Backup Now"
    ↓
Uses rclone.conf (temporary Cognito credentials)
    ↓
Backup succeeds
```

### Scheduled Backup (App Closed):

```
LaunchAgent triggers at scheduled time
    ↓
Runs backup script
    ↓
Uses rclone-scheduled.conf (permanent IAM credentials)
    ↓
Backup succeeds
```

---

## Security Considerations

### ✅ Secure Aspects

1. **Token Validation**: Lambda validates Cognito tokens before creating IAM users
2. **Least Privilege**: IAM users only access their own S3 folder
3. **CloudTrail Logging**: All IAM user creations are logged
4. **No Admin Credentials on Client**: Admin credentials never leave AWS

### ⚠️ Known Limitations

1. **Unencrypted Storage**: IAM credentials currently stored as plain JSON
   - **TODO**: Encrypt using macOS Keychain / Windows Credential Manager
   - **Workaround**: File permissions restrict access to user's account only

2. **No Automatic Key Rotation**: IAM access keys don't expire
   - **TODO**: Implement periodic key rotation (Lambda can generate new keys)
   - **Workaround**: Admin can manually rotate keys in IAM console

3. **Lost Credentials**: If user loses credentials, must contact admin
   - **TODO**: Store encrypted credentials in S3 or DynamoDB
   - **Workaround**: Admin can generate new access key for the IAM user

---

## Troubleshooting

### Error: "Lambda API URL not configured"

**Solution**: Follow Part 2 to configure the Lambda URL in app config.

### Error: "Failed to create IAM user: Invalid Cognito token"

**Cause**: Using ID token instead of access token, or token expired.

**Solution**: App should use `session.accessToken`, not `session.idToken` when calling Lambda.

### Error: "IAM user already exists but credentials not stored"

**Cause**: IAM user was created but app lost the stored credentials.

**Solution**:
1. Go to AWS Console → IAM → Users → `backup-user-{user-id}`
2. Security credentials → Create access key
3. Manually create the JSON file:
```bash
cat > "/Users/YOUR-USERNAME/Library/Application Support/cloud-backup-app/iam-USER-ID.json" << 'EOF'
{
  "access_key_id": "AKIA...",
  "secret_access_key": "...",
  "region": "us-east-1",
  "iam_username": "backup-user-...",
  "bucket": "lavoz-backupapp-demo",
  "s3_prefix": "users/USER-ID"
}
EOF
```

### Scheduled Backup Not Running

1. Check LaunchAgent is loaded:
```bash
launchctl list | grep cloudbackup
```

2. Check LaunchAgent plist exists:
```bash
ls ~/Library/LaunchAgents/com.cloudbackup.*.plist
```

3. Check backup script exists:
```bash
ls "/Users/YOUR-USERNAME/Library/Application Support/cloud-backup-app/scripts/"
```

4. Check logs for errors:
```bash
cat ~/.config/cloud-backup-app/logs/backup-*.log
tail -f /tmp/backup-*.err
```

### Scheduled Backup Runs but Fails

1. Check rclone-scheduled.conf exists:
```bash
cat "/Users/YOUR-USERNAME/Library/Application Support/cloud-backup-app/rclone-scheduled.conf"
```

2. Test rclone manually:
```bash
/path/to/rclone ls aws:lavoz-backupapp-demo/users/YOUR-USER-ID/ \
  --config "/Users/YOUR-USERNAME/Library/Application Support/cloud-backup-app/rclone-scheduled.conf"
```

3. Check IAM permissions in AWS Console

---

## Cost Estimate

**AWS Lambda:**
- Free tier: 1M requests/month, 400,000 GB-seconds compute
- Your usage: ~100 users × 1 request = negligible cost
- Estimated cost: **$0.00/month**

**API Gateway:**
- Free tier: 1M requests/month
- Your usage: ~100 requests/month
- Estimated cost: **$0.00/month**

**IAM Users:**
- No charge

**Total: Essentially free** (well within free tier)

---

## Next Steps

1. ✅ Deploy Lambda function (Part 1)
2. ✅ Configure app with Lambda URL (Part 2)
3. ✅ Test complete flow (Part 3)
4. 🔲 Add credential encryption (future enhancement)
5. 🔲 Add automatic key rotation (future enhancement)
6. 🔲 Add Lambda URL field to ConfigSetup UI (future enhancement)

---

## Summary

With this setup:
- ✅ Users authenticate with Cognito (secure)
- ✅ Manual backups use temporary credentials (secure, short-lived)
- ✅ Scheduled backups use permanent IAM credentials (reliable)
- ✅ IAM users created automatically (no admin intervention)
- ✅ Each user isolated to their S3 folder (secure)
- ✅ Backups work even when app is closed (reliable)

Your scheduled backups will now work correctly without credential expiration issues!
