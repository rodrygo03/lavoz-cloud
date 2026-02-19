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

// Rate limiting: track last Lambda invocation time (persisted across app reloads)
const LAMBDA_RATE_LIMIT_KEY = 'lambda_last_call';
const LAMBDA_MIN_INTERVAL_MS = 10_000; // 10 seconds between calls

function getLastLambdaCall(): number {
  const stored = sessionStorage.getItem(LAMBDA_RATE_LIMIT_KEY);
  return stored ? parseInt(stored, 10) : 0;
}

function setLastLambdaCall(timestamp: number) {
  sessionStorage.setItem(LAMBDA_RATE_LIMIT_KEY, timestamp.toString());
}

export function setLambdaApiUrl(url: string) {
  // Enforce HTTPS to prevent credential transmission over plain HTTP
  if (url && !url.startsWith('https://')) {
    throw new Error('Lambda API URL must use HTTPS');
  }
  LAMBDA_API_URL = url;
}

export async function getOrCreateIAMCredentials(
  cognitoUserId: string,
  email: string,
  accessToken: string  // Use access token, not ID token
): Promise<IAMCredentials> {
  // Check if we already have stored credentials
  const stored = await invoke<IAMCredentials | null>('get_stored_iam_credentials', {
    userId: cognitoUserId
  });

  if (stored) {
    // Create scheduled rclone config with stored credentials
    await invoke('create_scheduled_rclone_config', {
      credentials: stored
    });

    return stored;
  }

  // Validate Lambda URL is configured
  if (!LAMBDA_API_URL) {
    throw new Error('Lambda API URL not configured. Please set it in app configuration.');
  }

  // Rate limit: prevent rapid repeated Lambda calls (survives app reload via sessionStorage)
  const now = Date.now();
  if (now - getLastLambdaCall() < LAMBDA_MIN_INTERVAL_MS) {
    throw new Error('Please wait before requesting new credentials. Try again in a few seconds.');
  }
  setLastLambdaCall(now);

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

    // Store credentials locally
    await invoke('store_iam_credentials', {
      userId: cognitoUserId,
      credentials
    });

    // Create scheduled rclone config
    await invoke('create_scheduled_rclone_config', {
      credentials
    });

    return credentials;

  } catch (error) {
    // Reset rate limit on failure so user can retry sooner
    setLastLambdaCall(0);
    throw new Error(`Failed to create IAM user: ${error}`);
  }
}

export async function deleteStoredCredentials(cognitoUserId: string): Promise<void> {
  await invoke('delete_iam_credentials', {
    userId: cognitoUserId
  });
}
