import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../store/useAuthStore';
import useThemeStore from '../store/useThemeStore';
import api from '../services/api';
import {
  LayoutDashboard,
  FileText,
  ShieldCheck,
  QrCode,
  LogOut,
  Menu,
  ClipboardList,
  ScanLine,
  User,
  X,
  Sun,
  Moon,
} from 'lucide-react';

const roleLabels = {
  'super-admin': 'Super Admin',
  admin: 'Admin',
  warden: 'Warden',
  manager: 'Manager',
  gatekeeper: 'Gatekeeper',
  student: 'Student',
};

const navConfig = {
  'super-admin': [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/super-admin', section: 'Overview' },
  ],
  admin: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/admin', section: 'Overview' },
  ],
  warden: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/warden', section: 'Overview' },
    { label: 'Pass Requests', icon: FileText, path: '/warden', hash: 'passes', section: 'Management' },
  ],
  manager: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/manager', section: 'Overview' },
    { label: 'Pass Requests', icon: ClipboardList, path: '/manager', hash: 'passes', section: 'Management' },
  ],
  gatekeeper: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/gatekeeper', section: 'Overview' },
    { label: 'Scan QR', icon: ScanLine, path: '/gatekeeper', hash: 'scan', section: 'Verification' },
  ],
  student: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/student', section: 'Overview' },
    { label: 'My Passes', icon: QrCode, path: '/student', hash: 'passes', section: 'Passes' },
  ],
};

const noProfileRoles = ['super-admin', 'admin'];

export default function Layout({ children, pageTitle, headerRight }) {
  const { role, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileModal, setProfileModal] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const navItems = navConfig[role] || [];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavClick = (item) => {
    navigate(item.path + (item.hash ? `#${item.hash}` : ''));
    setSidebarOpen(false);
  };

  const handleProfileClick = async () => {
    if (noProfileRoles.includes(role)) {
      setProfileData(null);
      setProfileModal(true);
      return;
    }
    setProfileLoading(true);
    setProfileModal(true);
    try {
      const res = await api.get('/user/profile');
      setProfileData(res.data.profile);
    } catch (err) {
      setProfileData(null);
    } finally {
      setProfileLoading(false);
    }
  };

  const sections = {};
  navItems.forEach((item) => {
    if (!sections[item.section]) sections[item.section] = [];
    sections[item.section].push(item);
  });

  const initials = (roleLabels[role] || 'U').split(' ').map(w => w[0]).join('');

  return (
    <div className="app-layout">
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            className="sidebar-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-icon">
            <ShieldCheck size={22} />
          </div>
          <div className="brand-text">
            <h2>Gate Pass</h2>
            <span>Management System</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {Object.entries(sections).map(([section, items]) => (
            <div className="nav-section" key={section}>
              <div className="nav-section-title">{section}</div>
              {items.map((item) => (
                <div
                  key={item.label}
                  className={`nav-item ${
                    location.pathname === item.path &&
                    (item.hash ? location.hash === `#${item.hash}` : !location.hash)
                      ? 'active' : ''
                  }`}
                  onClick={() => handleNavClick(item)}
                >
                  <item.icon />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          {/* Clickable user-info to show profile */}
          <div
            className="user-info"
            onClick={handleProfileClick}
            style={{ cursor: 'pointer', borderRadius: '8px', padding: '8px 16px' }}
            title="View Profile"
          >
            <div className="user-avatar">{initials}</div>
            <div className="user-details">
              <div className="user-name">{roleLabels[role] || role}</div>
              <div className="user-role">{role}</div>
            </div>
          </div>
          <button className="btn btn-danger logout-btn-sidebar" onClick={handleLogout}>
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <div className="main-content">
        <header className="main-header">
          <div className="flex items-center gap-md">
            <button className="btn-icon mobile-header" onClick={() => setSidebarOpen(true)}>
              <Menu size={20} />
            </button>
            <h1>{pageTitle || 'Dashboard'}</h1>
          </div>
          <div className="header-actions">
            {headerRight}
            <button
              className="btn-icon"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              <motion.div
                key={theme}
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                transition={{ duration: 0.3 }}
                style={{ display: 'flex', alignItems: 'center' }}
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </motion.div>
            </button>
            <button className="btn-icon" onClick={handleLogout} title="Logout">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <motion.div
          className="page-content"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          {children}
        </motion.div>
      </div>

      {/* Profile Modal */}
      <AnimatePresence>
        {profileModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setProfileModal(false)}
          >
            <motion.div
              className="modal-content"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>My Profile</h2>
                <button className="btn-icon" onClick={() => setProfileModal(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="modal-body">
                {profileLoading ? (
                  <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                    Loading...
                  </div>
                ) : noProfileRoles.includes(role) ? (
                  <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                    <User size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                    <p>No profile available for {roleLabels[role]}</p>
                  </div>
                ) : profileData ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {Object.entries(profileData)
                      .filter(([key]) => !['_id', '__v', 'userId', 'createdAt', 'updatedAt'].includes(key))
                      .map(([key, value]) => (
                        <div key={key} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '10px 0',
                          borderBottom: '1px solid var(--border-subtle)'
                        }}>
                          <span style={{ color: 'var(--text-muted)', fontSize: '13px', textTransform: 'capitalize' }}>
                            {key.replace(/([A-Z])/g, ' $1')}
                          </span>
                          <span style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 500 }}>
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                    <p>Profile not completed yet.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}