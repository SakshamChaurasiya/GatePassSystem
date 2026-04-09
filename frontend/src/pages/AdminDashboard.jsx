import { useEffect, useState } from 'react';
import { Users, Building2, UserPlus, Plus, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import Modal from '../components/Modal';
import api from '../services/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [hostels, setHostels] = useState([]);
  const [users, setUsers] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Modals
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
        api.get('/user/get-users'),
      ]);
      setStats(statsRes.data.stats);
      setHostels(hostelRes.data.hostels || []);
      setUsers(usersRes.data);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleCreateWarden = async (e) => {
    e.preventDefault();
    if (!wardenForm.name || !wardenForm.email || !wardenForm.hostel) {
      toast.error('All fields are required');
      return;
    }
    setCreating(true);
    try {
      const res = await api.post('/user/create-user', { ...wardenForm, role: 'warden' });
      toast.success(`Warden created! Temp password: ${res.data.tempPassword}`, { duration: 8000 });
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
    if (!hostelForm.name || !hostelForm.type) {
      toast.error('Name and type are required');
      return;
    }
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

  return (
    <Layout pageTitle="Admin Dashboard">
      {loading ? (
        <div className="page-loader"><div className="spinner" /></div>
      ) : (
        <>
          {/* Tab Navigation */}
          <div className="tabs">
            <button
              className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button
              className={`tab-btn ${activeTab === 'hostels' ? 'active' : ''}`}
              onClick={() => setActiveTab('hostels')}
            >
              Hostels
            </button>
            <button
              className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              Users
            </button>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              <div className="flex justify-between items-center mb-lg">
                <h2 className="section-title" style={{ marginBottom: 0 }}>System Overview</h2>
                <button className="btn btn-primary" onClick={() => setShowCreateWarden(true)}>
                  <UserPlus size={18} />
                  Create Warden
                </button>
              </div>
              <div className="stats-grid">
                <StatCard icon={Users} label="Total Users" value={stats?.total || 0} color="blue" />
                <StatCard icon={Users} label="Wardens" value={stats?.wardens || 0} color="green" />
                <StatCard icon={Users} label="Managers" value={stats?.managers || 0} color="yellow" />
                <StatCard icon={Users} label="Gatekeepers" value={stats?.gatekeepers || 0} color="purple" />
                <StatCard icon={Users} label="Students" value={stats?.students || 0} color="red" />
                <StatCard icon={Building2} label="Hostels" value={hostels.length} color="blue" />
              </div>
            </>
          )}

          {/* Hostels Tab */}
          {activeTab === 'hostels' && (
            <>
              <div className="flex justify-between items-center mb-lg">
                <h2 className="section-title" style={{ marginBottom: 0 }}>Hostels</h2>
                <button className="btn btn-primary" onClick={() => setShowCreateHostel(true)}>
                  <Plus size={18} />
                  Add Hostel
                </button>
              </div>
              <div className="card">
                <div className="data-table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Type</th>
                        <th>Category</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hostels.length === 0 ? (
                        <tr><td colSpan={3}><div className="empty-state"><p>No hostels yet</p></div></td></tr>
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
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users && Object.values(users.data).flat().length === 0 ? (
                        <tr><td colSpan={4}><div className="empty-state"><p>No users found</p></div></td></tr>
                      ) : (
                        users && Object.values(users.data).flat().map((u) => (
                          <tr key={u._id}>
                            <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{u.name}</td>
                            <td>{u.email}</td>
                            <td><span className={`badge badge-${u.role === 'warden' ? 'forwarded' : u.role === 'manager' ? 'pending' : 'active'}`}>{u.role}</span></td>
                            <td><span className={`badge ${u.isActive ? 'badge-approved' : 'badge-rejected'}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Create Warden Modal */}
          <Modal isOpen={showCreateWarden} onClose={() => setShowCreateWarden(false)} title="Create Warden">
            <form onSubmit={handleCreateWarden}>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input className="form-input" placeholder="Warden name" value={wardenForm.name} onChange={(e) => setWardenForm({ ...wardenForm, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" placeholder="warden@cdgi.com" value={wardenForm.email} onChange={(e) => setWardenForm({ ...wardenForm, email: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Hostel</label>
                <select className="form-select" value={wardenForm.hostel} onChange={(e) => setWardenForm({ ...wardenForm, hostel: e.target.value })}>
                  <option value="">Select hostel</option>
                  {hostels.map((h) => (
                    <option key={h._id} value={h._id}>{h.name}</option>
                  ))}
                </select>
              </div>
              <div className="modal-footer" style={{ padding: 0, marginTop: '16px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateWarden(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? <Loader2 className="spinner" size={16} /> : 'Create'}
                </button>
              </div>
            </form>
          </Modal>

          {/* Create Hostel Modal */}
          <Modal isOpen={showCreateHostel} onClose={() => setShowCreateHostel(false)} title="Add Hostel">
            <form onSubmit={handleCreateHostel}>
              <div className="form-group">
                <label className="form-label">Hostel Name</label>
                <input className="form-input" placeholder="e.g. Hostel A" value={hostelForm.name} onChange={(e) => setHostelForm({ ...hostelForm, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Type</label>
                <select className="form-select" value={hostelForm.type} onChange={(e) => setHostelForm({ ...hostelForm, type: e.target.value })}>
                  <option value="boys">Boys</option>
                  <option value="girls">Girls</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Category (optional)</label>
                <input className="form-input" placeholder="e.g. Senior / Junior" value={hostelForm.category} onChange={(e) => setHostelForm({ ...hostelForm, category: e.target.value })} />
              </div>
              <div className="modal-footer" style={{ padding: 0, marginTop: '16px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateHostel(false)}>Cancel</button>
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
