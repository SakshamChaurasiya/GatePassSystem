import { useEffect, useState } from 'react';
import { Users, ShieldCheck, UserPlus, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import Modal from '../components/Modal';
import api from '../services/api';

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', role: 'admin' });
  const [creating, setCreating] = useState(false);

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

  useEffect(() => {
    fetchStats();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      toast.error('Name and email are required');
      return;
    }
    setCreating(true);
    try {
      const res = await api.post('/user/create-user', formData);
      toast.success(`Admin created! Temp password: ${res.data.tempPassword}`, { duration: 8000 });
      setShowModal(false);
      setFormData({ name: '', email: '', role: 'admin' });
      fetchStats();
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

  return (
    <Layout pageTitle="Super Admin Dashboard">
      {loading ? (
        <div className="page-loader">
          <div className="spinner" />
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-lg">
            <h2 className="section-title" style={{ marginBottom: 0 }}>Overview</h2>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <UserPlus size={18} />
              Create Admin
            </button>
          </div>

          <div className="stats-grid">
            <StatCard icon={Users} label="Total Users" value={stats?.totalUsers || 0} color="blue" />
            <StatCard icon={ShieldCheck} label="Admins" value={getRoleCount('admin')} color="purple" />
            <StatCard icon={Users} label="Wardens" value={getRoleCount('warden')} color="green" />
            <StatCard icon={Users} label="Managers" value={getRoleCount('manager')} color="yellow" />
            <StatCard icon={Users} label="Gatekeepers" value={getRoleCount('gatekeeper')} color="blue" />
            <StatCard icon={Users} label="Students" value={getRoleCount('student')} color="red" />
          </div>

          <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Admin">
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input
                  className="form-input"
                  placeholder="Admin name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  className="form-input"
                  type="email"
                  placeholder="admin@cdgi.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="modal-footer" style={{ padding: 0, marginTop: '16px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
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
