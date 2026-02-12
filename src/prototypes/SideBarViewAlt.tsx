import { Link } from 'react-router-dom';
import {
  Plus,
  User,
  MoreHorizontal,
  Trash2,
  LogOut,
} from 'lucide-react';
import { clsx } from 'clsx';
import { Button, IconButton, EmptyState } from '../components/ui';
import type { SidebarViewProps } from '../components/SidebarView';

export interface SideBarViewAltProps extends SidebarViewProps {
  logo?: React.ReactNode;
}

export default function SideBarViewAlt({
  profiles,
  activeProfile,
  userSession,
  navItems,
  currentPath,
  showProfileMenu,
  onProfileSelect,
  onNewProfile,
  onDeleteProfile,
  onToggleProfileMenu,
  onLogout,
  t,
  logo,
}: SideBarViewAltProps) {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title">
          {logo}
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
                currentPath === item.path && 'active'
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
          <IconButton
            as="icon-button"
            onClick={onNewProfile}
            title={t('sidebar.newProfile')}
          >
            <Plus size={16} />
          </IconButton>
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
                <IconButton
                  as="icon-button"
                  onClick={() => onToggleProfileMenu(profile.id)}
                >
                  <MoreHorizontal size={14} />
                </IconButton>

                {showProfileMenu === profile.id && (
                  <div className="profile-menu-dropdown">
                    <button
                      className="menu-item danger"
                      onClick={() => onDeleteProfile(profile.id)}
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
            <EmptyState>
              <p>{t('sidebar.noProfiles')}</p>
              <Button
                variant="primary"
                onClick={onNewProfile}
              >
                {t('sidebar.createProfile')}
              </Button>
            </EmptyState>
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
          <Button
            variant="secondary"
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
          </Button>
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
