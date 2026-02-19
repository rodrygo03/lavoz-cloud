import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import CloudBrowser from './components/CloudBrowser';
import Settings from './components/Settings';
import UserManagement from './components/UserManagement';
import CognitoLogin from './components/CognitoLogin';
import { Profile, UserSession } from './types';
import './i18n';
import "./App.css";

function App() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [userSession, setUserSession] = useState<UserSession | null>(null);

  const loadProfiles = async () => {
    try {
      // Only load profile if we have a session
      if (userSession) {
        await loadUserProfile(userSession);
      }
    } catch (error) {
      console.error('Failed to load profiles:', error);
    }
  };

  const handleLoginSuccess = async (session: UserSession) => {
    setUserSession(session);
    await loadUserProfile(session);
  };

  const loadUserProfile = async (session: UserSession) => {
    try {
      // Get app config for bucket name and Cognito config
      const configStr = localStorage.getItem('app_config');
      if (!configStr) {
        console.error('No app config found');
        alert('App configuration not found. Please configure the app first.');
        return;
      }

      const appConfig = JSON.parse(configStr);
      const isAdmin = session.groups.includes('Admin');

      // Get temporary AWS credentials from Cognito Identity Pool (for manual backups)
      const { getTemporaryCredentials } = await import('./services/awsCredentials');
      const tempCreds = await getTemporaryCredentials(
        appConfig.cognito_identity_pool_id,
        appConfig.cognito_region,
        session.idToken
      );
      // Get or create IAM credentials (for scheduled backups)
      if (appConfig.lambda_api_url) {
        try {
          const { getOrCreateIAMCredentials, setLambdaApiUrl } = await import('./services/iamCredentials');
          setLambdaApiUrl(appConfig.lambda_api_url);

          await getOrCreateIAMCredentials(
            session.userId,
            session.email,
            session.accessToken  // Use access token for Lambda
          );
        } catch (iamError) {
          console.warn('Failed to get IAM credentials (scheduled backups will not work):', iamError);
          // Continue without IAM credentials - manual backups will still work
        }
      } else {
        console.warn('Lambda API URL not configured - scheduled backups will not work');
      }

      // Auto-create or get existing profile for this user
      const profile = await invoke<Profile>('get_or_create_user_profile', {
        userId: session.userId,
        email: session.email,
        isAdmin,
        bucket: appConfig.bucket_name || 'company-backups',
        accessKeyId: tempCreds.accessKeyId,
        secretAccessKey: tempCreds.secretAccessKey,
        sessionToken: tempCreds.sessionToken,
        region: appConfig.cognito_region,
      });

      setProfiles([profile]);
      setActiveProfile(profile);

    } catch (error) {
      console.error('Failed to load user profile - FULL ERROR:', error);
      alert(`Failed to load user profile: ${error}`);
    }
  };

  const handleLogout = () => {
    // No need to remove from localStorage since we don't store it anymore
    setUserSession(null);
    setProfiles([]);
    setActiveProfile(null);
  };

  const handleProfileSelected = async (profile: Profile) => {
    try {
      await invoke('set_active_profile', { profileId: profile.id });
      setActiveProfile(profile);
    } catch (error) {
      console.error('Failed to set active profile:', error);
    }
  };

  // Show Cognito login if no user session
  if (!userSession) {
    return <CognitoLogin onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <Router>
      <div className="app">
        <Sidebar
          profiles={profiles}
          activeProfile={activeProfile}
          onProfileSelect={handleProfileSelected}
          onNewProfile={() => {}}
          onProfilesUpdated={loadProfiles}
          userSession={userSession}
          onLogout={handleLogout}
        />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route 
              path="/dashboard" 
              element={
                <Dashboard 
                  profile={activeProfile} 
                  onProfileUpdated={loadProfiles}
                />
              } 
            />
            <Route 
              path="/cloud-browser" 
              element={
                <CloudBrowser 
                  profile={activeProfile}
                />
              } 
            />
            <Route 
              path="/settings" 
              element={
                <Settings 
                  profile={activeProfile}
                  onProfileUpdated={loadProfiles}
                />
              } 
            />
            <Route 
              path="/user-management" 
              element={
                <UserManagement 
                  profile={activeProfile}
                />
              } 
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
