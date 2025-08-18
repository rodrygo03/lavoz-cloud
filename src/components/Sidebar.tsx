import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Database, 
  Cloud, 
  Settings, 
  Plus, 
  Monitor, 
  User,
  Users,
  MoreHorizontal,
  Trash2
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { Profile } from '../types';
import { clsx } from 'clsx';

interface SidebarProps {
  profiles: Profile[];
  activeProfile: Profile | null;
  onProfileSelect: (profile: Profile) => void;
  onNewProfile: () => void;
  onProfilesUpdated: () => void;
}

export default function Sidebar({ 
  profiles, 
  activeProfile, 
  onProfileSelect, 
  onNewProfile,
  onProfilesUpdated 
}: SidebarProps) {
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
    { path: '/dashboard', label: 'Dashboard', icon: Monitor },
    { path: '/cloud-browser', label: 'Cloud Browser', icon: Cloud },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  const adminNavItems = [
    { path: '/user-management', label: 'User Management', icon: Users },
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
            title="Create new profile"
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
              <p>No profiles configured</p>
              <button 
                className="btn btn-primary"
                onClick={onNewProfile}
              >
                Create Profile
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="sidebar-footer">
        <div className="app-info">
          <span>Cloud Backup App</span>
          <span className="version">v0.1.0</span>
        </div>
      </div>
    </div>
  );
}