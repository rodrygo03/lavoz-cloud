import { LogIn, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Button, FormGroup, AlertBox, LoadingSpinner } from '../components/ui';

export type LoginScreen = 'login' | /* 'mfa' | */ 'newPassword';

export interface CognitoLoginViewProps {
  screen: LoginScreen;

  // Login fields
  email: string;
  onEmailChange: (value: string) => void;
  password: string;
  onPasswordChange: (value: string) => void;
  showPassword: boolean;
  onTogglePassword: () => void;

  // MFA fields
  // mfaCode: string;
  // onMfaCodeChange: (value: string) => void;

  // New password fields
  newPassword: string;
  onNewPasswordChange: (value: string) => void;
  confirmPassword: string;
  onConfirmPasswordChange: (value: string) => void;
  phoneNumber: string;
  onPhoneNumberChange: (value: string) => void;
  requirePhone: boolean;

  // Shared state
  error: string;
  isLoggingIn: boolean;

  // Actions
  onLogin: () => void;
  // onMfaSubmit: () => void;
  onNewPasswordSubmit: () => void;
  onBack: () => void;
  onForgotPassword: () => void;

  // Branding
  logo?: React.ReactNode;
  title?: string;
  subtitle?: string;

  // Language toggle
  languageToggle?: React.ReactNode;
}

