import { useEffect, useState } from 'react';
import { Users, UserPlus, FileText, Check, X as XIcon, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import Modal from '../components/Modal';
import api from '../services/api';

export default function WardenDashboard() {
  const [stats, setStats] = useState(null);
  const [passRequests, setPassRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Create user modal
  const [showCreate, setShowCreate] = useState(false);
  const [createRole, setCreateRole] = useState('manager');
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [creating, setCreating] = useState(false);

  // Action modal
  const [actionModal, setActionModal] = useState({ open: false, request: null, action: '' });
  const [remark, setRemark] = useState('');
  const [acting, setActing] = useState(false);

  const fetchAll = async () => {
    try {
      const [statsRes, passRes] = await Promise.all([
        api.get('/user/dashboard'),
        api.get('/passes/all'),
      ]);
      setStats(statsRes.data.stats);
      setPassRequests(passRes.data.requests || []);
    } catch (err) {
      // passes may fail if profile not complete
      try {
        const statsRes = await api.get('/user/dashboard');
        setStats(statsRes.data.stats);
      } catch {
        toast.error('Failed to load data');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      toast.error('All fields are required');
      return;
    }
    setCreating(true);
    try {
      const res = await api.post('/user/create-user', { ...formData, role: createRole });
      toast.success(`${createRole} created! Temp password: ${res.data.tempPassword}`, { duration: 8000 });
      setShowCreate(false);
      setFormData({ name: '', email: '' });
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setCreating(false);
    }
  };

  const handleAction = async () => {
    setActing(true);
    try {
      await api.patch(`/passes/${actionModal.request.id}/action`, {
        action: actionModal.action,
        remark,
      });
      toast.success(`Request ${actionModal.action}d`);
      setActionModal({ open: false, request: null, action: '' });
      setRemark('');
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setActing(false);
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <Layout pageTitle="Warden Dashboard">
      {loading ? (
        <div className="page-loader"><div className="spinner" /></div>
      ) : (
        <>
          <div className="tabs">
            <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
            <button className={`tab-btn ${activeTab === 'passes' ? 'active' : ''}`} onClick={() => setActiveTab('passes')}>Forwarded Passes</button>
          </div>

          {activeTab === 'overview' && (
            <>
              <div className="flex justify-between items-center mb-lg">
                <h2 className="section-title" style={{ marginBottom: 0 }}>Hostel Overview</h2>
                <div className="btn-group">
                  <button className="btn btn-primary" onClick={() => { setCreateRole('manager'); setShowCreate(true); }}>
                    <UserPlus size={18} /> Create Manager
                  </button>
                  <button className="btn btn-secondary" onClick={() => { setCreateRole('gatekeeper'); setShowCreate(true); }}>
                    <UserPlus size={18} /> Create Gatekeeper
                  </button>
                </div>
              </div>
              <div className="stats-grid">
                <StatCard icon={Users} label="Total" value={stats?.total || 0} color="blue" />
                <StatCard icon={Users} label="Managers" value={stats?.managers || 0} color="green" />
                <StatCard icon={Users} label="Gatekeepers" value={stats?.gatekeepers || 0} color="purple" />
                <StatCard icon={Users} label="Students" value={stats?.students || 0} color="yellow" />
              </div>
            </>
          )}

          {activeTab === 'passes' && (
            <>
              <h2 className="section-title">Forwarded Pass Requests</h2>
              <div className="card">
                <div className="data-table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Reason</th>
                        <th>Destination</th>
                        <th>From</th>
                        <th>To</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {passRequests.length === 0 ? (
                        <tr><td colSpan={7}><div className="empty-state"><FileText size={40} /><p>No forwarded requests</p></div></td></tr>
                      ) : (
                        passRequests.map((r) => (
                          <tr key={r.id}>
                            <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{r.student?.name || '—'}</td>
                            <td>{r.reason}</td>
                            <td>{r.destination}</td>
                            <td>{formatDate(r.fromDate)}</td>
                            <td>{formatDate(r.toDate)}</td>
                            <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                            <td>
                              <div className="btn-group">
                                <button className="btn btn-success btn-sm" onClick={() => setActionModal({ open: true, request: r, action: 'approve' })}>
                                  <Check size={14} /> Approve
                                </button>
                                <button className="btn btn-danger btn-sm" onClick={() => setActionModal({ open: true, request: r, action: 'reject' })}>
                                  <XIcon size={14} /> Reject
                                </button>
                              </div>
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

          {/* Create User Modal */}
          <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title={`Create ${createRole}`}>
            <form onSubmit={handleCreateUser}>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input className="form-input" placeholder="Full name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" placeholder="email@cdgi.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div className="modal-footer" style={{ padding: 0, marginTop: '16px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? <Loader2 className="spinner" size={16} /> : 'Create'}
                </button>
              </div>
            </form>
          </Modal>

          {/* Action Modal */}
          <Modal isOpen={actionModal.open} onClose={() => setActionModal({ open: false, request: null, action: '' })} title={`${actionModal.action === 'approve' ? 'Approve' : 'Reject'} Request`}>
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {actionModal.action === 'approve' ? 'Approve this pass request? A pass will be generated.' : 'Reject this pass request?'}
            </p>
            <div className="form-group">
              <label className="form-label">Remark (optional)</label>
              <textarea className="form-textarea" placeholder="Add a remark..." value={remark} onChange={(e) => setRemark(e.target.value)} />
            </div>
            <div className="modal-footer" style={{ padding: 0 }}>
              <button className="btn btn-secondary" onClick={() => setActionModal({ open: false, request: null, action: '' })}>Cancel</button>
              <button className={`btn ${actionModal.action === 'approve' ? 'btn-success' : 'btn-danger'}`} onClick={handleAction} disabled={acting}>
                {acting ? <Loader2 className="spinner" size={16} /> : actionModal.action === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </Modal>
        </>
      )}
    </Layout>
  );
}
