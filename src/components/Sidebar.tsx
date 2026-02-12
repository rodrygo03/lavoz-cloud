import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Monitor,
  Cloud,
  Settings,
  Users,
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { Profile, UserSession } from '../types';
import SidebarView from './SidebarView';

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
    <SidebarView
      profiles={profiles}
      activeProfile={activeProfile}
      userSession={userSession}
      navItems={navItems}
      currentPath={location.pathname}
      showProfileMenu={showProfileMenu}
      onProfileSelect={onProfileSelect}
      onNewProfile={onNewProfile}
      onDeleteProfile={handleDeleteProfile}
      onToggleProfileMenu={(profileId) =>
        setShowProfileMenu(showProfileMenu === profileId ? null : profileId)
      }
      onLogout={onLogout}
      t={t}
    />
  );
}
