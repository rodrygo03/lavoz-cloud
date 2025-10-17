import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { LogIn, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { UserSession } from '../types';
import * as cognitoAuth from '../services/cognitoAuth';

interface CognitoLoginProps {
  onLoginSuccess: (session: UserSession) => void;
}

export default function CognitoLogin({ onLoginSuccess }: CognitoLoginProps) {
  const { i18n } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [needsMfa, setNeedsMfa] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [needsNewPassword, setNeedsNewPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [requiredAttributes, setRequiredAttributes] = useState<any>(null);

  useEffect(() => {
    // Initialize Cognito with config from localStorage
    const configStr = localStorage.getItem('app_config');
    if (configStr) {
      const config = JSON.parse(configStr);
      cognitoAuth.initializeCognito({
        userPoolId: config.cognito_user_pool_id,
        clientId: config.cognito_app_client_id,
        region: config.cognito_region,
      });
    }
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }

    setIsLoggingIn(true);
    setError('');

    try {
      // Real Cognito authentication
      const session = await cognitoAuth.signIn(email, password);

      // No need to store session - user logs in fresh each time
      onLoginSuccess(session);
    } catch (e: any) {
      console.error('Login error:', e);

      // Check if MFA is required
      if (e?.code === 'SOFTWARE_TOKEN_MFA' || e?.message === 'MFA_REQUIRED') {
        setNeedsMfa(true);
        setIsLoggingIn(false);
        return;
      }

      // Check if new password is required
      if (e?.code === 'NEW_PASSWORD_REQUIRED' || e?.message === 'NEW_PASSWORD_REQUIRED') {
        setRequiredAttributes(e?.requiredAttributes || []);
        setNeedsNewPassword(true);
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

    // Check if phone number is required
    if (requiredAttributes && requiredAttributes.includes('phone_number') && !phoneNumber) {
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
      // No need to store session - user logs in fresh each time
      onLoginSuccess(session);
    } catch (e: any) {
      setError(e?.message || 'Failed to set new password. Please try again.');
      setIsLoggingIn(false);
    }
  };

  const handleMfaSubmit = async () => {
    if (!mfaCode || mfaCode.length !== 6) {
      setError('Please enter a valid 6-digit MFA code');
      return;
    }

    setIsLoggingIn(true);
    setError('');

    try {
      // Real Cognito MFA confirmation
      const session = await cognitoAuth.confirmMFA(mfaCode);

      // No need to store session - user logs in fresh each time
      onLoginSuccess(session);
    } catch (e: any) {
      setError('Invalid MFA code. Please try again.');
      setIsLoggingIn(false);
    }
  };

  const LanguageToggle = () => (
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

  if (needsNewPassword) {
    return (
      <div className="setup-type-selection">
        <div className="selection-container" style={{ maxWidth: '450px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '2rem' }}>
            <div></div>
            <LanguageToggle />
          </div>

          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: '48px', marginBottom: '1rem' }}>🔑</div>
            <h1>Set New Password</h1>
            <p>Please choose a new password for your account</p>
          </div>

          <div className="space-y-6">
            {requiredAttributes && requiredAttributes.includes('phone_number') && (
              <div className="form-group">
                <label htmlFor="phone-number">Phone Number</label>
                <input
                  id="phone-number"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1234567890"
                  autoFocus
                />
                <div className="help-text" style={{ fontSize: '12px', marginTop: '4px', color: '#666' }}>
                  Include country code (e.g., +1 for US)
                </div>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="new-password">New Password</label>
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                autoFocus={!requiredAttributes || !requiredAttributes.includes('phone_number')}
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirm-password">Confirm Password</label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                onKeyDown={(e) => e.key === 'Enter' && !isLoggingIn && handleNewPasswordSubmit()}
              />
            </div>

            <div className="info-box" style={{ fontSize: '13px' }}>
              <AlertCircle size={14} />
              <div>
                <p style={{ margin: 0 }}>Password must be at least 8 characters long</p>
              </div>
            </div>

            {error && (
              <div className="error-message" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <button
              className="btn btn-primary btn-large"
              onClick={handleNewPasswordSubmit}
              disabled={isLoggingIn}
              style={{ width: '100%' }}
            >
              {isLoggingIn ? (
                <>
                  <div className="loading-spinner" style={{ width: '16px', height: '16px', marginRight: '8px' }}></div>
                  Setting Password...
                </>
              ) : (
                'Set New Password'
              )}
            </button>

            <button
              className="btn btn-secondary"
              onClick={() => {
                setNeedsNewPassword(false);
                setNewPassword('');
                setConfirmPassword('');
                setError('');
              }}
              style={{ width: '100%' }}
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (needsMfa) {
    return (
      <div className="setup-type-selection">
        <div className="selection-container" style={{ maxWidth: '450px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '2rem' }}>
            <div></div>
            <LanguageToggle />
          </div>

          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: '48px', marginBottom: '1rem' }}>🔐</div>
            <h1>Two-Factor Authentication</h1>
            <p>Enter the 6-digit code from your authenticator app</p>
          </div>

          <div className="space-y-6">
            <div className="form-group">
              <label htmlFor="mfa-code">MFA Code</label>
              <input
                id="mfa-code"
                type="text"
                value={mfaCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setMfaCode(value);
                }}
                placeholder="000000"
                maxLength={6}
                style={{
                  fontSize: '24px',
                  letterSpacing: '0.5em',
                  textAlign: 'center',
                  fontFamily: 'monospace'
                }}
                autoFocus
              />
            </div>

            {error && (
              <div className="error-message" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <button
              className="btn btn-primary btn-large"
              onClick={handleMfaSubmit}
              disabled={isLoggingIn || mfaCode.length !== 6}
              style={{ width: '100%' }}
            >
              {isLoggingIn ? (
                <>
                  <div className="loading-spinner" style={{ width: '16px', height: '16px', marginRight: '8px' }}></div>
                  Verifying...
                </>
              ) : (
                'Verify Code'
              )}
            </button>

            <button
              className="btn btn-secondary"
              onClick={() => {
                setNeedsMfa(false);
                setMfaCode('');
                setError('');
              }}
              style={{ width: '100%' }}
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="setup-type-selection">
      <div className="selection-container" style={{ maxWidth: '450px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '2rem' }}>
          <div></div>
          <LanguageToggle />
        </div>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '48px', marginBottom: '1rem' }}>☁️</div>
          <h1>Cloud Backup</h1>
          <p>Sign in to access your backups</p>
        </div>

        <div className="space-y-6">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@company.com"
              autoComplete="email"
              disabled={isLoggingIn}
              onKeyDown={(e) => e.key === 'Enter' && !isLoggingIn && handleLogin()}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={isLoggingIn}
                onKeyDown={(e) => e.key === 'Enter' && !isLoggingIn && handleLogin()}
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  color: '#666'
                }}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="error-message" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <button
            className="btn btn-primary btn-large"
            onClick={handleLogin}
            disabled={isLoggingIn}
            style={{ width: '100%' }}
          >
            {isLoggingIn ? (
              <>
                <div className="loading-spinner" style={{ width: '16px', height: '16px', marginRight: '8px' }}></div>
                Signing In...
              </>
            ) : (
              <>
                <LogIn size={16} style={{ marginRight: '8px' }} />
                Sign In
              </>
            )}
          </button>

          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                alert('Password reset will be handled through AWS Cognito. Contact your administrator for assistance.');
              }}
              style={{
                color: '#007bff',
                textDecoration: 'none',
                fontSize: '14px'
              }}
            >
              Forgot your password?
            </a>
          </div>
        </div>

        <div className="info-box" style={{ marginTop: '2rem', fontSize: '13px' }}>
          <AlertCircle size={14} />
          <div>
            <p style={{ margin: 0 }}>
              <strong>First time signing in?</strong> Use the email and temporary password provided by your administrator.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
