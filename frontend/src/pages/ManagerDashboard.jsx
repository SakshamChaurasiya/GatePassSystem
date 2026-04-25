import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, UserPlus, FileText, Check, X as XIcon, Forward, Loader2, Upload, ExternalLink, Clock, CheckCircle, AlertCircle, ChevronRight, History } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import Modal from '../components/Modal';
import NotificationBell from '../components/NotificationBell';
import StudentHistoryModal from '../components/StudentHistoryModal';
import LivePassesPanel from '../components/LivePassesPanel';
import api from '../services/api';
import { createUser, getUsers, bulkUploadStudents } from '../services/userService';
import { getAllPassRequests, handlePassAction } from '../services/passService';

export default function ManagerDashboard() {
  const [stats, setStats] = useState(null);
  const [passRequests, setPassRequests] = useState([]);
  const [allUsers, setAllUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedRoleView, setSelectedRoleView] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [creating, setCreating] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [actionModal, setActionModal] = useState({ open: false, request: null, action: '' });
  const [remark, setRemark] = useState('');
  const [acting, setActing] = useState(false);
  const [historyModal, setHistoryModal] = useState({ open: false, studentId: null, studentName: '' });

  const fetchAll = async () => {
    try {
      setLoading(true);
      const results = await Promise.allSettled([
        api.get('/user/dashboard'),
        getAllPassRequests('pending'),
        getUsers(),
      ]);
      if (results[0].status === 'fulfilled') setStats(results[0].value.data?.stats || {});
      if (results[1].status === 'fulfilled') setPassRequests(results[1].value.requests || []);
      else setPassRequests([]);
      if (results[2].status === 'fulfilled') setAllUsers(results[2].value.data || {});
    } catch (err) {
      toast.error('Data sync failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) { toast.error('All fields are required'); return; }
    setCreating(true);
    try {
      const res = await createUser({ ...formData, role: 'student' });
      toast.success(`Student created! Temp password: ${res.tempPassword}`, { duration: 8000 });
      setShowCreate(false); setFormData({ name: '', email: '' }); fetchAll();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setCreating(false); }
  };

  const handleBulkUpload = async (e) => {
    e.preventDefault();
    if (!csvFile) { toast.error('Please select a CSV file'); return; }
    setUploading(true);
    try { await bulkUploadStudents(csvFile); toast.success('Students uploaded!'); setShowBulkUpload(false); setCsvFile(null); fetchAll(); }
    catch (err) { toast.error(err.response?.data?.message || 'Bulk upload failed'); }
    finally { setUploading(false); }
  };

  const handleAction = async () => {
    if (!actionModal.request) return;
    setActing(true);
    try {
      const requestId = actionModal.request.id || actionModal.request._id;
      await handlePassAction(requestId, actionModal.action, remark);
      toast.success(actionModal.action === 'forward' ? 'Forwarded to Warden' : `${actionModal.action}ed successfully`);
      setActionModal({ open: false, request: null, action: '' }); setRemark(''); fetchAll();
    } catch (err) { toast.error(err.response?.data?.message || 'Action failed'); }
    finally { setActing(false); }
  };

  const getFilteredUsers = () => {
    if (!selectedRoleView) return [];
    if (selectedRoleView === 'Total') {
      if (Array.isArray(allUsers)) return allUsers;
      return Object.values(allUsers).flat().filter(u => u && typeof u === 'object' && u.name);
    }
    const roleMap = { 'Students': 'student', 'Managers': 'manager' };
    const roleFilter = roleMap[selectedRoleView];
    if (Array.isArray(allUsers)) return allUsers.filter(u => u.role === roleFilter);
    const key = selectedRoleView.toLowerCase();
    return allUsers[key] || allUsers[key + 's'] || [];
  };

  const getStudentsList = () => {
    if (Array.isArray(allUsers)) return allUsers.filter(u => u.role === 'student');
    return allUsers.students || [];
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const recentRequests = passRequests.slice(0, 3);

  return (
    <Layout pageTitle="Manager Dashboard" headerRight={<NotificationBell />}>
      {loading ? (
        <div className="page-loader"><Loader2 className="spinner" /></div>
      ) : (
        <>
          <div className="tabs">
            <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
            <button className={`tab-btn ${activeTab === 'passes' ? 'active' : ''}`} onClick={() => setActiveTab('passes')}>Pass Requests</button>
            <button className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>Student History</button>
            <button className={`tab-btn ${activeTab === 'live' ? 'active' : ''}`} onClick={() => setActiveTab('live')}>Live Passes</button>
          </div>

          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <>
              <div className="flex justify-between items-center mb-lg">
                <h2 className="section-title" style={{ marginBottom: 0 }}>Hostel Overview</h2>
                <div className="btn-group">
                  <button className="btn btn-secondary" onClick={() => setShowBulkUpload(true)}><Upload size={18} /> Bulk Upload</button>
                  <button className="btn btn-primary" onClick={() => setShowCreate(true)}><UserPlus size={18} /> Create Student</button>
                </div>
              </div>
              <motion.div className="stats-grid" initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }}>
                <div onClick={() => setSelectedRoleView('Total')} style={{ cursor: 'pointer' }}><StatCard icon={Users} label="Total Users" value={stats?.total || 0} color="blue" /></div>
                <div onClick={() => setSelectedRoleView('Students')} style={{ cursor: 'pointer' }}><StatCard icon={Users} label="Students" value={stats?.students || 0} color="green" /></div>
                <div onClick={() => setActiveTab('passes')} style={{ cursor: 'pointer' }}><StatCard icon={FileText} label="Pending Requests" value={passRequests.length} color="red" /></div>
                <div onClick={() => setActiveTab('live')} style={{ cursor: 'pointer' }}><StatCard icon={Clock} label="Live Passes" value="→" color="purple" /></div>
              </motion.div>

              {passRequests.length > 0 && (
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px', padding: '14px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <AlertCircle size={18} color="#ef4444" />
                    <p style={{ color: '#ef4444', fontWeight: 600, fontSize: '14px' }}>{passRequests.length} pending request{passRequests.length > 1 ? 's' : ''}</p>
                  </div>
                  <button className="btn btn-sm btn-danger" onClick={() => setActiveTab('passes')}>Review Now <ChevronRight size={14} /></button>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Recent Requests</h3>
                    <button onClick={() => setActiveTab('passes')} style={{ background: 'none', border: 'none', color: 'var(--text-accent)', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>View all <ChevronRight size={14} /></button>
                  </div>
                  {recentRequests.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}><CheckCircle size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} /><p style={{ fontSize: '13px' }}>No pending requests</p></div>
                  ) : recentRequests.map(r => (
                    <div key={r.id || r._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                      <div>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{r.student?.name || 'Unknown'}</p>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{r.reason} · {r.destination}</p>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn btn-sm btn-success" onClick={() => setActionModal({ open: true, request: r, action: 'approve' })}><Check size={12} /></button>
                        <button className="btn btn-sm btn-danger" onClick={() => setActionModal({ open: true, request: r, action: 'reject' })}><XIcon size={12} /></button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="card">
                  <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>Quick Actions</h3>
                  {[
                    { icon: UserPlus, label: 'Create Student', desc: 'Add a student', action: () => setShowCreate(true), color: 'var(--accent-primary)' },
                    { icon: Upload, label: 'Bulk Upload', desc: 'Upload via CSV', action: () => setShowBulkUpload(true), color: '#22c55e' },
                    { icon: FileText, label: 'Pass Requests', desc: `${passRequests.length} pending`, action: () => setActiveTab('passes'), color: '#ef4444' },
                    { icon: History, label: 'Student History', desc: 'View pass history', action: () => setActiveTab('history'), color: '#8b5cf6' },
                  ].map((item, i) => (
                    <div key={i} onClick={item.action} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px', borderRadius: '8px', cursor: 'pointer', marginBottom: '8px', transition: 'background 0.15s', border: '1px solid var(--border-subtle)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-glass-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: `${item.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><item.icon size={18} color={item.color} /></div>
                      <div><p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{item.label}</p><p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{item.desc}</p></div>
                      <ChevronRight size={16} color="var(--text-muted)" style={{ marginLeft: 'auto' }} />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* PASS REQUESTS TAB */}
          {activeTab === 'passes' && (
            <>
              <h2 className="section-title">Pending Pass Requests</h2>
              <div className="card"><div className="data-table-wrapper">
                <table className="data-table">
                  <thead><tr><th>Student</th><th>Reason</th><th>Destination</th><th>From</th><th>To</th><th>Doc</th><th>Actions</th></tr></thead>
                  <tbody>
                    {passRequests.length === 0 ? (
                      <tr><td colSpan={7}><div className="empty-state"><FileText size={40} /><p>No pending requests.</p></div></td></tr>
                    ) : passRequests.map((r) => (
                      <tr key={r.id || r._id}>
                        <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                          {r.student?.name || 'Unknown'}
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 400 }}>{r.student?.email}</div>
                          {r.student?.id && <button onClick={() => setHistoryModal({ open: true, studentId: r.student.id, studentName: r.student.name })} style={{ background: 'none', border: 'none', color: 'var(--text-accent)', fontSize: '11px', cursor: 'pointer', padding: 0, marginTop: '2px' }}>View History</button>}
                        </td>
                        <td>{r.reason}</td><td>{r.destination}</td>
                        <td>{formatDate(r.fromDate)}</td><td>{formatDate(r.toDate)}</td>
                        <td>{r.supportingDoc ? <a href={r.supportingDoc} target="_blank" rel="noreferrer" className="btn btn-sm btn-secondary"><ExternalLink size={14} /></a> : '—'}</td>
                        <td><div className="btn-group">
                          <button className="btn btn-success btn-sm" onClick={() => setActionModal({ open: true, request: r, action: 'approve' })}><Check size={14} /></button>
                          <button className="btn btn-warning btn-sm" onClick={() => setActionModal({ open: true, request: r, action: 'forward' })}><Forward size={14} /></button>
                          <button className="btn btn-danger btn-sm" onClick={() => setActionModal({ open: true, request: r, action: 'reject' })}><XIcon size={14} /></button>
                        </div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div></div>
            </>
          )}

          {/* STUDENT HISTORY TAB */}
          {activeTab === 'history' && (
            <>
              <h2 className="section-title">Student History</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '13px' }}>Click on a student to view their complete pass request and pass history.</p>
              <div className="card"><div className="data-table-wrapper">
                <table className="data-table">
                  <thead><tr><th>Name</th><th>Email</th><th>Action</th></tr></thead>
                  <tbody>
                    {getStudentsList().length === 0 ? (
                      <tr><td colSpan={3}><div className="empty-state"><Users size={32} /><p>No students</p></div></td></tr>
                    ) : getStudentsList().map(s => (
                      <tr key={s._id}>
                        <td style={{ fontWeight: 600 }}>{s.name}</td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{s.email}</td>
                        <td><button className="btn btn-sm btn-secondary" onClick={() => setHistoryModal({ open: true, studentId: s._id, studentName: s.name })}><History size={14} /> View</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div></div>
            </>
          )}

          {/* LIVE PASSES TAB */}
          {activeTab === 'live' && (
            <>
              <h2 className="section-title">Live Pass Status</h2>
              <LivePassesPanel onViewStudentHistory={(id, name) => setHistoryModal({ open: true, studentId: id, studentName: name })} />
            </>
          )}

          {/* MODALS */}
          <StudentHistoryModal isOpen={historyModal.open} studentId={historyModal.studentId} studentName={historyModal.studentName} onClose={() => setHistoryModal({ open: false, studentId: null, studentName: '' })} />

          <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Student">
            <form onSubmit={handleCreateStudent}>
              <div className="form-group"><label className="form-label">Name</label><input className="form-input" placeholder="Student name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required /></div>
              <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" placeholder="student@cdgi.edu.in" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required /></div>
              <div className="modal-footer" style={{ padding: 0, marginTop: '16px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={creating}>{creating ? <Loader2 className="spinner" size={16} /> : 'Create Student'}</button>
              </div>
            </form>
          </Modal>

          <Modal isOpen={showBulkUpload} onClose={() => setShowBulkUpload(false)} title="Bulk Upload Students">
            <form onSubmit={handleBulkUpload}>
              <div className="form-group"><label className="form-label">Select CSV File</label><input className="form-input" type="file" accept=".csv" onChange={(e) => setCsvFile(e.target.files[0])} required /></div>
              <div className="modal-footer" style={{ padding: 0, marginTop: '16px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowBulkUpload(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={uploading}>{uploading ? <Loader2 className="spinner" size={16} /> : 'Start Upload'}</button>
              </div>
            </form>
          </Modal>

          <Modal isOpen={actionModal.open} onClose={() => setActionModal({ open: false, request: null, action: '' })} title={`${actionModal.action.charAt(0).toUpperCase() + actionModal.action.slice(1)} Request`}>
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)', fontSize: '14px' }}>
              Are you sure you want to <strong>{actionModal.action}</strong> this request from <strong>{actionModal.request?.student?.name || 'this student'}</strong>?
            </p>
            <div className="form-group"><label className="form-label">Remark (optional)</label><textarea className="form-textarea" placeholder="Enter reason..." value={remark} onChange={(e) => setRemark(e.target.value)} /></div>
            <div className="modal-footer" style={{ padding: 0 }}>
              <button className="btn btn-secondary" onClick={() => setActionModal({ open: false, request: null, action: '' })}>Cancel</button>
              <button className={`btn ${actionModal.action === 'approve' ? 'btn-success' : actionModal.action === 'forward' ? 'btn-warning' : 'btn-danger'}`} onClick={handleAction} disabled={acting}>
                {acting ? <Loader2 className="spinner" size={16} /> : actionModal.action.toUpperCase()}
              </button>
            </div>
          </Modal>

          <Modal isOpen={!!selectedRoleView} onClose={() => setSelectedRoleView(null)} title={`${selectedRoleView} List`}>
            <div className="data-table-wrapper" style={{ maxHeight: '400px' }}>
              <table className="data-table"><thead><tr><th>Name</th><th>Email</th></tr></thead>
                <tbody>{getFilteredUsers().map((u) => (<tr key={u._id}><td style={{ fontWeight: 600 }}>{u.name}</td><td style={{ color: 'var(--text-secondary)' }}>{u.email}</td></tr>))}</tbody>
              </table>
            </div>
            <div className="mt-lg"><button className="btn btn-secondary w-full" onClick={() => setSelectedRoleView(null)}>Close</button></div>
          </Modal>
        </>
      )}
    </Layout>
  );
}