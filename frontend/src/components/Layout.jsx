import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import {
  LayoutDashboard,
  Users,
  FileText,
  Building2,
  ShieldCheck,
  QrCode,
  LogOut,
  Menu,
  X,
  Bell,
  ClipboardList,
  UserPlus,
  ScanLine,
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

export default function Layout({ children, pageTitle }) {
  const { role, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = navConfig[role] || [];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavClick = (item) => {
    navigate(item.path);
    setSidebarOpen(false);
  };

  // Group nav items by section
  const sections = {};
  navItems.forEach((item) => {
    if (!sections[item.section]) sections[item.section] = [];
    sections[item.section].push(item);
  });

  const initials = (roleLabels[role] || 'U').split(' ').map(w => w[0]).join('');

  return (
    <div className="app-layout">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
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
                  className={`nav-item ${location.pathname === item.path && !item.hash ? 'active' : ''}`}
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
          <div className="user-info">
            <div className="user-avatar">{initials}</div>
            <div className="user-details">
              <div className="user-name">{roleLabels[role] || role}</div>
              <div className="user-role">{role}</div>
            </div>
          </div>
          <div
            className="nav-item"
            onClick={handleLogout}
            style={{ marginTop: '8px', color: 'var(--danger)' }}
          >
            <LogOut />
            <span>Logout</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        <header className="main-header">
          <div className="flex items-center gap-md">
            <button
              className="btn-icon mobile-header"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            <h1>{pageTitle || 'Dashboard'}</h1>
          </div>
          <div className="header-actions">
            <button className="btn-icon" onClick={handleLogout} title="Logout">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <div className="page-content">
          {children}
        </div>
      </div>
    </div>
  );
}