export default function CognitoLoginViewAlt2({
  screen,
  email,
  onEmailChange,
  password,
  onPasswordChange,
  showPassword,
  onTogglePassword,
  // mfaCode,
  // onMfaCodeChange,
  newPassword,
  onNewPasswordChange,
  confirmPassword,
  onConfirmPasswordChange,
  phoneNumber,
  onPhoneNumberChange,
  requirePhone,
  error,
  isLoggingIn,
  onLogin,
  // onMfaSubmit,
  onNewPasswordSubmit,
  onBack,
  onForgotPassword,
  logo,
  title = 'Cloud Backup',
  subtitle = 'Sign in to access your backups',
  languageToggle,
}: CognitoLoginViewProps) {

  if (screen === 'newPassword') {
    return (
      <div className="setup-type-selection">
        <div className="selection-container" style={{ maxWidth: '450px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '2rem' }}>
            <div></div>
            {languageToggle}
          </div>

          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              {logo ?? <div style={{ fontSize: '48px', marginBottom: '1rem' }}>🔑</div>}
            </div>
            {/* <h1>Set New Password</h1> */}
            <p>Please choose a new password for your account</p>
          </div>

          <div className="space-y-6">
            {requirePhone && (
              <FormGroup
                label="Phone Number"
                htmlFor="phone-number"
                helpText="Include country code (e.g., +1 for US)"
              >
                <input
                  id="phone-number"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => onPhoneNumberChange(e.target.value)}
                  placeholder="+1234567890"
                  autoFocus
                />
              </FormGroup>
            )}

            <FormGroup label="New Password" htmlFor="new-password">
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => onNewPasswordChange(e.target.value)}
                placeholder="Enter new password"
                autoFocus={!requirePhone}
              />
            </FormGroup>

            <FormGroup label="Confirm Password" htmlFor="confirm-password">
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => onConfirmPasswordChange(e.target.value)}
                placeholder="Confirm new password"
                onKeyDown={(e) => e.key === 'Enter' && !isLoggingIn && onNewPasswordSubmit()}
              />
            </FormGroup>

            <AlertBox variant="info" icon={<AlertCircle size={14} />} style={{ fontSize: '13px' }}>
              <div>
                <p style={{ margin: 0 }}>Password must be at least 8 characters long</p>
              </div>
            </AlertBox>

            {error && (
              <AlertBox variant="error" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} />
                {error}
              </AlertBox>
            )}

            <Button
              variant="primary"
              size="large"
              onClick={onNewPasswordSubmit}
              disabled={isLoggingIn}
              style={{ width: '100%' }}
            >
              {isLoggingIn ? (
                <>
                  <LoadingSpinner size="small" style={{ marginRight: '8px' }} />
                  Setting Password...
                </>
              ) : (
                'Set New Password'
              )}
            </Button>

            <Button
              variant="secondary"
              onClick={onBack}
              style={{ width: '100%' }}
            >
              Back to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // if (screen === 'mfa') {
  //   return (
  //     <div className="setup-type-selection">
  //       <div className="selection-container" style={{ maxWidth: '450px' }}>
  //         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '2rem' }}>
  //           <div></div>
  //           {languageToggle}
  //         </div>
  //
  //         <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
  //           {logo ?? <div style={{ fontSize: '48px', marginBottom: '1rem' }}>🔐</div>}
  //           <h1>Two-Factor Authentication</h1>
  //           <p>Enter the 6-digit code from your authenticator app</p>
  //         </div>
  //
  //         <div className="space-y-6">
  //           <FormGroup label="MFA Code" htmlFor="mfa-code">
  //             <input
  //               id="mfa-code"
  //               type="text"
  //               value={mfaCode}
  //               onChange={(e) => {
  //                 const value = e.target.value.replace(/\D/g, '').slice(0, 6);
  //                 onMfaCodeChange(value);
  //               }}
  //               placeholder="000000"
  //               maxLength={6}
  //               style={{
  //                 fontSize: '24px',
  //                 letterSpacing: '0.5em',
  //                 textAlign: 'center',
  //                 fontFamily: 'monospace'
  //               }}
  //               autoFocus
  //             />
  //           </FormGroup>
  //
  //           {error && (
  //             <AlertBox variant="error" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
  //               <AlertCircle size={16} />
  //               {error}
  //             </AlertBox>
  //           )}
  //
  //           <Button
  //             variant="primary"
  //             size="large"
  //             onClick={onMfaSubmit}
  //             disabled={isLoggingIn || mfaCode.length !== 6}
  //             style={{ width: '100%' }}
  //           >
  //             {isLoggingIn ? (
  //               <>
  //                 <LoadingSpinner size="small" style={{ marginRight: '8px' }} />
  //                 Verifying...
  //               </>
  //             ) : (
  //               'Verify Code'
  //             )}
  //           </Button>
  //
  //           <Button
  //             variant="secondary"
  //             onClick={onBack}
  //             style={{ width: '100%' }}
  //           >
  //             Back to Login
  //           </Button>
  //         </div>
  //       </div>
  //     </div>
  //   );
  // }

  // Default: login screen
  return (
    <div className="setup-type-selection">
      <div className="selection-container" style={{ maxWidth: '450px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '2rem' }}>
          <div></div>
          {languageToggle}
        </div>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          {logo ?? <div style={{ fontSize: '48px', marginBottom: '1rem' }}>☁️</div>}
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>

        <div className="space-y-6">
          <FormGroup label="Email" htmlFor="email">
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="your.email@company.com"
              autoComplete="email"
              disabled={isLoggingIn}
              onKeyDown={(e) => e.key === 'Enter' && !isLoggingIn && onLogin()}
            />
          </FormGroup>

          <FormGroup label="Password" htmlFor="password">
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={isLoggingIn}
                onKeyDown={(e) => e.key === 'Enter' && !isLoggingIn && onLogin()}
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={onTogglePassword}
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
          </FormGroup>

          {error && (
            <AlertBox variant="error" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} />
              {error}
            </AlertBox>
          )}

          <Button
            variant="primary"
            size="large"
            onClick={onLogin}
            disabled={isLoggingIn}
            style={{ width: '100%' }}
          >
            {isLoggingIn ? (
              <>
                <LoadingSpinner size="small" style={{ marginRight: '8px' }} />
                Signing In...
              </>
            ) : (
              <>
                <LogIn size={16} style={{ marginRight: '8px' }} />
                Sign In
              </>
            )}
          </Button>

          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onForgotPassword();
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

        <AlertBox variant="info" icon={<AlertCircle size={14} />} style={{ marginTop: '2rem', fontSize: '13px' }}>
          <div>
            <p style={{ margin: 0 }}>
              <strong>First time signing in?</strong> Use the email and temporary password provided by your administrator.
            </p>
          </div>
        </AlertBox>
      </div>
    </div>
  );
}
