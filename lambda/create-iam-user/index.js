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
  console.log('Received event:', JSON.stringify(event, null, 2));

  try {
    // Parse request
    const { cognito_user_id, email, id_token } = JSON.parse(event.body);

    if (!cognito_user_id || !email || !id_token) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'Missing required fields: cognito_user_id, email, id_token'
        })
      };
    }

    console.log(`Processing request for user: ${email} (${cognito_user_id})`);

    // STEP 1: Validate Cognito token and extract groups (security!)
    console.log('Validating Cognito token...');
    await validateCognitoToken(id_token, cognito_user_id);
    console.log('Token validated successfully');

    // Extract groups from ID token
    const groups = extractGroupsFromToken(id_token);
    const isAdmin = groups.includes('Admin');
    console.log('User groups:', groups);
    console.log('Is admin:', isAdmin);

    // STEP 2: Check if IAM user already exists
    const iamUsername = `backup-user-${cognito_user_id}`;
    console.log(`Checking if IAM user exists: ${iamUsername}`);

    try {
      const existingUser = await iam.send(new GetUserCommand({ UserName: iamUsername }));
      console.log(`IAM user ${iamUsername} already exists`);

      // User exists - return message (can't retrieve existing access keys)
      // In production, you'd store keys in DynamoDB or Secrets Manager
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
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
      console.log('IAM user does not exist, proceeding to create');
    }

    // STEP 3: Create IAM user
    console.log(`Creating IAM user: ${iamUsername}`);
    await iam.send(new CreateUserCommand({
      UserName: iamUsername,
      Tags: [
        { Key: 'CognitoUserId', Value: cognito_user_id },
        { Key: 'Email', Value: email },
        { Key: 'CreatedBy', Value: 'CloudBackupApp' },
        { Key: 'CreatedAt', Value: new Date().toISOString() }
      ]
    }));
    console.log('IAM user created successfully');

    // STEP 4: Attach S3 policy (different policies for admin vs regular users)
    console.log('Attaching S3 policy...');
    const bucketName = process.env.BUCKET_NAME || 'lavoz-backupapp-demo';

    let policy;
    if (isAdmin) {
      // Admin users get access to their own folder AND can see all other admin folders
      console.log('Creating admin policy for admins/ folder with cross-admin visibility');
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
      console.log('Creating regular user policy for users/ folder');
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
    console.log('S3 policy attached successfully');

    // STEP 5: Create access key
    console.log('Creating access key...');
    const accessKeyResponse = await iam.send(new CreateAccessKeyCommand({
      UserName: iamUsername
    }));

    const accessKey = accessKeyResponse.AccessKey.AccessKeyId;
    const secretKey = accessKeyResponse.AccessKey.SecretAccessKey;
    console.log(`Access key created: ${accessKey}`);

    // STEP 6: Return credentials with appropriate prefix
    const s3Prefix = isAdmin ? `admins/${cognito_user_id}` : `users/${cognito_user_id}`;
    console.log('Returning credentials with s3_prefix:', s3Prefix);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
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
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: error.message,
        error_type: error.name
      })
    };
  }
};

async function validateCognitoToken(idToken, expectedUserId) {
  // Verify the token is valid and belongs to the claimed user
  try {
    const response = await cognito.send(new CognitoGetUserCommand({
      AccessToken: idToken  // Note: Using AccessToken, not IdToken
    }));

    const userId = response.UserAttributes.find(
      attr => attr.Name === 'sub'
    )?.Value;

    if (userId !== expectedUserId) {
      throw new Error('Token user ID mismatch - possible security violation');
    }

    return true;
  } catch (err) {
    console.error('Token validation failed:', err);
    throw new Error(`Invalid Cognito token: ${err.message}`);
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
    console.log('Extracted groups from token:', groups);

    return groups;
  } catch (err) {
    console.error('Failed to extract groups from token:', err);
    return [];
  }
}
