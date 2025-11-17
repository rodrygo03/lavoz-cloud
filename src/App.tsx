import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useTranslation } from 'react-i18next';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import CloudBrowser from './components/CloudBrowser';
import Settings from './components/Settings';
import UserManagement from './components/UserManagement';
import CognitoLogin from './components/CognitoLogin';
import DependencyDownloader from './components/DependencyDownloader';
import { Profile, UserSession } from './types';
import './i18n';
import "./App.css";

function App() {
  const { t } = useTranslation();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [dependenciesReady, setDependenciesReady] = useState(false);
  const [checkingDependencies, setCheckingDependencies] = useState(true);

  useEffect(() => {
    checkDependenciesAndLoadSession();
  }, []);

  const checkDependenciesAndLoadSession = async () => {
    try {
      console.log('Checking if dependencies need to be downloaded...');
      // Check if dependencies need to be downloaded
      const needsDownload = await invoke<boolean>('check_dependencies_needed');
      console.log('Dependencies needed:', needsDownload);

      if (!needsDownload) {
        // Dependencies already installed, proceed normally
        console.log('Dependencies already installed, proceeding...');
        setDependenciesReady(true);
        setCheckingDependencies(false);
        setLoading(false);
        // No session loading - user must login each time
      } else {
        // Need to download dependencies
        console.log('Need to download dependencies, showing downloader...');
        setCheckingDependencies(false);
        setLoading(false);
      }
    } catch (error) {
      console.error('Failed to check dependencies:', error);
      setCheckingDependencies(false);
      setLoading(false);
      // Set dependencies as ready to proceed anyway
      setDependenciesReady(true);
    }
  };

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
      console.log('App config loaded:', {
        identityPoolId: appConfig.cognito_identity_pool_id,
        region: appConfig.cognito_region,
        bucket: appConfig.bucket_name,
        lambdaApiUrl: appConfig.lambda_api_url
      });

      const isAdmin = session.groups.includes('Admin');
      console.log('User is admin:', isAdmin);

      // Get temporary AWS credentials from Cognito Identity Pool (for manual backups)
      console.log('Getting temporary AWS credentials...');
      const { getTemporaryCredentials } = await import('./services/awsCredentials');
      const tempCreds = await getTemporaryCredentials(
        appConfig.cognito_identity_pool_id,
        appConfig.cognito_region,
        session.idToken
      );
      console.log('Temporary credentials obtained');

      // Get or create IAM credentials (for scheduled backups)
      let iamCreds = null;
      if (appConfig.lambda_api_url) {
        try {
          console.log('Getting IAM credentials for scheduled backups...');
          const { getOrCreateIAMCredentials, setLambdaApiUrl } = await import('./services/iamCredentials');
          setLambdaApiUrl(appConfig.lambda_api_url);

          iamCreds = await getOrCreateIAMCredentials(
            session.userId,
            session.email,
            session.accessToken  // Use access token for Lambda
          );
          console.log('IAM credentials obtained:', iamCreds.iam_username);
        } catch (iamError) {
          console.warn('Failed to get IAM credentials (scheduled backups will not work):', iamError);
          // Continue without IAM credentials - manual backups will still work
        }
      } else {
        console.warn('Lambda API URL not configured - scheduled backups will not work');
      }

      // Auto-create or get existing profile for this user
      console.log('Creating/loading user profile...');
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

      console.log('User profile loaded/created successfully:', profile);

      if (iamCreds) {
        console.log('✅ Scheduled backups enabled with IAM credentials');
      } else {
        console.log('⚠️  Scheduled backups disabled - only manual backups available');
      }
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

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  console.log('Render state:', { checkingDependencies, dependenciesReady, loading });

  if (checkingDependencies) {
    console.log('Showing loading screen');
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  if (!dependenciesReady) {
    console.log('Showing dependency downloader');
    return <DependencyDownloader onDownloadComplete={() => {
      console.log('Download completed, setting dependencies ready');
      setDependenciesReady(true);
      // Don't load session - user will login
    }} />;
  }

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
