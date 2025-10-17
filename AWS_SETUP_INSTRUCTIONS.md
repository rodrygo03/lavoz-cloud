# AWS Configuration for User-Based Folder Structure

## Overview
The app organizes S3 storage using Cognito user IDs with metadata for identification:
- **Structure**: `s3://your-bucket/users/{cognito-user-id}/`
- **Metadata**: Each folder will contain a `.user-info.json` file with user email
- **Admin users**: Can access entire bucket (no prefix restriction)
- **Regular users**: Restricted to their own folder only

**Why use Cognito user ID instead of email?**
- IAM policies can only use `${cognito-identity.amazonaws.com:sub}` (user ID)
- User IDs never change, emails might
- More secure and aligned with AWS best practices

---

## Required AWS Changes

### 1. Cognito Identity Pool - IAM Role Policy

You need to update the **authenticated role** policy attached to your Cognito Identity Pool.

#### Steps:
1. Go to **AWS Console → Cognito → Identity Pools**
2. Select your identity pool: `us-east-1:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
3. Click **"Edit identity pool"** → **"Authentication providers"**
4. Note the **"Authenticated role"** ARN (something like `Cognito_YourPoolAuth_Role`)
5. Go to **IAM → Roles** and find that role
6. Edit the inline policy or create a new one with this JSON:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowListBucketForOwnPrefix",
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::lavoz-backupapp-demo",
      "Condition": {
        "StringLike": {
          "s3:prefix": [
            "users/${cognito-identity.amazonaws.com:sub}/*",
            "users/${cognito-identity.amazonaws.com:sub}"
          ]
        }
      }
    },
    {
      "Sid": "AllowUserFolderAccess",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:GetObjectVersion",
        "s3:PutObject",
        "s3:PutObjectAcl",
        "s3:DeleteObject",
        "s3:DeleteObjectVersion",
        "s3:AbortMultipartUpload",
        "s3:ListMultipartUploadParts"
      ],
      "Resource": "arn:aws:s3:::lavoz-backupapp-demo/users/${cognito-identity.amazonaws.com:sub}/*"
    }
  ]
}
```

**Important Notes:**
- Replace `lavoz-backupapp-demo` with your actual bucket name
- The variable `${cognito-identity.amazonaws.com:sub}` will be automatically replaced with the user's Cognito sub (user ID) at runtime
- This ensures users can ONLY access their own folder

---

### 2. Admin Users - Enhanced Permissions

For admin users in the "Admins" group, you need to create a separate IAM policy.

#### Option A: Update Cognito Group Role (Recommended)

1. Go to **Cognito → User Pools → Your Pool → Groups**
2. Select the **"Admins"** group
3. Check the IAM role attached to this group
4. If no role exists, create one: `CognitoAdminRole`
5. Attach this policy to the admin role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AdminFullBucketAccess",
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:ListBucketVersions",
        "s3:GetBucketLocation"
      ],
      "Resource": "arn:aws:s3:::lavoz-backupapp-demo"
    },
    {
      "Sid": "AdminFullObjectAccess",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:GetObjectVersion",
        "s3:PutObject",
        "s3:PutObjectAcl",
        "s3:DeleteObject",
        "s3:DeleteObjectVersion",
        "s3:AbortMultipartUpload",
        "s3:ListMultipartUploadParts"
      ],
      "Resource": "arn:aws:s3:::lavoz-backupapp-demo/*"
    }
  ]
}
```

---

### 3. Cognito User Pool - Custom Attributes (Optional)

If you want to use email as the folder name (instead of Cognito sub), you need to configure claims in your Identity Pool.

#### Steps:
1. Go to **Cognito → Identity Pools → Your Pool**
2. Click **"Edit identity pool"**
3. Expand **"Authentication providers"** → **"Cognito"**
4. Under **"Authenticated role selection"**, choose **"Choose role with rules"**
5. Add a rule:
   - **Claim**: `cognito:groups`
   - **Matched value**: `Admins`
   - **Role**: Select your admin IAM role
6. Set the default authenticated role for non-admin users

---

### 4. Test the Configuration

After making these changes, test with:

#### Test as Regular User:
```bash
# This should work (user's own folder)
aws s3 ls s3://lavoz-backupapp-demo/users/user@company.com/ --profile test-user

# This should be DENIED (another user's folder)
aws s3 ls s3://lavoz-backupapp-demo/users/otheruser@company.com/ --profile test-user
```

#### Test as Admin:
```bash
# This should work (entire bucket)
aws s3 ls s3://lavoz-backupapp-demo/ --profile admin-user

# This should work (any user's folder)
aws s3 ls s3://lavoz-backupapp-demo/users/anyuser@company.com/ --profile admin-user
```

---

## Summary of Changes

| Change | Location | Action Required |
|--------|----------|-----------------|
| **User folder structure** | S3 Bucket | No action - folders created automatically on first backup |
| **Identity Pool IAM Role** | Cognito Identity Pool → Authenticated Role | Update policy JSON (see above) |
| **Admin permissions** | Cognito User Pool → Admins Group → IAM Role | Create/update admin role policy |
| **Testing** | AWS CLI or Console | Verify users can only access their folders |

---

## Important Notes

1. **Existing data**: If you already have data in S3 with the old structure (using Cognito user IDs), you'll need to migrate it to the new email-based structure.

2. **Email changes**: If a user changes their email, they'll lose access to their old folder. You'd need to manually rename the S3 folder.

3. **Special characters in emails**: The app sanitizes email addresses for use in S3 paths (removes or replaces special characters if needed).

4. **Cognito Identity Pool**: The `${cognito-identity.amazonaws.com:sub}` variable is the Cognito user ID, NOT the email. To use email-based folders, you'd need to pass the email as a custom claim.

---

## Alternative: Use Email in IAM Policy (More Complex)

If you want to use the actual email address in the IAM policy instead of Cognito sub:

1. Configure your Identity Pool to pass email as a custom attribute
2. Update the IAM policy to use:
   ```json
   "Resource": "arn:aws:s3:::lavoz-backupapp-demo/users/${cognito-identity.amazonaws.com:email}/*"
   ```

This requires additional Cognito configuration and is more advanced. Let me know if you need help with this approach.
