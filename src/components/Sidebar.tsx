import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Database,
  Cloud,
  Settings,
  Plus,
  Monitor,
  User,
  Users,
  MoreHorizontal,
  Trash2,
  LogOut
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { Profile, UserSession } from '../types';
import { clsx } from 'clsx';

interface SidebarProps {
  profiles: Profile[];
  activeProfile: Profile | null;
  onProfileSelect: (profile: Profile) => void;
  onNewProfile: () => void;
  onProfilesUpdated: () => void;
  userSession: UserSession | null;
  onLogout: () => void;
}

export default function Sidebar({
  profiles,
  activeProfile,
  onProfileSelect,
  onNewProfile,
  onProfilesUpdated,
  userSession,
  onLogout
}: SidebarProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const [showProfileMenu, setShowProfileMenu] = useState<string | null>(null);

  const handleDeleteProfile = async (profileId: string) => {
    if (confirm('Are you sure you want to delete this profile? This action cannot be undone.')) {
      try {
        await invoke('delete_profile', { profileId });
        onProfilesUpdated();
        setShowProfileMenu(null);
      } catch (error) {
        console.error('Failed to delete profile:', error);
        alert('Failed to delete profile: ' + error);
      }
    }
  };

  const baseNavItems = [
    { path: '/dashboard', label: t('sidebar.dashboard'), icon: Monitor },
    { path: '/cloud-browser', label: t('sidebar.cloudBrowser'), icon: Cloud },
    { path: '/settings', label: t('sidebar.settings'), icon: Settings },
  ];

  const adminNavItems = [
    { path: '/user-management', label: t('sidebar.userManagement'), icon: Users },
  ];

  const navItems = activeProfile?.profile_type === 'Admin' 
    ? [...baseNavItems, ...adminNavItems]
    : baseNavItems;

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title">
          <Database size={24} />
          <span>Cloud Backup</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={clsx(
                'nav-item',
                location.pathname === item.path && 'active'
              )}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-section">
        <div className="section-header">
          <span>Profiles</span>
          <button 
            className="icon-button"
            onClick={onNewProfile}
            title={t('sidebar.newProfile')}
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="profiles-list">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className={clsx(
                'profile-item',
                activeProfile?.id === profile.id && 'active'
              )}
            >
              <div 
                className="profile-info"
                onClick={() => onProfileSelect(profile)}
              >
                <div className="profile-icon">
                  <User size={16} />
                </div>
                <div className="profile-details">
                  <div className="profile-name">{profile.name}</div>
                  <div className="profile-meta">
                    {profile.bucket}/{profile.prefix}
                  </div>
                </div>
              </div>

              <div className="profile-menu">
                <button
                  className="icon-button"
                  onClick={() => setShowProfileMenu(
                    showProfileMenu === profile.id ? null : profile.id
                  )}
                >
                  <MoreHorizontal size={14} />
                </button>

                {showProfileMenu === profile.id && (
                  <div className="profile-menu-dropdown">
                    <button 
                      className="menu-item danger"
                      onClick={() => handleDeleteProfile(profile.id)}
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {profiles.length === 0 && (
            <div className="empty-state">
              <p>{t('sidebar.noProfiles')}</p>
              <button 
                className="btn btn-primary"
                onClick={onNewProfile}
              >
                {t('sidebar.createProfile')}
              </button>
            </div>
          )}
        </div>
      </div>

      {userSession && (
        <div className="sidebar-section" style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #e0e0e0' }}>
          <div className="profile-item active" style={{ marginBottom: '0.5rem' }}>
            <div className="profile-info" style={{ cursor: 'default' }}>
              <div className="profile-icon" style={{
                background: userSession.groups.includes('Admins') ? '#007bff' : '#28a745',
                color: 'white'
              }}>
                <User size={16} />
              </div>
              <div className="profile-details">
                <div className="profile-name">{userSession.email}</div>
                <div className="profile-meta">
                  {userSession.groups.includes('Admin') ? 'Administrator' : 'Employee'}
                </div>
              </div>
            </div>
          </div>
          <button
            className="btn btn-secondary"
            onClick={onLogout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      )}

      <div className="sidebar-footer">
        <div className="app-info">
          <span>Cloud Backup App</span>
          <span className="version">v0.1.0</span>
        </div>
      </div>
    </div>
  );
}