import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { FileText, QrCode, Plus, Clock, CheckCircle, XCircle, Loader2, AlertCircle, ChevronRight, TimerReset } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import Modal from '../components/Modal';
import { requestPass, getMyRequests, getMyPassesWithStatus, cancelPassRequest, requestExtension, getMyExtensionRequests } from '../services/passService';
import { formatISTDate, formatISTDateTime, parseISTDateTimeInput } from '../utils/dateUtils';

export default function StudentDashboard() {
  const [requests, setRequests] = useState([]);
  const [passes, setPasses] = useState([]);
  const [extensions, setExtensions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [needsProfile, setNeedsProfile] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (location.hash === '#passes') setActiveTab('passes');
    else if (location.hash === '#requests') setActiveTab('requests');
  }, [location.hash]);

  const [showCreate, setShowCreate] = useState(false);
  const [requestForm, setRequestForm] = useState({ reason: '', destination: '', fromDate: '', toDate: '' });
  const [docFile, setDocFile] = useState(null);
  const [creating, setCreating] = useState(false);
  const [qrModal, setQrModal] = useState({ open: false, pass: null });

  // Extension state
  const [showExtension, setShowExtension] = useState(false);
  const [extensionForm, setExtensionForm] = useState({ requestedHours: 1, remark: '' });
  const [extDocFile, setExtDocFile] = useState(null);
  const [extCreating, setExtCreating] = useState(false);
  const [extensionPassId, setExtensionPassId] = useState(null);

  const fetchAll = async () => {
    try {
      const [reqRes, passRes, extRes] = await Promise.all([
        getMyRequests(),
        getMyPassesWithStatus(),
        getMyExtensionRequests().catch(() => ({ extensions: [] }))
      ]);
      setRequests((reqRes.requests || []).filter(r => r.status !== 'cancelled'));
      setPasses(passRes.passes || []);
      setExtensions(extRes.extensions || []);
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.message.includes('profile')) {
        setNeedsProfile(true);
      } else {
        toast.error(err.response?.data?.message || 'Failed to load data');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    const { reason, destination, fromDate, toDate } = requestForm;
    if (!reason || !destination || !fromDate || !toDate) { toast.error('All fields are required'); return; }
    setCreating(true);
    try {
      await requestPass({ 
        reason, 
        destination, 
        fromDate: parseISTDateTimeInput(fromDate), 
        toDate: parseISTDateTimeInput(toDate), 
        document: docFile 
      });
      toast.success('Pass request submitted successfully!');
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

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this request?')) return;
    try {
      await cancelPassRequest(id);
      toast.success('Request cancelled successfully');
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel request');
    }
  };

  const openExtensionModal = (pass) => {
    setExtensionPassId(pass.id);
    setExtensionForm({ requestedHours: 1, remark: '' });
    setExtDocFile(null);
    setShowExtension(true);
  };

  const handleRequestExtension = async (e) => {
    e.preventDefault();
    if (!extensionForm.remark.trim()) { toast.error('Please provide a reason for extension'); return; }
    setExtCreating(true);
    try {
      const data = {
        passId: extensionPassId,
        requestedHours: extensionForm.requestedHours,
        remark: extensionForm.remark,
      };
      if (extDocFile) data.document = extDocFile;
      await requestExtension(data);
      toast.success('Extension request submitted!');
      setShowExtension(false);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit extension');
    } finally {
      setExtCreating(false);
    }
  };

  const getExtensionForPass = (passObjId) => {
    return extensions.find(ext => {
      const extPassId = ext.passId?._id || ext.passId;
      return extPassId === passObjId || extPassId?.toString() === passObjId?.toString();
    });
  };

  const formatDate = formatISTDate;
  const formatDateTime = formatISTDateTime;

  const pendingCount = requests.filter(r => r.status === 'pending' || r.status === 'forwarded').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;

  // Active pass & pending request for overview
  const activePass = passes.find(p => p.status === 'active' || p.status === 'out');
  const pendingRequest = requests.find(r => r.status === 'pending' || r.status === 'forwarded');
  const recentRequests = requests.slice(0, 3);
  const pendingExtension = extensions.find(e => e.status === 'pending' || e.status === 'forwarded');

  if (needsProfile) {
    return (
      <Layout pageTitle="Student Dashboard">
        <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
          <h2 style={{ marginBottom: '8px' }}>Profile Required</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Please complete your profile before accessing the dashboard.</p>
          <a href="/complete-profile" className="btn btn-primary">Complete Profile</a>
        </div>
      </Layout>
    );
  }

  return (
    <Layout pageTitle="Student Dashboard">
      {loading ? (
        <div className="page-loader"><Loader2 className="spinner" /></div>
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

              {/* Stat Cards */}
              <motion.div className="stats-grid" initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }}>
                <StatCard icon={Clock} label="Pending" value={pendingCount} color="yellow" onClick={() => setActiveTab('requests')} />
                <StatCard icon={CheckCircle} label="Approved" value={approvedCount} color="green" onClick={() => setActiveTab('requests')} />
                <StatCard icon={XCircle} label="Rejected" value={rejectedCount} color="red" onClick={() => setActiveTab('requests')} />
                <StatCard icon={QrCode} label="Total Passes" value={passes.length} color="blue" onClick={() => setActiveTab('passes')} />
              </motion.div>

              {/* Active Pass Banner */}
              {activePass && (
                <div style={{
                  background: 'rgba(34, 197, 94, 0.08)',
                  border: '1px solid rgba(34, 197, 94, 0.25)',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  marginBottom: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
                    <div>
                      <p style={{ color: '#22c55e', fontWeight: 600, fontSize: '14px' }}>Active Pass {activePass.status === 'out' ? '(Currently Out)' : ''}</p>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                        {activePass.passId} · Valid until {formatDateTime(activePass.validTo)}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {activePass.status === 'out' && !pendingExtension && (
                      <button className="btn btn-sm btn-warning" onClick={() => openExtensionModal(activePass)}>
                        <TimerReset size={14} /> Extend Time
                      </button>
                    )}
                    <button className="btn btn-sm btn-secondary" onClick={() => setQrModal({ open: true, pass: activePass })}>
                      <QrCode size={14} /> Show QR
                    </button>
                  </div>
                </div>
              )}

              {/* Pending Extension Banner */}
              {pendingExtension && (
                <div style={{
                  background: 'rgba(168, 85, 247, 0.08)',
                  border: '1px solid rgba(168, 85, 247, 0.25)',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  marginBottom: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  flexWrap: 'wrap'
                }}>
                  <TimerReset size={18} color="#a855f7" />
                  <div>
                    <p style={{ color: '#a855f7', fontWeight: 600, fontSize: '14px' }}>Extension Request {pendingExtension.status === 'forwarded' ? '(Forwarded to Warden)' : '(Pending)'}</p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                      Requested +{pendingExtension.requestedHours}hr · "{pendingExtension.remark}"
                    </p>
                  </div>
                </div>
              )}

              {/* Pending Request Banner */}
              {pendingRequest && (
                <div style={{
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  marginBottom: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  flexWrap: 'wrap'
                }}>
                  <AlertCircle size={18} color="#f59e0b" />
                  <div>
                    <p style={{ color: '#f59e0b', fontWeight: 600, fontSize: '14px' }}>Request Pending</p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                      "{pendingRequest.reason}" to {pendingRequest.destination} · Submitted {formatDate(pendingRequest.createdAt)}
                    </p>
                  </div>
                </div>
              )}

              {/* Two column layout for bottom section */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '24px'
              }}>
                {/* Recent Requests */}
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Recent Requests</h3>
                    <button
                      onClick={() => setActiveTab('requests')}
                      style={{ background: 'none', border: 'none', color: 'var(--text-accent)', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      View all <ChevronRight size={14} />
                    </button>
                  </div>
                  {recentRequests.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                      <FileText size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                      <p style={{ fontSize: '13px' }}>No requests yet</p>
                    </div>
                  ) : (
                    recentRequests.map(r => (
                      <div key={r.id} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 0',
                        borderBottom: '1px solid var(--border-subtle)'
                      }}>
                        <div>
                          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{r.reason}</p>
                          <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{r.destination} · {formatDate(r.createdAt)}</p>
                        </div>
                        <span className={`badge badge-${r.status}`}>{r.status}</span>
                      </div>
                    ))
                  )}
                </div>

                {/* Quick Tips */}
                <div className="card">
                  <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>Quick Guide</h3>
                  {[
                    { icon: Plus, title: 'Submit a Request', desc: 'Click "Request Pass" and fill in reason, destination and dates.' },
                    { icon: Clock, title: 'Wait for Approval', desc: 'Manager reviews your request. You\'ll see status update here.' },
                    { icon: QrCode, title: 'Show QR at Gate', desc: 'Once approved, show the QR code from My Passes to the gatekeeper.' },
                    { icon: TimerReset, title: 'Need More Time?', desc: 'While out, click "Extend Time" to request up to 4 extra hours.' },
                  ].map((tip, i) => (
                    <div key={i} style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
                      <tip.icon size={18} style={{ flexShrink: 0, color: 'var(--text-accent)', marginTop: '2px' }} />
                      <div>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{tip.title}</p>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{tip.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
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
                        <th>Remark</th>
                        <th>Submitted</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.length === 0 ? (
                        <tr><td colSpan={7}><div className="empty-state"><FileText size={40} /><p>No requests yet</p></div></td></tr>
                      ) : (
                        requests.map((r) => (
                          <tr key={r.id}>
                            <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{r.reason}</td>
                            <td>{r.destination}</td>
                            <td>{formatDate(r.fromDate)}</td>
                            <td>{formatDate(r.toDate)}</td>
                            <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                            <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                              {r.wardenAction?.remark || r.managerAction?.remark || '—'}
                            </td>
                            <td>{formatDate(r.createdAt)}</td>
                            <td>
                              {r.status === 'pending' && (
                                <button className="btn btn-sm btn-danger" onClick={() => handleCancel(r.id)}>Cancel</button>
                              )}
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
                        <th>Extension</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {passes.length === 0 ? (
                        <tr><td colSpan={6}><div className="empty-state"><QrCode size={40} /><p>No passes yet</p></div></td></tr>
                      ) : (
                        passes.map((p) => {
                          const ext = getExtensionForPass(p.id);
                          return (
                            <tr key={p.id}>
                              <td style={{ color: 'var(--text-accent)', fontWeight: 600 }}>{p.passId}</td>
                              <td>{formatDateTime(p.validFrom)}</td>
                              <td>{formatDateTime(p.validTo)}</td>
                              <td><span className={`badge badge-${p.status}`}>{p.status}</span></td>
                              <td>
                                {ext ? (
                                  <div>
                                    <span className={`badge badge-${ext.status}`}>
                                      {ext.status === 'approved' ? `+${ext.requestedHours}hr ✓` : ext.status === 'rejected' ? `+${ext.requestedHours}hr ✗` : `+${ext.requestedHours}hr ⏳`}
                                    </span>
                                    {ext.remark && <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>"{ext.remark}"</p>}
                                  </div>
                                ) : (
                                  <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>
                                )}
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                  {(p.status === 'active' || p.status === 'out' || p.status === 'upcoming') && (
                                    <button className="btn btn-sm btn-secondary" onClick={() => setQrModal({ open: true, pass: p })}>
                                      <QrCode size={14} /> QR
                                    </button>
                                  )}
                                  {p.status === 'out' && !ext?.status?.match(/pending|forwarded/) && (
                                    <button className="btn btn-sm btn-warning" onClick={() => openExtensionModal(p)}>
                                      <TimerReset size={14} /> Extend
                                    </button>
                                  )}
                                  {!(p.status === 'active' || p.status === 'out' || p.status === 'upcoming') && !ext && (
                                    <span style={{ color: 'var(--text-secondary)' }}>{p.status}</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
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
                <textarea className="form-textarea" placeholder="Why do you need a pass?" value={requestForm.reason} onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Destination</label>
                <input className="form-input" placeholder="Where are you going?" value={requestForm.destination} onChange={(e) => setRequestForm({ ...requestForm, destination: e.target.value })} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">From Date</label>
                  <input className="form-input" type="datetime-local" value={requestForm.fromDate} onChange={(e) => setRequestForm({ ...requestForm, fromDate: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">To Date</label>
                  <input className="form-input" type="datetime-local" value={requestForm.toDate} onChange={(e) => setRequestForm({ ...requestForm, toDate: e.target.value })} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Supporting Document (optional)</label>
                <input className="form-input" type="file" onChange={(e) => setDocFile(e.target.files[0])} accept=".pdf,.jpg,.jpeg,.png" />
              </div>
              <div className="modal-footer" style={{ padding: 0, marginTop: '16px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? <Loader2 className="spinner" size={16} /> : 'Submit Request'}
                </button>
              </div>
            </form>
          </Modal>

          {/* Extension Request Modal */}
          <Modal isOpen={showExtension} onClose={() => setShowExtension(false)} title="Request Time Extension">
            <form onSubmit={handleRequestExtension}>
              <div style={{ background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.2)', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                <p style={{ color: '#a855f7', fontSize: '13px', fontWeight: 600 }}>⏰ You can extend your pass by up to 4 hours</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px' }}>Your request will be sent to the hostel manager for approval.</p>
              </div>
              <div className="form-group">
                <label className="form-label">Extension Duration (hours)</label>
                <select className="form-select" value={extensionForm.requestedHours} onChange={(e) => setExtensionForm({ ...extensionForm, requestedHours: parseInt(e.target.value) })}>
                  <option value={1}>1 Hour</option>
                  <option value={2}>2 Hours</option>
                  <option value={3}>3 Hours</option>
                  <option value={4}>4 Hours</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Reason for Extension *</label>
                <textarea className="form-textarea" placeholder="Why do you need more time?" value={extensionForm.remark} onChange={(e) => setExtensionForm({ ...extensionForm, remark: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Supporting Document (optional)</label>
                <input className="form-input" type="file" onChange={(e) => setExtDocFile(e.target.files[0])} accept=".pdf,.jpg,.jpeg,.png" />
              </div>
              <div className="modal-footer" style={{ padding: 0, marginTop: '16px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowExtension(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={extCreating} style={{ background: '#a855f7' }}>
                  {extCreating ? <Loader2 className="spinner" size={16} /> : 'Request Extension'}
                </button>
              </div>
            </form>
          </Modal>

          {/* QR Code Modal */}
          <Modal isOpen={qrModal.open} onClose={() => setQrModal({ open: false, pass: null })} title="Your Gate Pass QR Code">
            {qrModal.pass && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                <div className="qr-container" style={{ background: 'white', padding: '16px', borderRadius: '8px' }}>
                  <QRCodeSVG value={qrModal.pass.qrCode} size={200} level="H" />
                </div>
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  <p style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '16px', marginBottom: '4px' }}>
                    Pass ID: {qrModal.pass.passId}
                  </p>
                  <p style={{
                    fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px',
                    background: 'var(--bg-glass)', padding: '4px 10px', borderRadius: '6px',
                    fontFamily: 'monospace', userSelect: 'all', cursor: 'text'
                  }}>
                    {qrModal.pass.qrCode}
                  </p>
                  <p>Show this QR code to the gatekeeper at the gate</p>
                  <p style={{ marginTop: '4px' }}>Valid: {formatDateTime(qrModal.pass.validFrom)} — {formatDateTime(qrModal.pass.validTo)}</p>
                  <p style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                    The gatekeeper can also use your Pass ID: <strong style={{ color: 'var(--text-accent)' }}>{qrModal.pass.passId}</strong>
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