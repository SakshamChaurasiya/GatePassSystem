import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Building2, UserPlus, Plus, Loader2, ChevronRight, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import Modal from '../components/Modal';
import { createUser, getUsers } from '../services/userService';
import api from '../services/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [hostels, setHostels] = useState([]);
  const [usersData, setUsersData] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedRoleView, setSelectedRoleView] = useState(null);
  const [showCreateWarden, setShowCreateWarden] = useState(false);
  const [showCreateHostel, setShowCreateHostel] = useState(false);
  const [creating, setCreating] = useState(false);
  const [wardenForm, setWardenForm] = useState({ name: '', email: '', hostel: '' });
  const [hostelForm, setHostelForm] = useState({ name: '', type: 'boys', category: '' });

  const fetchAll = async () => {
    try {
      const [statsRes, hostelRes, usersRes] = await Promise.all([
        api.get('/user/dashboard'),
        api.get('/hostel/'),
        getUsers(),
      ]);
      setStats(statsRes.data?.stats || {});
      setHostels(hostelRes.data?.hostels || []);
      setUsersData(usersRes.data || {});
    } catch (err) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const getFilteredUsers = () => {
    if (!selectedRoleView) return [];
    const roleMap = { 'Wardens': 'wardens', 'Managers': 'managers', 'Gatekeepers': 'gatekeepers', 'Students': 'students' };
    if (selectedRoleView === 'Total Users') return Object.values(usersData).flat().filter(u => typeof u === 'object' && u !== null && u.name);
    return usersData[roleMap[selectedRoleView]] || [];
  };

  const handleCreateWarden = async (e) => {
    e.preventDefault();
    if (!wardenForm.name || !wardenForm.email || !wardenForm.hostel) { toast.error('All fields are required'); return; }
    setCreating(true);
    try {
      const res = await createUser({ ...wardenForm, role: 'warden' });
      toast.success(`Warden created! Temp password: ${res.tempPassword}`, { duration: 8000 });
      setShowCreateWarden(false);
      setWardenForm({ name: '', email: '', hostel: '' });
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateHostel = async (e) => {
    e.preventDefault();
    if (!hostelForm.name || !hostelForm.type) { toast.error('Name and type are required'); return; }
    setCreating(true);
    try {
      await api.post('/hostel/', hostelForm);
      toast.success('Hostel created!');
      setShowCreateHostel(false);
      setHostelForm({ name: '', type: 'boys', category: '' });
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setCreating(false);
    }
  };

  const roleBadgeColor = {
    warden: '#22c55e',
    manager: '#f59e0b',
    gatekeeper: '#3b82f6',
    student: '#ef4444',
  };

  const recentUsers = Object.values(usersData).flat()
    .filter(u => typeof u === 'object' && u !== null && u.name)
    .slice(0, 5);

  return (
    <Layout pageTitle="Admin Dashboard">
      {loading ? (
        <div className="page-loader"><div className="spinner" /></div>
      ) : (
        <>
          <div className="tabs">
            {['overview', 'hostels', 'users'].map((tab) => (
              <button key={tab} className={`tab-btn ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              <div className="flex justify-between items-center mb-lg">
                <h2 className="section-title" style={{ marginBottom: 0 }}>System Overview</h2>
                <button className="btn btn-primary" onClick={() => setShowCreateWarden(true)}>
                  <UserPlus size={18} /> Create Warden
                </button>
              </div>

              <motion.div className="stats-grid" initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }}>
                <div onClick={() => setSelectedRoleView('Total Users')} style={{ cursor: 'pointer' }}>
                  <StatCard icon={Users} label="Total Users" value={stats?.total || 0} color="blue" />
                </div>
                <div onClick={() => setSelectedRoleView('Wardens')} style={{ cursor: 'pointer' }}>
                  <StatCard icon={Users} label="Wardens" value={stats?.wardens || 0} color="green" />
                </div>
                <div onClick={() => setSelectedRoleView('Managers')} style={{ cursor: 'pointer' }}>
                  <StatCard icon={Users} label="Managers" value={stats?.managers || 0} color="yellow" />
                </div>
                <div onClick={() => setSelectedRoleView('Gatekeepers')} style={{ cursor: 'pointer' }}>
                  <StatCard icon={Users} label="Gatekeepers" value={stats?.gatekeepers || 0} color="purple" />
                </div>
                <div onClick={() => setSelectedRoleView('Students')} style={{ cursor: 'pointer' }}>
                  <StatCard icon={Users} label="Students" value={stats?.students || 0} color="red" />
                </div>
                <div onClick={() => setActiveTab('hostels')} style={{ cursor: 'pointer' }}>
                  <StatCard icon={Building2} label="Hostels" value={hostels.length} color="blue" />
                </div>
              </motion.div>

              {/* Two column layout */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>

                {/* Recent Users */}
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Recent Users</h3>
                    <button onClick={() => setActiveTab('users')} style={{ background: 'none', border: 'none', color: 'var(--text-accent)', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
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
                    { icon: UserPlus, label: 'Create Warden', desc: 'Add a warden to a hostel', action: () => setShowCreateWarden(true), color: '#22c55e' },
                    { icon: Plus, label: 'Add Hostel', desc: `${hostels.length} hostels registered`, action: () => setShowCreateHostel(true), color: '#6366f1' },
                    { icon: Users, label: 'View All Users', desc: `${stats?.total || 0} users in your hostel`, action: () => setActiveTab('users'), color: '#3b82f6' },
                    { icon: Building2, label: 'Manage Hostels', desc: 'View and manage hostels', action: () => setActiveTab('hostels'), color: '#f59e0b' },
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

                {/* Hostels Preview */}
                {hostels.length > 0 && (
                  <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Hostels</h3>
                      <button onClick={() => setActiveTab('hostels')} style={{ background: 'none', border: 'none', color: 'var(--text-accent)', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        View all <ChevronRight size={14} />
                      </button>
                    </div>
                    {hostels.slice(0, 4).map((h, i) => (
                      <div key={h._id || i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Building2 size={18} color="#6366f1" />
                        </div>
                        <div>
                          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{h.name}</p>
                          <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{h.type || '—'} · {h.category || '—'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Hostels Tab */}
          {activeTab === 'hostels' && (
            <>
              <div className="flex justify-between items-center mb-lg">
                <h2 className="section-title" style={{ marginBottom: 0 }}>Hostels</h2>
                <button className="btn btn-primary" onClick={() => setShowCreateHostel(true)}>
                  <Plus size={18} /> Add Hostel
                </button>
              </div>
              <div className="card">
                <div className="data-table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr><th>Name</th><th>Type</th><th>Category</th></tr>
                    </thead>
                    <tbody>
                      {hostels.length === 0 ? (
                        <tr><td colSpan={3}><div className="empty-state"><Building2 size={40} /><p>No hostels registered yet</p></div></td></tr>
                      ) : (
                        hostels.map((h) => (
                          <tr key={h._id}>
                            <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{h.name}</td>
                            <td><span className="badge badge-active">{h.type}</span></td>
                            <td>{h.category || '—'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <>
              <h2 className="section-title">All Users</h2>
              <div className="card">
                <div className="data-table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {Object.values(usersData).flat().filter(u => typeof u === 'object' && u !== null && u.name).length === 0 ? (
                        <tr><td colSpan={4}><div className="empty-state"><Users size={40} /><p>No users found</p></div></td></tr>
                      ) : (
                        Object.values(usersData).flat()
                          .filter(u => typeof u === 'object' && u !== null && u.name)
                          .map((u) => (
                            <tr key={u._id}>
                              <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{u.name}</td>
                              <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                              <td>
                                <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '999px', background: `${roleBadgeColor[u.role] || '#6366f1'}18`, color: roleBadgeColor[u.role] || '#6366f1', textTransform: 'capitalize' }}>
                                  {u.role}
                                </span>
                              </td>
                              <td>
                                <span className={`badge ${u.isActive ? 'badge-approved' : 'badge-rejected'}`}>
                                  {u.isActive ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* User Details Modal */}
          <Modal isOpen={!!selectedRoleView} onClose={() => setSelectedRoleView(null)} title={`${selectedRoleView} Details`}>
            <div className="data-table-wrapper" style={{ maxHeight: '50vh' }}>
              <table className="data-table">
                <thead><tr><th>Name</th><th>Email</th></tr></thead>
                <tbody>
                  {getFilteredUsers().length > 0 ? (
                    getFilteredUsers().map((u) => (
                      <tr key={u._id}>
                        <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{u.name}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={2}><div className="empty-state"><Users size={32} /><p>No {selectedRoleView} found</p></div></td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedRoleView(null)}>Close</button>
            </div>
          </Modal>

          {/* Create Warden Modal */}
          <Modal isOpen={showCreateWarden} onClose={() => setShowCreateWarden(false)} title="Create Warden">
            <form onSubmit={handleCreateWarden}>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input className="form-input" placeholder="Warden name" value={wardenForm.name} onChange={(e) => setWardenForm({ ...wardenForm, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" placeholder="warden@cdgi.edu.in" value={wardenForm.email} onChange={(e) => setWardenForm({ ...wardenForm, email: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Hostel</label>
                <select className="form-select" value={wardenForm.hostel} onChange={(e) => setWardenForm({ ...wardenForm, hostel: e.target.value })} required>
                  <option value="">Select hostel</option>
                  {hostels.map(h => (
                    <option key={h._id} value={h._id}>{h.name}</option>
                  ))}
                </select>
              </div>
              <div className="modal-footer" style={{ padding: 0, marginTop: '16px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateWarden(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? <Loader2 className="spinner" size={16} /> : 'Create Warden'}
                </button>
              </div>
            </form>
          </Modal>

          {/* Create Hostel Modal */}
          <Modal isOpen={showCreateHostel} onClose={() => setShowCreateHostel(false)} title="Add Hostel">
            <form onSubmit={handleCreateHostel}>
              <div className="form-group">
                <label className="form-label">Hostel Name</label>
                <input className="form-input" placeholder="e.g. Senior Boys Hostel" value={hostelForm.name} onChange={(e) => setHostelForm({ ...hostelForm, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Type</label>
                <select className="form-select" value={hostelForm.type} onChange={(e) => setHostelForm({ ...hostelForm, type: e.target.value })}>
                  <option value="boys">Boys</option>
                  <option value="girls">Girls</option>
                  <option value="mixed">Mixed</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Category (optional)</label>
                <input className="form-input" placeholder="e.g. Senior, Junior" value={hostelForm.category} onChange={(e) => setHostelForm({ ...hostelForm, category: e.target.value })} />
              </div>
              <div className="modal-footer" style={{ padding: 0, marginTop: '16px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateHostel(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? <Loader2 className="spinner" size={16} /> : 'Create Hostel'}
                </button>
              </div>
            </form>
          </Modal>
        </>
      )}
    </Layout>
  );
}