import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { UserSession } from '../types';
import * as cognitoAuth from '../services/cognitoAuth';
import CognitoLoginView, { type LoginScreen } from './CognitoLoginView';

interface CognitoLoginProps {
  onLoginSuccess: (session: UserSession) => void;
}

export default function CognitoLogin({ onLoginSuccess }: CognitoLoginProps) {
  const { i18n } = useTranslation();
  const [screen, setScreen] = useState<LoginScreen>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  // const [mfaCode, setMfaCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [requirePhone, setRequirePhone] = useState(false);

  useEffect(() => {
    const config = {
      cognito_user_pool_id: import.meta.env.VITE_COGNITO_USER_POOL_ID,
      cognito_app_client_id: import.meta.env.VITE_COGNITO_APP_CLIENT_ID,
      cognito_identity_pool_id: import.meta.env.VITE_COGNITO_IDENTITY_POOL_ID,
      cognito_region: import.meta.env.VITE_COGNITO_REGION,
      bucket_name: import.meta.env.VITE_BUCKET_NAME,
      lambda_api_url: import.meta.env.VITE_LAMBDA_API_URL,
    };

    if (!config.cognito_user_pool_id || !config.cognito_app_client_id || !config.cognito_region) {
      console.error("[CognitoLogin] Missing required environment variables. Please check your .env file.");
      return;
    }

    cognitoAuth.initializeCognito({
      userPoolId: config.cognito_user_pool_id,
      clientId: config.cognito_app_client_id,
      region: config.cognito_region,
    });

    localStorage.setItem("app_config", JSON.stringify(config));
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }

    setIsLoggingIn(true);
    setError('');

    try {
      const session = await cognitoAuth.signIn(email, password);
      onLoginSuccess(session);
    } catch (e: any) {
      console.error('Login error:', e);

      // if (e?.code === 'SOFTWARE_TOKEN_MFA' || e?.message === 'MFA_REQUIRED') {
      //   setScreen('mfa');
      //   setIsLoggingIn(false);
      //   return;
      // }

      if (e?.code === 'NEW_PASSWORD_REQUIRED' || e?.message === 'NEW_PASSWORD_REQUIRED') {
        const attrs = e?.requiredAttributes || [];
        setRequirePhone(attrs.includes('phone_number'));
        setScreen('newPassword');
        setIsLoggingIn(false);
        return;
      }

      setError(e?.message || 'Invalid email or password. Please try again.');
      setIsLoggingIn(false);
    }
  };

  const handleNewPasswordSubmit = async () => {
    if (!newPassword || newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (requirePhone && !phoneNumber) {
      setError('Phone number is required');
      return;
    }

    setIsLoggingIn(true);
    setError('');

    try {
      const attributes: { [key: string]: string } = {};
      if (phoneNumber) {
        attributes.phone_number = phoneNumber;
      }

      const session = await cognitoAuth.completeNewPasswordChallenge(newPassword, attributes);
      onLoginSuccess(session);
    } catch (e: any) {
      setError(e?.message || 'Failed to set new password. Please try again.');
      setIsLoggingIn(false);
    }
  };

  // const handleMfaSubmit = async () => {
  //   if (!mfaCode || mfaCode.length !== 6) {
  //     setError('Please enter a valid 6-digit MFA code');
  //     return;
  //   }
  //
  //   setIsLoggingIn(true);
  //   setError('');
  //
  //   try {
  //     const session = await cognitoAuth.confirmMFA(mfaCode);
  //     onLoginSuccess(session);
  //   } catch (e: any) {
  //     setError('Invalid MFA code. Please try again.');
  //     setIsLoggingIn(false);
  //   }
  // };

  const handleBack = () => {
    setScreen('login');
    // setMfaCode('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
  };

  const languageToggle = (
    <div style={{ display: 'flex', gap: '8px' }}>
      <button
        style={{
          padding: '4px 8px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          background: i18n.language === 'en' ? '#007bff' : '#fff',
          color: i18n.language === 'en' ? '#fff' : '#000',
          cursor: 'pointer'
        }}
        onClick={() => {
          i18n.changeLanguage('en');
          localStorage.setItem('i18nextLng', 'en');
        }}
      >
        EN
      </button>
      <button
        style={{
          padding: '4px 8px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          background: i18n.language === 'es' ? '#007bff' : '#fff',
          color: i18n.language === 'es' ? '#fff' : '#000',
          cursor: 'pointer'
        }}
        onClick={() => {
          i18n.changeLanguage('es');
          localStorage.setItem('i18nextLng', 'es');
        }}
      >
        ES
      </button>
    </div>
  );

  return (
    <CognitoLoginView
      screen={screen}
      email={email}
      onEmailChange={setEmail}
      password={password}
      onPasswordChange={setPassword}
      showPassword={showPassword}
      onTogglePassword={() => setShowPassword(!showPassword)}
      // mfaCode={mfaCode}
      // onMfaCodeChange={setMfaCode}
      newPassword={newPassword}
      onNewPasswordChange={setNewPassword}
      confirmPassword={confirmPassword}
      onConfirmPasswordChange={setConfirmPassword}
      phoneNumber={phoneNumber}
      onPhoneNumberChange={setPhoneNumber}
      requirePhone={requirePhone}
      error={error}
      isLoggingIn={isLoggingIn}
      onLogin={handleLogin}
      // onMfaSubmit={handleMfaSubmit}
      onNewPasswordSubmit={handleNewPasswordSubmit}
      onBack={handleBack}
      onForgotPassword={() => {
        alert('Password reset will be handled through AWS Cognito. Contact your administrator for assistance.');
      }}
      languageToggle={languageToggle}
    />
  );
}
