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
        await loadSession();
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
      await loadSession();
    }
  };

  const loadSession = async () => {
    try {
      // Check for existing session
      const sessionStr = localStorage.getItem('user_session');
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        setUserSession(session);
        await loadProfiles();
      }
    } catch (error) {
      console.error('Failed to load session:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProfiles = async () => {
    try {
      const profilesList = await invoke<Profile[]>('get_profiles');
      setProfiles(profilesList);
      
      const active = await invoke<Profile | null>('get_active_profile');
      setActiveProfile(active);
      
      if (profilesList.length === 0) {
        setShowSetup('none'); // Will show setup type selection
      }
    } catch (error) {
      console.error('Failed to load profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = (session: UserSession) => {
    setUserSession(session);
    loadProfiles();
  };

  const handleLogout = () => {
    localStorage.removeItem('user_session');
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
      loadSession();
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
