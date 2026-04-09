import { useEffect, useState } from 'react';
import { FileText, QrCode, Plus, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import Modal from '../components/Modal';
import api from '../services/api';

export default function StudentDashboard() {
  const [requests, setRequests] = useState([]);
  const [passes, setPasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [profile, setProfile] = useState(null);
  const [needsProfile, setNeedsProfile] = useState(false);

  // Create request modal
  const [showCreate, setShowCreate] = useState(false);
  const [requestForm, setRequestForm] = useState({
    reason: '',
    destination: '',
    fromDate: '',
    toDate: '',
  });
  const [docFile, setDocFile] = useState(null);
  const [creating, setCreating] = useState(false);

  // QR modal
  const [qrModal, setQrModal] = useState({ open: false, pass: null });

  const fetchAll = async () => {
    try {
      const [reqRes, passRes] = await Promise.all([
        api.get('/passes/my-requests'),
        api.get('/passes/my'),
      ]);
      setRequests(reqRes.data.requests || []);
      setPasses(passRes.data.passes || []);
    } catch (err) {
      if (err.response?.data?.message === 'Complete profile first') {
        setNeedsProfile(true);
      } else {
        toast.error('Failed to load data');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    const { reason, destination, fromDate, toDate } = requestForm;
    if (!reason || !destination || !fromDate || !toDate) {
      toast.error('All fields are required');
      return;
    }
    setCreating(true);
    try {
      const formDataObj = new FormData();
      formDataObj.append('reason', reason);
      formDataObj.append('destination', destination);
      formDataObj.append('fromDate', fromDate);
      formDataObj.append('toDate', toDate);
      if (docFile) {
        formDataObj.append('document', docFile);
      }

      await api.post('/passes/request-pass', formDataObj, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Pass request submitted!');
      setShowCreate(false);
      setRequestForm({ reason: '', destination: '', fromDate: '', toDate: '' });
      setDocFile(null);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (d) =>
    d
      ? new Date(d).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : '—';

  const formatDateTime = (d) =>
    d
      ? new Date(d).toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '—';

  const pendingCount = requests.filter((r) => r.status === 'pending' || r.status === 'forwarded').length;
  const approvedCount = requests.filter((r) => r.status === 'approved').length;
  const rejectedCount = requests.filter((r) => r.status === 'rejected').length;

  if (needsProfile) {
    return (
      <Layout pageTitle="Student Dashboard">
        <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
          <h2 style={{ marginBottom: '8px' }}>Profile Required</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Please complete your profile before accessing the dashboard.
          </p>
          <a href="/complete-profile" className="btn btn-primary">Complete Profile</a>
        </div>
      </Layout>
    );
  }

  return (
    <Layout pageTitle="Student Dashboard">
      {loading ? (
        <div className="page-loader"><div className="spinner" /></div>
      ) : (
        <>
          <div className="tabs">
            <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
            <button className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`} onClick={() => setActiveTab('requests')}>My Requests</button>
            <button className={`tab-btn ${activeTab === 'passes' ? 'active' : ''}`} onClick={() => setActiveTab('passes')}>My Passes</button>
          </div>

          {activeTab === 'overview' && (
            <>
              <div className="flex justify-between items-center mb-lg">
                <h2 className="section-title" style={{ marginBottom: 0 }}>My Overview</h2>
                <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                  <Plus size={18} /> Request Pass
                </button>
              </div>
              <div className="stats-grid">
                <StatCard icon={Clock} label="Pending" value={pendingCount} color="yellow" />
                <StatCard icon={CheckCircle} label="Approved" value={approvedCount} color="green" />
                <StatCard icon={XCircle} label="Rejected" value={rejectedCount} color="red" />
                <StatCard icon={QrCode} label="Total Passes" value={passes.length} color="blue" />
              </div>
            </>
          )}

          {activeTab === 'requests' && (
            <>
              <div className="flex justify-between items-center mb-lg">
                <h2 className="section-title" style={{ marginBottom: 0 }}>My Requests</h2>
                <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                  <Plus size={18} /> New Request
                </button>
              </div>
              <div className="card">
                <div className="data-table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Reason</th>
                        <th>Destination</th>
                        <th>From</th>
                        <th>To</th>
                        <th>Status</th>
                        <th>Submitted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.length === 0 ? (
                        <tr><td colSpan={6}><div className="empty-state"><FileText size={40} /><p>No requests yet</p></div></td></tr>
                      ) : (
                        requests.map((r) => (
                          <tr key={r.id}>
                            <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{r.reason}</td>
                            <td>{r.destination}</td>
                            <td>{formatDate(r.fromDate)}</td>
                            <td>{formatDate(r.toDate)}</td>
                            <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                            <td>{formatDate(r.createdAt)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {activeTab === 'passes' && (
            <>
              <h2 className="section-title">My Passes</h2>
              <div className="card">
                <div className="data-table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Pass ID</th>
                        <th>Valid From</th>
                        <th>Valid To</th>
                        <th>Status</th>
                        <th>QR Code</th>
                      </tr>
                    </thead>
                    <tbody>
                      {passes.length === 0 ? (
                        <tr><td colSpan={5}><div className="empty-state"><QrCode size={40} /><p>No passes yet</p></div></td></tr>
                      ) : (
                        passes.map((p) => (
                          <tr key={p.id}>
                            <td style={{ color: 'var(--text-accent)', fontWeight: 600 }}>{p.passId}</td>
                            <td>{formatDateTime(p.validFrom)}</td>
                            <td>{formatDateTime(p.validTo)}</td>
                            <td><span className={`badge badge-${p.status}`}>{p.status}</span></td>
                            <td>
                              {p.status === 'active' || p.status === 'upcoming' ? (
                                <button className="btn btn-sm btn-secondary" onClick={() => setQrModal({ open: true, pass: p })}>
                                  <QrCode size={14} /> Show
                                </button>
                              ) : '—'}
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

          {/* Create Request Modal */}
          <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Request Gate Pass">
            <form onSubmit={handleCreateRequest}>
              <div className="form-group">
                <label className="form-label">Reason</label>
                <textarea
                  className="form-textarea"
                  placeholder="Why do you need a pass?"
                  value={requestForm.reason}
                  onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Destination</label>
                <input
                  className="form-input"
                  placeholder="Where are you going?"
                  value={requestForm.destination}
                  onChange={(e) => setRequestForm({ ...requestForm, destination: e.target.value })}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">From Date</label>
                  <input
                    className="form-input"
                    type="datetime-local"
                    value={requestForm.fromDate}
                    onChange={(e) => setRequestForm({ ...requestForm, fromDate: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">To Date</label>
                  <input
                    className="form-input"
                    type="datetime-local"
                    value={requestForm.toDate}
                    onChange={(e) => setRequestForm({ ...requestForm, toDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Supporting Document (optional)</label>
                <input
                  className="form-input"
                  type="file"
                  onChange={(e) => setDocFile(e.target.files[0])}
                  accept=".pdf,.jpg,.jpeg,.png"
                />
              </div>
              <div className="modal-footer" style={{ padding: 0, marginTop: '16px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? <Loader2 className="spinner" size={16} /> : 'Submit Request'}
                </button>
              </div>
            </form>
          </Modal>

          {/* QR Code Modal */}
          <Modal isOpen={qrModal.open} onClose={() => setQrModal({ open: false, pass: null })} title="Your Gate Pass QR Code">
            {qrModal.pass && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                <div className="qr-container">
                  <QRCodeSVG value={qrModal.pass.qrCode} size={200} level="H" />
                  <div className="qr-label">{qrModal.pass.passId}</div>
                </div>
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  <p>Show this QR code at the gate</p>
                  <p style={{ marginTop: '4px' }}>
                    Valid: {formatDateTime(qrModal.pass.validFrom)} — {formatDateTime(qrModal.pass.validTo)}
                  </p>
                </div>
              </div>
            )}
          </Modal>
        </>
      )}
    </Layout>
  );
}
