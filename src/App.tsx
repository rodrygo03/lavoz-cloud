import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import CloudBrowser from './components/CloudBrowser';
import Settings from './components/Settings';
import UserManagement from './components/UserManagement';
import AdminSetup from './components/AdminSetup';
import UserSetup from './components/UserSetup';
import DependencyChecker from './components/DependencyChecker';
import { Profile } from './types';
import "./App.css";

function App() {
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
        <p>Loading...</p>
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

  if (profiles.length === 0) {
    return (
      <div className="setup-type-selection">
        <div className="selection-container">
          <h1>Welcome to Cloud Backup</h1>
          <p>Choose your setup type to get started.</p>
          
          <div className="setup-options">
            <div className="setup-option" onClick={() => setShowSetup('admin')}>
              <div className="option-icon">👑</div>
              <h3>Administrator Setup</h3>
              <p>Configure AWS infrastructure, create bucket, and manage user accounts. Choose this if you're setting up the backup system for your organization.</p>
              <button className="btn btn-primary">Setup as Admin</button>
            </div>
            
            <div className="setup-option" onClick={() => setShowSetup('user')}>
              <div className="option-icon">👤</div>
              <h3>User Setup</h3>
              <p>Connect to an existing backup system using credentials provided by your administrator.</p>
              <button className="btn btn-secondary">Setup as User</button>
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
