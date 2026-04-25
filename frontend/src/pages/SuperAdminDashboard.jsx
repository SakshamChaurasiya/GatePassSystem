import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, ShieldCheck, UserPlus, Loader2, ChevronRight, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import Modal from '../components/Modal';
import { createUser, getUsers } from '../services/userService';
import api from '../services/api';

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', role: 'admin' });
  const [creating, setCreating] = useState(false);
  const [hostels, setHostels] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [userList, setUserList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [hostelModal, setHostelModal] = useState({ open: false, data: null });
  const [loadingHostel, setLoadingHostel] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await api.get('/user/dashboard');
      setStats(res.data.stats);
    } catch (err) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchHostels = async () => {
    try {
      const res = await api.get('/hostel');
      setHostels(res.data.hostels || res.data || []);
    } catch (err) {
      // silently fail
    }
  };

  const fetchRecentUsers = async () => {
    try {
      const res = await getUsers('all');
      const all = res.allUsers || [];
      const sorted = [...all].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setRecentUsers(sorted.slice(0, 5));
    } catch (err) {
      // silently fail
    }
  };

  const fetchHostelDetails = async (hostelId) => {
    setLoadingHostel(true);
    setHostelModal({ open: true, data: null });
    try {
      const res = await api.get(`/hostel/${hostelId}`);
      setHostelModal({ open: true, data: res.data });
    } catch (err) {
      toast.error('Failed to load hostel details');
      setHostelModal({ open: false, data: null });
    } finally {
      setLoadingHostel(false);
    }
  };

  const fetchUsersByRole = async (roleLabel) => {
    setLoadingUsers(true);
    setSelectedRole(roleLabel);
    setUserList([]);
    try {
      const roleMap = {
        'Total Users': 'all',
        'Admin': 'admin',
        'Warden': 'warden',
        'Manager': 'manager',
        'Gatekeeper': 'gatekeeper',
        'Student': 'student'
      };
      const requestedRole = roleMap[roleLabel];
      const res = await getUsers(requestedRole);
      if (requestedRole === 'all') {
        const users = res.allUsers || [];
        if (users.length === 0 && res.data) {
          setUserList(Object.values(res.data).flat().filter(u => typeof u === 'object' && u !== null && u.name));
        } else {
          setUserList(users);
        }
      } else {
        setUserList(res.data || []);
      }
    } catch (err) {
      toast.error(`Could not fetch ${roleLabel} details`);
      setSelectedRole(null);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchHostels();
    fetchRecentUsers();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) { toast.error('Name and email are required'); return; }
    setCreating(true);
    try {
      const res = await createUser(formData);
      toast.success(`Admin created! Temp password: ${res.tempPassword}`, { duration: 8000 });
      setShowModal(false);
      setFormData({ name: '', email: '', role: 'admin' });
      fetchStats();
      fetchRecentUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create admin');
    } finally {
      setCreating(false);
    }
  };

  const roleBreakdown = stats?.roleBreakdown || [];
  const getRoleCount = (roleName) => {
    const found = roleBreakdown.find((r) => r._id === roleName);
    return found ? found.count : 0;
  };

  const roleBadgeColor = {
    admin: '#8b5cf6',
    warden: '#22c55e',
    manager: '#f59e0b',
    gatekeeper: '#3b82f6',
    student: '#ef4444',
    'super-admin': '#6366f1',
  };

  return (
    <Layout pageTitle="Super Admin Dashboard">
      {loading ? (
        <div className="page-loader"><div className="spinner" /></div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-lg">
            <h2 className="section-title" style={{ marginBottom: 0 }}>Overview</h2>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <UserPlus size={18} /> Create Admin
            </button>
          </div>

          {/* Stat Cards */}
          <motion.div className="stats-grid" initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }}>
            <StatCard icon={Users} label="Total Users" value={stats?.totalUsers || 0} color="blue" onClick={() => fetchUsersByRole('Total Users')} />
            <StatCard icon={ShieldCheck} label="Admins" value={getRoleCount('admin')} color="purple" onClick={() => fetchUsersByRole('Admin')} />
            <StatCard icon={Users} label="Wardens" value={getRoleCount('warden')} color="green" onClick={() => fetchUsersByRole('Warden')} />
            <StatCard icon={Users} label="Managers" value={getRoleCount('manager')} color="yellow" onClick={() => fetchUsersByRole('Manager')} />
            <StatCard icon={Users} label="Gatekeepers" value={getRoleCount('gatekeeper')} color="blue" onClick={() => fetchUsersByRole('Gatekeeper')} />
            <StatCard icon={Users} label="Students" value={getRoleCount('student')} color="red" onClick={() => fetchUsersByRole('Student')} />
          </motion.div>

          {/* Two column layout */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginTop: '8px' }}>

            {/* Recently Added Users */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Recently Added Users</h3>
                <button onClick={() => fetchUsersByRole('Total Users')} style={{ background: 'none', border: 'none', color: 'var(--text-accent)', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  View all <ChevronRight size={14} />
                </button>
              </div>
              {recentUsers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                  <Users size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                  <p style={{ fontSize: '13px' }}>No users yet</p>
                </div>
              ) : (
                recentUsers.map((u, i) => (
                  <div key={u._id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{u.name}</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{u.email}</p>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '999px', background: `${roleBadgeColor[u.role] || '#6366f1'}18`, color: roleBadgeColor[u.role] || '#6366f1', textTransform: 'capitalize' }}>
                      {u.role}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Quick Actions */}
            <div className="card">
              <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>Quick Actions</h3>
              {[
                { icon: UserPlus, label: 'Create New Admin', desc: 'Add a new admin to the system', action: () => setShowModal(true), color: '#6366f1' },
                { icon: ShieldCheck, label: 'View All Admins', desc: `${getRoleCount('admin')} admins registered`, action: () => fetchUsersByRole('Admin'), color: '#8b5cf6' },
                { icon: Users, label: 'View All Wardens', desc: `${getRoleCount('warden')} wardens registered`, action: () => fetchUsersByRole('Warden'), color: '#22c55e' },
                { icon: Users, label: 'View All Students', desc: `${getRoleCount('student')} students registered`, action: () => fetchUsersByRole('Student'), color: '#ef4444' },
              ].map((item, i) => (
                <div
                  key={i}
                  onClick={item.action}
                  style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px', borderRadius: '8px', cursor: 'pointer', marginBottom: '8px', transition: 'background 0.15s', border: '1px solid var(--border-subtle)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-glass-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: `${item.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <item.icon size={18} color={item.color} />
                  </div>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{item.label}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{item.desc}</p>
                  </div>
                  <ChevronRight size={16} color="var(--text-muted)" style={{ marginLeft: 'auto' }} />
                </div>
              ))}
            </div>

            {/* Role Breakdown */}
            <div className="card">
              <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>Role Breakdown</h3>
              {[
                { label: 'Admins', role: 'admin', color: '#8b5cf6' },
                { label: 'Wardens', role: 'warden', color: '#22c55e' },
                { label: 'Managers', role: 'manager', color: '#f59e0b' },
                { label: 'Gatekeepers', role: 'gatekeeper', color: '#3b82f6' },
                { label: 'Students', role: 'student', color: '#ef4444' },
              ].map((item) => {
                const count = getRoleCount(item.role);
                const total = stats?.totalUsers || 1;
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={item.role} style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{item.label}</span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{count} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({pct}%)</span></span>
                    </div>
                    <div style={{ height: '6px', borderRadius: '999px', background: 'var(--bg-glass-hover)' }}>
                      <div style={{ height: '100%', borderRadius: '999px', background: item.color, width: `${pct}%`, transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Hostels */}
            {hostels.length > 0 && (
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Hostels</h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{hostels.length} total</span>
                </div>
                {hostels.map((h, i) => (
                  <div
                    key={h._id || i}
                    onClick={() => fetchHostelDetails(h._id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', borderRadius: '8px', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-glass-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Building2 size={18} color="#6366f1" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{h.name}</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{h.type || '—'} · {h.category || '—'}</p>
                    </div>
                    <ChevronRight size={14} color="var(--text-muted)" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* User List Modal */}
          <Modal isOpen={!!selectedRole} onClose={() => setSelectedRole(null)} title={`${selectedRole} Details`}>
            {loadingUsers ? (
              <div style={{ textAlign: 'center', padding: '32px' }}>
                <Loader2 className="spinner" size={30} style={{ margin: '0 auto 8px' }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Loading...</p>
              </div>
            ) : (
              <div className="data-table-wrapper" style={{ maxHeight: '50vh' }}>
                <table className="data-table">
                  <thead>
                    <tr><th>Name</th><th>Email</th><th>Role</th></tr>
                  </thead>
                  <tbody>
                    {userList.length > 0 ? (
                      userList.map((user) => (
                        <tr key={user._id}>
                          <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user.name}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{user.email}</td>
                          <td>
                            <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '999px', background: `${roleBadgeColor[user.role] || '#6366f1'}18`, color: roleBadgeColor[user.role] || '#6366f1', textTransform: 'capitalize' }}>
                              {user.role}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={3}><div className="empty-state"><Users size={32} /><p>No {selectedRole?.toLowerCase()}s registered yet</p></div></td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedRole(null)}>Close</button>
            </div>
          </Modal>

          {/* Hostel Details Modal */}
          <Modal
            isOpen={hostelModal.open}
            onClose={() => setHostelModal({ open: false, data: null })}
            title={hostelModal.data?.hostel?.name || 'Hostel Details'}
          >
            {loadingHostel ? (
              <div style={{ textAlign: 'center', padding: '32px' }}>
                <Loader2 className="spinner" size={30} style={{ margin: '0 auto 8px' }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Loading...</p>
              </div>
            ) : hostelModal.data ? (
              <>
                {/* Hostel Info Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                  {[
                    { label: 'Type', value: hostelModal.data.hostel?.type || '—' },
                    { label: 'Category', value: hostelModal.data.hostel?.category || '—' },
                    { label: 'Total Users', value: hostelModal.data.counts?.total || 0 },
                    { label: 'Students', value: hostelModal.data.counts?.students || 0 },
                    { label: 'Managers', value: hostelModal.data.counts?.managers || 0 },
                    { label: 'Wardens', value: hostelModal.data.counts?.wardens || 0 },
                    { label: 'Gatekeepers', value: hostelModal.data.counts?.gatekeepers || 0 },
                  ].map((item, i) => (
                    <div key={i} style={{ background: 'var(--bg-glass)', borderRadius: '8px', padding: '12px' }}>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</p>
                      <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* Students List */}
                {hostelModal.data.users?.students?.length > 0 && (
                  <>
                    <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Students</h4>
                    <div className="data-table-wrapper" style={{ maxHeight: '200px', marginBottom: '16px' }}>
                      <table className="data-table">
                        <thead><tr><th>Name</th><th>Email</th></tr></thead>
                        <tbody>
                          {hostelModal.data.users.students.map(u => (
                            <tr key={u._id}>
                              <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.name}</td>
                              <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {/* Staff List */}
                {([...(hostelModal.data.users?.wardens || []), ...(hostelModal.data.users?.managers || []), ...(hostelModal.data.users?.gatekeepers || [])].length > 0) && (
                  <>
                    <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Staff</h4>
                    <div className="data-table-wrapper" style={{ maxHeight: '150px' }}>
                      <table className="data-table">
                        <thead><tr><th>Name</th><th>Email</th><th>Role</th></tr></thead>
                        <tbody>
                          {[...(hostelModal.data.users.wardens || []), ...(hostelModal.data.users.managers || []), ...(hostelModal.data.users.gatekeepers || [])].map(u => (
                            <tr key={u._id}>
                              <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.name}</td>
                              <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                              <td>
                                <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '999px', background: `${roleBadgeColor[u.role]}18`, color: roleBadgeColor[u.role], textTransform: 'capitalize' }}>
                                  {u.role}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </>
            ) : null}
            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setHostelModal({ open: false, data: null })}>Close</button>
            </div>
          </Modal>

          {/* Create Admin Modal */}
          <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Admin">
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input className="form-input" placeholder="Admin name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" placeholder="admin@cdgi.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div className="modal-footer" style={{ padding: 0, marginTop: '16px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? <Loader2 className="spinner" size={16} /> : 'Create'}
                </button>
              </div>
            </form>
          </Modal>
        </>
      )}
    </Layout>
  );
}