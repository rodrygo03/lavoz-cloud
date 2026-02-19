const {
  IAMClient,
  CreateUserCommand,
  PutUserPolicyCommand,
  CreateAccessKeyCommand,
  GetUserCommand
} = require("@aws-sdk/client-iam");
const {
  CognitoIdentityProviderClient,
  GetUserCommand: CognitoGetUserCommand
} = require("@aws-sdk/client-cognito-identity-provider");

const iam = new IAMClient({ region: process.env.AWS_REGION });
const cognito = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

  try {
    // Parse request
    const { cognito_user_id, email, id_token } = JSON.parse(event.body);

    if (!cognito_user_id || !email || !id_token) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': ALLOWED_ORIGIN
        },
        body: JSON.stringify({
          success: false,
          error: 'Missing required fields: cognito_user_id, email, id_token'
        })
      };
    }

    // STEP 1: Validate Cognito token and extract groups (security!)
    await validateCognitoToken(id_token, cognito_user_id);

    // Extract groups from ID token
    const groups = extractGroupsFromToken(id_token);
    const isAdmin = groups.includes('Admin');

    // STEP 2: Check if IAM user already exists
    const iamUsername = `backup-user-${cognito_user_id}`;

    try {
      await iam.send(new GetUserCommand({ UserName: iamUsername }));

      // User exists - return message (can't retrieve existing access keys)
      // In production, you'd store keys in DynamoDB or Secrets Manager
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': ALLOWED_ORIGIN
        },
        body: JSON.stringify({
          success: false,
          user_exists: true,
          message: "IAM user already exists. If you lost your credentials, contact your administrator to generate new access keys.",
          iam_username: iamUsername
        })
      };
    } catch (err) {
      if (err.name !== 'NoSuchEntity' && err.name !== 'NoSuchEntityException') {
        throw err;
      }
    }

    // STEP 3: Create IAM user
    await iam.send(new CreateUserCommand({
      UserName: iamUsername,
      Tags: [
        { Key: 'CognitoUserId', Value: cognito_user_id },
        { Key: 'Email', Value: email },
        { Key: 'CreatedBy', Value: 'CloudBackupApp' },
        { Key: 'CreatedAt', Value: new Date().toISOString() }
      ]
    }));

    // STEP 4: Attach S3 policy (different policies for admin vs regular users)
    const bucketName = process.env.BUCKET_NAME;
    if (!bucketName) {
      throw new Error('BUCKET_NAME environment variable is not configured');
    }

    let policy;
    if (isAdmin) {
      // Admin users get access to their own folder AND can see all other admin folders
      policy = {
        Version: "2012-10-17",
        Statement: [
          {
            Sid: "AllowListAllAdminFolders",
            Effect: "Allow",
            Action: "s3:ListBucket",
            Resource: `arn:aws:s3:::${bucketName}`,
            Condition: {
              StringLike: {
                "s3:prefix": [
                  "admins/*",
                  "admins"
                ]
              }
            }
          },
          {
            Sid: "AllowFullAccessAllAdminFolders",
            Effect: "Allow",
            Action: [
              "s3:GetObject",
              "s3:GetObjectVersion",
              "s3:PutObject",
              "s3:PutObjectAcl",
              "s3:DeleteObject",
              "s3:DeleteObjectVersion",
              "s3:AbortMultipartUpload",
              "s3:ListMultipartUploadParts"
            ],
            Resource: `arn:aws:s3:::${bucketName}/admins/*`
          }
        ]
      };
    } else {
      // Regular users get access to their user folder
      policy = {
        Version: "2012-10-17",
        Statement: [
          {
            Sid: "AllowListOwnFolder",
            Effect: "Allow",
            Action: "s3:ListBucket",
            Resource: `arn:aws:s3:::${bucketName}`,
            Condition: {
              StringLike: {
                "s3:prefix": [
                  `users/${cognito_user_id}/*`,
                  `users/${cognito_user_id}`
                ]
              }
            }
          },
          {
            Sid: "AllowAccessOwnFolder",
            Effect: "Allow",
            Action: [
              "s3:GetObject",
              "s3:GetObjectVersion",
              "s3:PutObject",
              "s3:PutObjectAcl",
              "s3:DeleteObject",
              "s3:DeleteObjectVersion",
              "s3:AbortMultipartUpload",
              "s3:ListMultipartUploadParts"
            ],
            Resource: `arn:aws:s3:::${bucketName}/users/${cognito_user_id}/*`
          }
        ]
      };
    }

    await iam.send(new PutUserPolicyCommand({
      UserName: iamUsername,
      PolicyName: "BackupS3Access",
      PolicyDocument: JSON.stringify(policy)
    }));

    // STEP 5: Create access key
    const accessKeyResponse = await iam.send(new CreateAccessKeyCommand({
      UserName: iamUsername
    }));

    const accessKey = accessKeyResponse.AccessKey.AccessKeyId;
    const secretKey = accessKeyResponse.AccessKey.SecretAccessKey;

    // STEP 6: Return credentials with appropriate prefix
    const s3Prefix = isAdmin ? `admins/${cognito_user_id}` : `users/${cognito_user_id}`;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': ALLOWED_ORIGIN
      },
      body: JSON.stringify({
        success: true,
        iam_username: iamUsername,
        access_key_id: accessKey,
        secret_access_key: secretKey,
        region: process.env.AWS_REGION || 'us-east-1',
        bucket: bucketName,
        s3_prefix: s3Prefix
      })
    };

  } catch (error) {
    console.error('Lambda error for request');
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': ALLOWED_ORIGIN
      },
      body: JSON.stringify({
        success: false,
        error: 'An internal error occurred. Please try again later.'
      })
    };
  }
};

async function validateCognitoToken(accessToken, expectedUserId) {
  // Verify the token is valid and belongs to the claimed user
  // Note: CognitoGetUserCommand requires an AccessToken (not an IdToken)
  try {
    const response = await cognito.send(new CognitoGetUserCommand({
      AccessToken: accessToken
    }));

    const userId = response.UserAttributes.find(
      attr => attr.Name === 'sub'
    )?.Value;

    if (userId !== expectedUserId) {
      throw new Error('Token user ID mismatch - possible security violation');
    }

    return true;
  } catch (err) {
    console.error('Token validation failed');
    throw new Error('Invalid or expired Cognito token');
  }
}

function extractGroupsFromToken(idToken) {
  // Decode JWT token to extract cognito:groups claim
  // JWT format: header.payload.signature
  try {
    const parts = idToken.split('.');
    if (parts.length !== 3) {
      console.warn('Invalid JWT token format');
      return [];
    }

    // Decode the payload (second part)
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64').toString('utf8')
    );

    // Extract cognito:groups claim
    const groups = payload['cognito:groups'] || [];

    return groups;
  } catch (err) {
    console.error('Failed to extract groups from token');
    return [];
  }
}
