import { LogIn, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Button, FormGroup, AlertBox, LoadingSpinner } from '../components/ui';
import type { CognitoLoginViewProps } from '../components/CognitoLoginView';

const GRADIENT = 'linear-gradient(135deg, #0f2b46 0%, #1a4a7a 40%, #2d7dd2 100%)';

const styles = {
  wrapper: {
    display: 'flex',
    minHeight: '100vh',
  } as React.CSSProperties,

  leftPanel: {
    flex: 1,
    background: GRADIENT,
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '3rem 2rem',
    position: 'relative',
    overflow: 'hidden',
  } as React.CSSProperties,

  decorCircle: (size: number, top: string, left: string, opacity: number): React.CSSProperties => ({
    position: 'absolute',
    width: size,
    height: size,
    borderRadius: '50%',
    border: '1px solid rgba(255,255,255,0.12)',
    top,
    left,
    opacity,
    pointerEvents: 'none',
  }),

  brandLogo: {
    marginBottom: '1.5rem',
    position: 'relative',
    zIndex: 1,
    width: 96,
    height: 96,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  } as React.CSSProperties,

  brandTitle: {
    fontSize: '2rem',
    fontWeight: 700,
    margin: '0 0 0.5rem',
    position: 'relative',
    zIndex: 1,
    textAlign: 'center',
  } as React.CSSProperties,

  brandSubtitle: {
    fontSize: '1.05rem',
    opacity: 0.85,
    margin: 0,
    position: 'relative',
    zIndex: 1,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 1.5,
  } as React.CSSProperties,

  rightPanel: {
    flex: 1,
    background: '#fff',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '2rem',
    position: 'relative',
  } as React.CSSProperties,

  langCorner: {
    position: 'absolute',
    top: '1rem',
    right: '1rem',
  } as React.CSSProperties,

  formContainer: {
    width: '100%',
    maxWidth: 400,
  } as React.CSSProperties,

  formHeading: {
    fontSize: '1.5rem',
    fontWeight: 600,
    margin: '0 0 0.25rem',
    color: '#1a1a1a',
  } as React.CSSProperties,

  formSub: {
    fontSize: '0.9rem',
    color: '#666',
    margin: '0 0 1.75rem',
  } as React.CSSProperties,
};

function ResponsiveStyle() {
  return (
    <style>{`
      .alt-login-wrapper {
        display: flex;
        min-height: 100vh;
      }
      @media (max-width: 768px) {
        .alt-login-wrapper {
          flex-direction: column !important;
        }
        .alt-login-wrapper > .alt-left-panel {
          min-height: 200px !important;
          flex: 0 0 auto !important;
          padding: 2rem 1.5rem !important;
        }
        .alt-login-wrapper > .alt-right-panel {
          flex: 1 1 auto !important;
          padding: 2rem 1.5rem !important;
        }
      }
      .alt-brand-logo img {
        width: 96px;
        height: 96px;
        object-fit: contain;
      }
    `}</style>
  );
}

export default function CognitoLoginViewAlt({
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

  let heading = title;
  let sub = subtitle;
  let defaultEmoji = '\u2601\uFE0F';

  // if (screen === 'mfa') {
  //   heading = 'Two-Factor Authentication';
  //   sub = 'Enter the 6-digit code from your authenticator app';
  //   defaultEmoji = '\uD83D\uDD10';
  // } else if (screen === 'newPassword') {
  if (screen === 'newPassword') {
    heading = 'Set New Password';
    sub = 'Please choose a new password for your account';
    defaultEmoji = '\uD83D\uDD11';
  }

  return (
    <>
      <ResponsiveStyle />
      <div className="alt-login-wrapper" style={styles.wrapper}>
        {/* ===== LEFT PANEL — branding ===== */}
        <div className="alt-left-panel" style={styles.leftPanel}>
          <div style={styles.decorCircle(300, '-60px', '-80px', 0.5)} />
          <div style={styles.decorCircle(200, '60%', '70%', 0.35)} />
          <div style={styles.decorCircle(120, '30%', '-30px', 0.25)} />

          <div className="alt-brand-logo" style={styles.brandLogo}>
            {logo !== undefined && logo !== null
              ? logo
              : <div style={{ fontSize: 72 }}>{defaultEmoji}</div>}
          </div>
          <h1 style={styles.brandTitle}>{title}</h1>
          <p style={styles.brandSubtitle}>{subtitle}</p>
        </div>

        {/* ===== RIGHT PANEL — form ===== */}
        <div className="alt-right-panel" style={styles.rightPanel}>
          {languageToggle && <div style={styles.langCorner}>{languageToggle}</div>}

          <div style={styles.formContainer}>
            <h2 style={styles.formHeading}>{heading}</h2>
            <p style={styles.formSub}>{sub}</p>

            {/* --- LOGIN --- */}
            {screen === 'login' && (
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
                        color: '#666',
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
                    style={{ color: '#2d7dd2', textDecoration: 'none', fontSize: '14px' }}
                  >
                    Forgot your password?
                  </a>
                </div>

                <AlertBox variant="info" icon={<AlertCircle size={14} />} style={{ marginTop: '1.5rem', fontSize: '13px' }}>
                  <div>
                    <p style={{ margin: 0 }}>
                      <strong>First time signing in?</strong> Use the email and temporary password provided by your administrator.
                    </p>
                  </div>
                </AlertBox>
              </div>
            )}

            {/* --- MFA --- */}
            {/* {screen === 'mfa' && (
              <div className="space-y-6">
                <FormGroup label="MFA Code" htmlFor="mfa-code">
                  <input
                    id="mfa-code"
                    type="text"
                    value={mfaCode}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                      onMfaCodeChange(value);
                    }}
                    placeholder="000000"
                    maxLength={6}
                    style={{
                      fontSize: '24px',
                      letterSpacing: '0.5em',
                      textAlign: 'center',
                      fontFamily: 'monospace',
                    }}
                    autoFocus
                  />
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
                  onClick={onMfaSubmit}
                  disabled={isLoggingIn || mfaCode.length !== 6}
                  style={{ width: '100%' }}
                >
                  {isLoggingIn ? (
                    <>
                      <LoadingSpinner size="small" style={{ marginRight: '8px' }} />
                      Verifying...
                    </>
                  ) : (
                    'Verify Code'
                  )}
                </Button>

                <Button variant="secondary" onClick={onBack} style={{ width: '100%' }}>
                  Back to Login
                </Button>
              </div>
            )} */}

            {/* --- NEW PASSWORD --- */}
            {screen === 'newPassword' && (
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

                <Button variant="secondary" onClick={onBack} style={{ width: '100%' }}>
                  Back to Login
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
