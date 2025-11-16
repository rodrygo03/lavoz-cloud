import { invoke } from '@tauri-apps/api/core';

export interface IAMCredentials {
  access_key_id: string;
  secret_access_key: string;
  region: string;
  iam_username: string;
  bucket: string;
  s3_prefix: string;
}

// This will be set from app configuration
let LAMBDA_API_URL: string | null = null;

export function setLambdaApiUrl(url: string) {
  LAMBDA_API_URL = url;
  console.log('Lambda API URL set to:', url);
}

export async function getOrCreateIAMCredentials(
  cognitoUserId: string,
  email: string,
  accessToken: string  // Use access token, not ID token
): Promise<IAMCredentials> {
  console.log('Getting or creating IAM credentials for user:', email);

  // Check if we already have stored credentials
  const stored = await invoke<IAMCredentials | null>('get_stored_iam_credentials', {
    userId: cognitoUserId
  });

  if (stored) {
    console.log('Using stored IAM credentials:', stored.iam_username);

    // Create scheduled rclone config with stored credentials
    await invoke('create_scheduled_rclone_config', {
      credentials: stored
    });

    return stored;
  }

  console.log('No stored credentials found, calling Lambda to create IAM user...');

  // Validate Lambda URL is configured
  if (!LAMBDA_API_URL) {
    throw new Error('Lambda API URL not configured. Please set it in app configuration.');
  }

  // Call Lambda API to create IAM user
  try {
    const response = await fetch(LAMBDA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cognito_user_id: cognitoUserId,
        email: email,
        id_token: accessToken  // Lambda expects this field name
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('Lambda response:', data);

    if (!data.success) {
      if (data.user_exists) {
        throw new Error(
          'IAM user already exists but credentials are not stored locally. ' +
          'Please contact your administrator to generate new access keys.'
        );
      }
      throw new Error(data.error || 'Failed to create IAM user');
    }

    const credentials: IAMCredentials = {
      access_key_id: data.access_key_id,
      secret_access_key: data.secret_access_key,
      region: data.region,
      iam_username: data.iam_username,
      bucket: data.bucket,
      s3_prefix: data.s3_prefix
    };

    console.log('IAM user created successfully:', credentials.iam_username);

    // Store credentials locally
    await invoke('store_iam_credentials', {
      userId: cognitoUserId,
      credentials
    });

    // Create scheduled rclone config
    await invoke('create_scheduled_rclone_config', {
      credentials
    });

    console.log('IAM credentials stored and rclone config created');

    return credentials;

  } catch (error) {
    console.error('Failed to get IAM credentials:', error);
    throw new Error(`Failed to create IAM user: ${error}`);
  }
}

export async function deleteStoredCredentials(cognitoUserId: string): Promise<void> {
  await invoke('delete_iam_credentials', {
    userId: cognitoUserId
  });
  console.log('IAM credentials deleted for user:', cognitoUserId);
}
