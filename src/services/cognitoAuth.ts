import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserSession,
} from 'amazon-cognito-identity-js';
import { UserSession } from '../types';

let userPool: CognitoUserPool | null = null;
let currentUser: CognitoUser | null = null;

interface CognitoConfig {
  userPoolId: string;
  clientId: string;
  region: string;
}

export function initializeCognito(config: CognitoConfig) {
  const poolData = {
    UserPoolId: config.userPoolId,
    ClientId: config.clientId,
  };
  userPool = new CognitoUserPool(poolData);
}

export function signIn(email: string, password: string): Promise<UserSession> {
  return new Promise((resolve, reject) => {
    if (!userPool) {
      reject(new Error('Cognito not initialized'));
      return;
    }

    const authenticationData = {
      Username: email,
      Password: password,
    };

    const authenticationDetails = new AuthenticationDetails(authenticationData);

    const userData = {
      Username: email,
      Pool: userPool,
    };

    currentUser = new CognitoUser(userData);

    currentUser.authenticateUser(authenticationDetails, {
      onSuccess: (session: CognitoUserSession) => {
        const idToken = session.getIdToken();
        const payload = idToken.payload;

        const userSession: UserSession = {
          email: payload.email || email,
          userId: payload.sub,
          groups: payload['cognito:groups'] || [],
          idToken: idToken.getJwtToken(),
          accessToken: session.getAccessToken().getJwtToken(),
          refreshToken: session.getRefreshToken().getToken(),
        };

        resolve(userSession);
      },

      onFailure: (err) => {
        reject(err);
      },

      newPasswordRequired: (userAttributes, requiredAttributes) => {
        // User needs to set a new password
        const error: any = new Error('NEW_PASSWORD_REQUIRED');
        error.code = 'NEW_PASSWORD_REQUIRED';
        error.userAttributes = userAttributes;
        error.requiredAttributes = requiredAttributes;
        reject(error);
      },

      mfaRequired: (challengeName, challengeParameters) => {
        // MFA is required
        const error: any = new Error('MFA_REQUIRED');
        error.code = 'SOFTWARE_TOKEN_MFA';
        reject(error);
      },
    });
  });
}

export function completeNewPasswordChallenge(
  newPassword: string,
  attributes: { [key: string]: string }
): Promise<UserSession> {
  return new Promise((resolve, reject) => {
    if (!currentUser) {
      reject(new Error('No user session'));
      return;
    }

    currentUser.completeNewPasswordChallenge(
      newPassword,
      attributes,
      {
        onSuccess: (session: CognitoUserSession) => {
          const idToken = session.getIdToken();
          const payload = idToken.payload;

          const userSession: UserSession = {
            email: payload.email,
            userId: payload.sub,
            groups: payload['cognito:groups'] || [],
            idToken: idToken.getJwtToken(),
            accessToken: session.getAccessToken().getJwtToken(),
            refreshToken: session.getRefreshToken().getToken(),
          };

          resolve(userSession);
        },

        onFailure: (err) => {
          reject(err);
        },
      }
    );
  });
}

export function confirmMFA(mfaCode: string): Promise<UserSession> {
  return new Promise((resolve, reject) => {
    if (!currentUser) {
      reject(new Error('No user session'));
      return;
    }

    currentUser.sendMFACode(
      mfaCode,
      {
        onSuccess: (session: CognitoUserSession) => {
          const idToken = session.getIdToken();
          const payload = idToken.payload;

          const userSession: UserSession = {
            email: payload.email,
            userId: payload.sub,
            groups: payload['cognito:groups'] || [],
            idToken: idToken.getJwtToken(),
            accessToken: session.getAccessToken().getJwtToken(),
            refreshToken: session.getRefreshToken().getToken(),
          };

          resolve(userSession);
        },

        onFailure: (err) => {
          reject(err);
        },
      },
      'SOFTWARE_TOKEN_MFA'
    );
  });
}

export function signOut() {
  if (currentUser) {
    currentUser.signOut();
    currentUser = null;
  }
}

export function getCurrentUser(): CognitoUser | null {
  if (userPool) {
    return userPool.getCurrentUser();
  }
  return null;
}
