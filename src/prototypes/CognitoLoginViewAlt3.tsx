import { LogIn, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Button, FormGroup, AlertBox, LoadingSpinner } from '../components/ui';
import type { CognitoLoginViewProps } from '../components/CognitoLoginView';

const GRADIENT = 'linear-gradient(135deg, #0f2b46 0%, #1a4a7a 40%, #2d7dd2 100%)';

const styles = {
  backdrop: {
    minHeight: '100vh',
    background: GRADIENT,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    padding: '2rem',
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

  card: {
    position: 'relative',
    zIndex: 1,
    background: 'rgba(255,255,255,0.95)',
    backdropFilter: 'blur(12px)',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
    width: '100%',
    maxWidth: 450,
    padding: '2.5rem 2rem',
  } as React.CSSProperties,

  langRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginBottom: '1.5rem',
  } as React.CSSProperties,

  brandCenter: {
    textAlign: 'center',
    marginBottom: '2rem',
  } as React.CSSProperties,

  heading: {
    fontSize: '1.5rem',
    fontWeight: 600,
    margin: '0 0 0.25rem',
    color: '#1a1a1a',
  } as React.CSSProperties,

  sub: {
    fontSize: '0.9rem',
    color: '#666',
    margin: 0,
  } as React.CSSProperties,
};

export default function CognitoLoginViewAlt3({
  screen,
  email,
  onEmailChange,
  password,
  onPasswordChange,
  showPassword,
  onTogglePassword,
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
      <div style={styles.backdrop}>
        <div style={styles.decorCircle(300, '-60px', '-80px', 0.5)} />
        <div style={styles.decorCircle(200, '60%', '70%', 0.35)} />
        <div style={styles.decorCircle(120, '30%', '-30px', 0.25)} />
        <div style={styles.decorCircle(400, '70%', '50%', 0.2)} />
        <div style={styles.decorCircle(160, '10%', '80%', 0.3)} />

        <div style={styles.card}>
          {languageToggle && <div style={styles.langRow}>{languageToggle}</div>}

          <div style={styles.brandCenter as React.CSSProperties}>
            <div style={{ marginBottom: '1rem' }}>
              {logo ?? <div style={{ fontSize: '48px', marginBottom: '1rem' }}>🔑</div>}
            </div>
            <h1 style={styles.heading}>Set New Password</h1>
            <p style={styles.sub}>Please choose a new password for your account</p>
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

            <Button variant="secondary" onClick={onBack} style={{ width: '100%' }}>
              Back to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Default: login screen
  return (
    <div style={styles.backdrop}>
      <div style={styles.decorCircle(300, '-60px', '-80px', 0.5)} />
      <div style={styles.decorCircle(200, '60%', '70%', 0.35)} />
      <div style={styles.decorCircle(120, '30%', '-30px', 0.25)} />
      <div style={styles.decorCircle(400, '70%', '50%', 0.2)} />
      <div style={styles.decorCircle(160, '10%', '80%', 0.3)} />

      <div style={styles.card}>
        {languageToggle && <div style={styles.langRow}>{languageToggle}</div>}

        <div style={styles.brandCenter as React.CSSProperties}>
          <div style={{ marginBottom: '1rem' }}>
            {logo ?? <div style={{ fontSize: '48px', marginBottom: '1rem' }}>☁️</div>}
          </div>
          <h1 style={styles.heading}>{title}</h1>
          <p style={styles.sub}>{subtitle}</p>
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
              style={{ color: '#7fb8f0', textDecoration: 'none', fontSize: '14px' }}
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
