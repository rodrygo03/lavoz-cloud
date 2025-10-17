# Lambda Function Deployment Guide

## Overview
This Lambda function automatically creates IAM users for authenticated Cognito users, enabling scheduled backups without the app being open.

## Prerequisites
- AWS CLI installed and configured
- AWS account with permissions to create:
  - Lambda functions
  - IAM roles
  - API Gateway
  - IAM users (Lambda needs this permission)

## Deployment Steps

### Option 1: Manual Deployment (AWS Console)

#### Step 1: Install Dependencies
```bash
cd lambda/create-iam-user
npm install
```

#### Step 2: Create Deployment Package
```bash
zip -r function.zip index.js node_modules package.json
```

#### Step 3: Create Lambda Function
1. Go to AWS Console → Lambda
2. Click "Create function"
3. Choose "Author from scratch"
4. **Function name**: `CreateBackupIAMUser`
5. **Runtime**: Node.js 18.x
6. **Architecture**: x86_64
7. Click "Create function"

#### Step 4: Upload Code
1. In the Lambda function page, go to "Code" tab
2. Click "Upload from" → ".zip file"
3. Upload the `function.zip` you created
4. Click "Save"

#### Step 5: Configure Environment Variables
1. Go to "Configuration" → "Environment variables"
2. Add the following:
   - `AWS_REGION`: `us-east-1` (or your region)
   - `BUCKET_NAME`: `lavoz-backupapp-demo`
3. Click "Save"

#### Step 6: Increase Timeout
1. Go to "Configuration" → "General configuration"
2. Click "Edit"
3. **Timeout**: 30 seconds
4. Click "Save"

#### Step 7: Attach IAM Permissions
1. Go to "Configuration" → "Permissions"
2. Click on the **execution role** link (opens IAM console)
3. Click "Add permissions" → "Create inline policy"
4. Use JSON editor and paste:

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
      "Action": [
        "cognito-idp:GetUser"
      ],
      "Resource": "*"
    }
  ]
}
```

5. Click "Review policy"
6. **Name**: `LambdaBackupUserManagement`
7. Click "Create policy"

#### Step 8: Create API Gateway
1. Go to AWS Console → API Gateway
2. Click "Create API"
3. Choose "REST API" (not private)
4. Click "Build"
5. **API name**: `BackupUserAPI`
6. **Endpoint Type**: Regional
7. Click "Create API"

#### Step 9: Create Resource and Method
1. Click "Actions" → "Create Resource"
   - **Resource Name**: `create-user`
   - **Resource Path**: `/create-user`
   - **Enable API Gateway CORS**: ✅ Check this
   - Click "Create Resource"

2. Select the `/create-user` resource
3. Click "Actions" → "Create Method"
4. Choose "POST" from dropdown
5. Click the checkmark

#### Step 10: Configure POST Method
1. **Integration type**: Lambda Function
2. **Use Lambda Proxy integration**: ✅ Check this
3. **Lambda Region**: us-east-1 (your region)
4. **Lambda Function**: `CreateBackupIAMUser`
5. Click "Save"
6. Click "OK" on permission prompt

#### Step 11: Enable CORS
1. Select the `/create-user` resource
2. Click "Actions" → "Enable CORS"
3. Keep default settings
4. Click "Enable CORS and replace existing CORS headers"
5. Click "Yes, replace existing values"

#### Step 12: Deploy API
1. Click "Actions" → "Deploy API"
2. **Deployment stage**: [New Stage]
3. **Stage name**: `prod`
4. Click "Deploy"

#### Step 13: Get API URL
1. After deployment, you'll see "Invoke URL" at the top
2. Copy this URL (e.g., `https://abc123.execute-api.us-east-1.amazonaws.com/prod`)
3. Your endpoint will be: `https://abc123.execute-api.us-east-1.amazonaws.com/prod/create-user`
4. **Save this URL** - you'll need it in the app configuration

---

### Option 2: AWS CLI Deployment

```bash
# Navigate to lambda directory
cd lambda/create-iam-user

# Install dependencies
npm install

# Create deployment package
zip -r function.zip index.js node_modules package.json

# Create IAM role for Lambda
aws iam create-role \
  --role-name LambdaBackupUserRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "lambda.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

# Attach permissions
aws iam put-role-policy \
  --role-name LambdaBackupUserRole \
  --policy-name LambdaBackupUserManagement \
  --policy-document file://iam-policy.json

# Attach basic execution role
aws iam attach-role-policy \
  --role-name LambdaBackupUserRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

# Get role ARN (save this for next step)
aws iam get-role --role-name LambdaBackupUserRole --query 'Role.Arn' --output text

# Create Lambda function (replace ROLE_ARN with output from previous command)
aws lambda create-function \
  --function-name CreateBackupIAMUser \
  --runtime nodejs18.x \
  --role ROLE_ARN \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --timeout 30 \
  --environment Variables="{AWS_REGION=us-east-1,BUCKET_NAME=lavoz-backupapp-demo}"

# Create API Gateway (more complex - recommend using console for this)
```

---

## Testing the Lambda Function

### Test 1: Using AWS Console
1. Go to Lambda → CreateBackupIAMUser → Test tab
2. Create new test event:
```json
{
  "body": "{\"cognito_user_id\":\"test-user-123\",\"email\":\"test@example.com\",\"id_token\":\"your-actual-id-token-here\"}"
}
```
3. Click "Test"
4. Check response

### Test 2: Using curl (after API Gateway is set up)
```bash
# Replace with your actual API URL and valid Cognito token
curl -X POST https://your-api-url.execute-api.us-east-1.amazonaws.com/prod/create-user \
  -H "Content-Type: application/json" \
  -d '{
    "cognito_user_id": "c44894c8-8021-7093-eec3-7c72d4cfedf9",
    "email": "rodrigoorozco025@gmail.com",
    "id_token": "YOUR_ACTUAL_ID_TOKEN_FROM_COGNITO_LOGIN"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "iam_username": "backup-user-c44894c8-8021-7093-eec3-7c72d4cfedf9",
  "access_key_id": "AKIA...",
  "secret_access_key": "...",
  "region": "us-east-1",
  "bucket": "lavoz-backupapp-demo",
  "s3_prefix": "users/c44894c8-8021-7093-eec3-7c72d4cfedf9"
}
```

---

## Security Notes

1. **Token Validation**: Lambda validates Cognito tokens before creating IAM users
2. **Least Privilege**: IAM users only get access to their S3 folder
3. **CloudTrail**: All IAM user creations are logged
4. **Access Key Rotation**: Consider implementing periodic key rotation

---

## Troubleshooting

### Error: "Invalid Cognito token"
- Make sure you're using the **access token**, not the ID token
- Token might be expired (tokens last ~1 hour)

### Error: "Failed to create IAM user"
- Check Lambda execution role has IAM permissions
- Check CloudWatch Logs for detailed error

### Error: "CORS error"
- Make sure you enabled CORS on API Gateway
- Redeploy the API after CORS changes

---

## Next Steps

After deploying the Lambda:
1. Copy the API Gateway URL
2. Update the app configuration with this URL
3. Test by logging into the app - it should automatically create your IAM user
4. Verify IAM user was created in AWS Console → IAM → Users
