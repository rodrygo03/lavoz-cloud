import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useTranslation } from 'react-i18next';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import CloudBrowser from './components/CloudBrowser';
import Settings from './components/Settings';
import UserManagement from './components/UserManagement';
import AdminSetup from './components/AdminSetup';
import UserSetup from './components/UserSetup';
import DependencyChecker from './components/DependencyChecker';
import { Profile } from './types';
import './i18n';
import "./App.css";

function App() {
  const { t, i18n } = useTranslation();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState<'none' | 'admin' | 'user'>('none');
  const [dependenciesReady, setDependenciesReady] = useState(false);

  useEffect(() => {
    loadProfiles();
  }, []);

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

  const handleSetupComplete = async () => {
    await loadProfiles();
    setShowSetup('none');
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

  if (!dependenciesReady) {
    return <DependencyChecker onAllDependenciesReady={() => setDependenciesReady(true)} />;
  }

  if (showSetup === 'admin') {
    return (
      <AdminSetup 
        onSetupComplete={handleSetupComplete}
        onCancel={() => setShowSetup('none')}
      />
    );
  }

  if (showSetup === 'user') {
    return (
      <UserSetup 
        onSetupComplete={handleSetupComplete}
        onCancel={() => setShowSetup('none')}
      />
    );
  }

  // Language toggle component
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

  if (profiles.length === 0) {
    return (
      <div className="setup-type-selection">
        <div className="selection-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '1rem' }}>
            <div></div>
            <LanguageToggle />
          </div>
          <h1>{t('app.welcome')}</h1>
          <p>{t('app.chooseSetupType')}</p>
          
          <div className="setup-options">
            <div className="setup-option" onClick={() => setShowSetup('admin')}>
              <div className="option-icon">👑</div>
              <h3>{t('setup.adminSetup')}</h3>
              <p>{t('setup.adminDescription')}</p>
              <button className="btn btn-primary">{t('setup.setupAsAdmin')}</button>
            </div>
            
            <div className="setup-option" onClick={() => setShowSetup('user')}>
              <div className="option-icon">👤</div>
              <h3>{t('setup.userSetup')}</h3>
              <p>{t('setup.userDescription')}</p>
              <button className="btn btn-secondary">{t('setup.setupAsUser')}</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="app">
        <Sidebar 
          profiles={profiles}
          activeProfile={activeProfile}
          onProfileSelect={handleProfileSelected}
          onNewProfile={() => setShowSetup('user')}
          onProfilesUpdated={loadProfiles}
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
