import { CognitoIdentityClient } from "@aws-sdk/client-cognito-identity";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-provider-cognito-identity";
import { TemporaryCredentials } from '../types';

export async function getTemporaryCredentials(
  identityPoolId: string,
  region: string,
  idToken: string
): Promise<TemporaryCredentials> {
  const client = new CognitoIdentityClient({ region });

  const credentialsProvider = fromCognitoIdentityPool({
    client,
    identityPoolId,
    logins: {
      [`cognito-idp.${region}.amazonaws.com/${getUserPoolId()}`]: idToken,
    },
  });

  const credentials = await credentialsProvider();

  return {
    accessKeyId: credentials.accessKeyId,
    secretAccessKey: credentials.secretAccessKey,
    sessionToken: credentials.sessionToken || '',
    expiration: credentials.expiration?.toISOString() || '',
  };
}

function getUserPoolId(): string {
  const configStr = localStorage.getItem('app_config');
  if (!configStr) {
    throw new Error('App configuration not found');
  }
  const config = JSON.parse(configStr);
  return config.cognito_user_pool_id;
}
