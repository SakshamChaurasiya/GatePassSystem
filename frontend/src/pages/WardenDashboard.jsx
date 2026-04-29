import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, UserPlus, FileText, Check, X as XIcon, Loader2, AlertCircle, ChevronRight, KeyRound, History, Eye, TimerReset, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import Modal from '../components/Modal';
import NotificationBell from '../components/NotificationBell';
import StudentHistoryModal from '../components/StudentHistoryModal';
import LivePassesPanel from '../components/LivePassesPanel';
import { createUser, getUsers } from '../services/userService';
import { getAllPassRequests, handlePassAction, getManagerHistory, getAllExtensionRequests, handleExtensionAction } from '../services/passService';
import api from '../services/api';
import { formatISTDate } from '../utils/dateUtils';

export default function WardenDashboard() {
  const [stats, setStats] = useState(null);
  const [passRequests, setPassRequests] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedRoleView, setSelectedRoleView] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createRole, setCreateRole] = useState('manager');
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [creating, setCreating] = useState(false);
  const [actionModal, setActionModal] = useState({ open: false, request: null, action: '' });
  const [remark, setRemark] = useState('');
  const [acting, setActing] = useState(false);
  const [historyModal, setHistoryModal] = useState({ open: false, studentId: null, studentName: '' });
  const [managerHistoryModal, setManagerHistoryModal] = useState({ open: false, data: null, loading: false });
  const [extensionRequests, setExtensionRequests] = useState([]);
  const [extActionModal, setExtActionModal] = useState({ open: false, extension: null, action: '' });
  const [extRemark, setExtRemark] = useState('');
  const [extActing, setExtActing] = useState(false);

  const fetchAll = async () => {
    try {
      const [statsRes, passRes, usersRes, extRes] = await Promise.all([
        api.get('/user/dashboard'), getAllPassRequests(), getUsers(), getAllExtensionRequests().catch(() => ({ extensions: [] })),
      ]);
      setStats(statsRes.data?.stats || {});
      setPassRequests(passRes.requests || []);
      setAllUsers(usersRes.data || {});
      setExtensionRequests(extRes.extensions || []);
    } catch (err) { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const getFilteredUsers = () => {
    if (!selectedRoleView) return [];
    const roleMap = { 'Managers': 'managers', 'Gatekeepers': 'gatekeepers', 'Students': 'students' };
    if (selectedRoleView === 'Total') return Object.values(allUsers).flat().filter(u => typeof u === 'object' && u !== null && u.name);
    return allUsers[roleMap[selectedRoleView]] || [];
  };

  const getManagersList = () => allUsers.managers || [];
  const getStudentsList = () => allUsers.students || [];

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) { toast.error('All fields required'); return; }
    try { 
      const res = await createUser({ ...formData, role: createRole }); 
      toast.success(res.message || `${createRole} created!`); 
      setShowCreate(false); setFormData({ name: '', email: '' }); fetchAll(); 
    }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setCreating(false); }
  };

  const handleAction = async () => {
    if (!actionModal.request) return;
    setActing(true);
    try {
      await handlePassAction(actionModal.request._id || actionModal.request.id, actionModal.action, remark);
      toast.success(`Request ${actionModal.action}ed`);
      setActionModal({ open: false, request: null, action: '' }); setRemark(''); fetchAll();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setActing(false); }
  };

  const handleExtAction = async () => {
    if (!extActionModal.extension) return;
    setExtActing(true);
    try {
      await handleExtensionAction(extActionModal.extension.id, extActionModal.action, extRemark);
      toast.success(`Extension ${extActionModal.action}ed`);
      setExtActionModal({ open: false, extension: null, action: '' }); setExtRemark(''); fetchAll();
    } catch (err) { toast.error(err.response?.data?.message || 'Action failed'); }
    finally { setExtActing(false); }
  };

  const viewManagerHistory = async (managerId) => {
    setManagerHistoryModal({ open: true, data: null, loading: true });
    try {
      const res = await getManagerHistory(managerId);
      setManagerHistoryModal({ open: true, data: res, loading: false });
    } catch (err) { toast.error('Failed to load manager history'); setManagerHistoryModal({ open: false, data: null, loading: false }); }
  };

  const formatDate = formatISTDate;
  const recentRequests = passRequests.slice(0, 3);

  return (
    <Layout pageTitle="Warden Dashboard" headerRight={<NotificationBell />}>
      {loading ? (
        <div className="page-loader"><div className="spinner" /></div>
      ) : (
        <>
          <div className="tabs">
            <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
            <button className={`tab-btn ${activeTab === 'passes' ? 'active' : ''}`} onClick={() => setActiveTab('passes')}>Forwarded</button>
            <button className={`tab-btn ${activeTab === 'extensions' ? 'active' : ''}`} onClick={() => setActiveTab('extensions')}>
              Extensions {extensionRequests.length > 0 && <span style={{ background: '#a855f7', color: '#fff', borderRadius: '10px', padding: '1px 7px', fontSize: '11px', marginLeft: '6px' }}>{extensionRequests.length}</span>}
            </button>
            <button className={`tab-btn ${activeTab === 'managerHistory' ? 'active' : ''}`} onClick={() => setActiveTab('managerHistory')}>Manager History</button>
            <button className={`tab-btn ${activeTab === 'studentHistory' ? 'active' : ''}`} onClick={() => setActiveTab('studentHistory')}>Student History</button>
            <button className={`tab-btn ${activeTab === 'live' ? 'active' : ''}`} onClick={() => setActiveTab('live')}>Live Status</button>
          </div>

          {/* OVERVIEW */}
          {activeTab === 'overview' && (
            <>
              <div className="flex justify-between items-center mb-lg">
                <h2 className="section-title" style={{ marginBottom: 0 }}>Hostel Overview</h2>
                <div className="btn-group">
                  <button className="btn btn-primary" onClick={() => { setCreateRole('manager'); setShowCreate(true); }}><UserPlus size={18} /> Create Manager</button>
                  <button className="btn btn-secondary" onClick={() => { setCreateRole('gatekeeper'); setShowCreate(true); }}><UserPlus size={18} /> Create Gatekeeper</button>
                </div>
              </div>
              <motion.div className="stats-grid" initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }}>
                <div onClick={() => setSelectedRoleView('Total')} style={{ cursor: 'pointer' }}><StatCard icon={Users} label="Total" value={stats?.total || 0} color="blue" /></div>
                <div onClick={() => setSelectedRoleView('Managers')} style={{ cursor: 'pointer' }}><StatCard icon={Users} label="Managers" value={stats?.managers || 0} color="green" /></div>
                <div onClick={() => setSelectedRoleView('Gatekeepers')} style={{ cursor: 'pointer' }}><StatCard icon={Users} label="Gatekeepers" value={stats?.gatekeepers || 0} color="purple" /></div>
                <div onClick={() => setSelectedRoleView('Students')} style={{ cursor: 'pointer' }}><StatCard icon={Users} label="Students" value={stats?.students || 0} color="yellow" /></div>
              </motion.div>
              {passRequests.length > 0 && (
                <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: '12px', padding: '14px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><AlertCircle size={18} color="#3b82f6" /><p style={{ color: '#3b82f6', fontWeight: 600, fontSize: '14px' }}>{passRequests.length} forwarded request{passRequests.length > 1 ? 's' : ''}</p></div>
                  <button className="btn btn-sm btn-secondary" onClick={() => setActiveTab('passes')}>Review <ChevronRight size={14} /></button>
                </div>
              )}
              {extensionRequests.length > 0 && (
                <div style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.25)', borderRadius: '12px', padding: '14px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><TimerReset size={18} color="#a855f7" /><p style={{ color: '#a855f7', fontWeight: 600, fontSize: '14px' }}>{extensionRequests.length} forwarded extension{extensionRequests.length > 1 ? 's' : ''}</p></div>
                  <button className="btn btn-sm btn-secondary" onClick={() => setActiveTab('extensions')}>Review <ChevronRight size={14} /></button>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Forwarded Requests</h3>
                    <button onClick={() => setActiveTab('passes')} style={{ background: 'none', border: 'none', color: 'var(--text-accent)', fontSize: '13px', cursor: 'pointer' }}>View all <ChevronRight size={14} /></button>
                  </div>
                  {recentRequests.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}><Check size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} /><p style={{ fontSize: '13px' }}>No forwarded requests</p></div>
                  ) : recentRequests.map(r => (
                    <div key={r._id || r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                      <div><p style={{ fontSize: '13px', fontWeight: 600 }}>{r.student?.name || 'Unknown'}</p><p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{r.reason}</p></div>
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
                    { icon: UserPlus, label: 'Create Manager', action: () => { setCreateRole('manager'); setShowCreate(true); }, color: 'var(--accent-primary)' },
                    { icon: KeyRound, label: 'Create Gatekeeper', action: () => { setCreateRole('gatekeeper'); setShowCreate(true); }, color: '#22c55e' },
                    { icon: History, label: 'Manager History', action: () => setActiveTab('managerHistory'), color: '#8b5cf6' },
                    { icon: Eye, label: 'Live Status', action: () => setActiveTab('live'), color: '#f59e0b' },
                  ].map((item, i) => (
                    <div key={i} onClick={item.action} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px', borderRadius: '8px', cursor: 'pointer', marginBottom: '8px', border: '1px solid var(--border-subtle)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-glass-hover)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: `${item.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><item.icon size={18} color={item.color} /></div>
                      <p style={{ fontSize: '13px', fontWeight: 600 }}>{item.label}</p>
                      <ChevronRight size={16} color="var(--text-muted)" style={{ marginLeft: 'auto' }} />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* FORWARDED PASSES TAB */}
          {activeTab === 'passes' && (
            <><h2 className="section-title">Forwarded Pass Requests</h2>
              <div className="card"><div className="data-table-wrapper">
                <table className="data-table">
                  <thead><tr><th>Student</th><th>Reason</th><th>Destination</th><th>From</th><th>To</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {passRequests.length === 0 ? (
                      <tr><td colSpan={7}><div className="empty-state"><FileText size={40} /><p>No forwarded requests</p></div></td></tr>
                    ) : passRequests.map((r) => (
                      <tr key={r._id || r.id}>
                        <td style={{ fontWeight: 600 }}>{r.student?.name || '—'}</td>
                        <td>{r.reason}</td><td>{r.destination}</td>
                        <td>{formatDate(r.fromDate)}</td><td>{formatDate(r.toDate)}</td>
                        <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                        <td><div className="btn-group">
                          <button className="btn btn-success btn-sm" onClick={() => setActionModal({ open: true, request: r, action: 'approve' })}>Approve</button>
                          <button className="btn btn-danger btn-sm" onClick={() => setActionModal({ open: true, request: r, action: 'reject' })}>Reject</button>
                        </div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div></div>
            </>
          )}

          {/* MANAGER HISTORY TAB */}
          {activeTab === 'managerHistory' && (
            <><h2 className="section-title">Manager History</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '13px' }}>View how many passes each manager has approved, rejected, or forwarded.</p>
              <div className="card"><div className="data-table-wrapper">
                <table className="data-table">
                  <thead><tr><th>Manager</th><th>Email</th><th>Action</th></tr></thead>
                  <tbody>
                    {getManagersList().length === 0 ? (
                      <tr><td colSpan={3}><div className="empty-state"><Users size={32} /><p>No managers</p></div></td></tr>
                    ) : getManagersList().map(m => (
                      <tr key={m._id}>
                        <td style={{ fontWeight: 600 }}>{m.name}</td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{m.email}</td>
                        <td><button className="btn btn-sm btn-secondary" onClick={() => viewManagerHistory(m._id)}><Eye size={14} /> View</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div></div>
            </>
          )}

          {/* STUDENT HISTORY TAB */}
          {activeTab === 'studentHistory' && (
            <><h2 className="section-title">Student History</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '13px' }}>Full history: who used passes, how many expired, rejected, late returns per student.</p>
              <div className="card"><div className="data-table-wrapper">
                <table className="data-table">
                  <thead><tr><th>Student</th><th>Email</th><th>Action</th></tr></thead>
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

          {/* LIVE STATUS TAB */}
          {activeTab === 'live' && (
            <><h2 className="section-title">Live Pass Status</h2>
              <LivePassesPanel onViewStudentHistory={(id, name) => setHistoryModal({ open: true, studentId: id, studentName: name })} />
            </>
          )}

          {/* EXTENSIONS TAB */}
          {activeTab === 'extensions' && (
            <>
              <h2 className="section-title">Forwarded Extension Requests</h2>
              <div className="card"><div className="data-table-wrapper">
                <table className="data-table">
                  <thead><tr><th>Student</th><th>Pass ID</th><th>Current Valid To</th><th>Requested</th><th>New Valid To</th><th>Reason</th><th>Doc</th><th>Actions</th></tr></thead>
                  <tbody>
                    {extensionRequests.length === 0 ? (
                      <tr><td colSpan={8}><div className="empty-state"><TimerReset size={40} /><p>No forwarded extensions</p></div></td></tr>
                    ) : extensionRequests.map((ext) => (
                      <tr key={ext.id}>
                        <td style={{ fontWeight: 600 }}>{ext.student?.name || 'Unknown'}<div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 400 }}>{ext.student?.email}</div></td>
                        <td style={{ color: 'var(--text-accent)', fontWeight: 600 }}>{ext.pass?.passId || '—'}</td>
                        <td>{formatDate(ext.originalValidTo)}</td>
                        <td><span style={{ color: '#a855f7', fontWeight: 700 }}>+{ext.requestedHours}hr</span></td>
                        <td>{formatDate(ext.newValidTo)}</td>
                        <td style={{ fontSize: '12px', maxWidth: '200px' }}>{ext.remark}</td>
                        <td>{ext.supportingDoc ? <a href={ext.supportingDoc} target="_blank" rel="noreferrer" className="btn btn-sm btn-secondary"><ExternalLink size={14} /></a> : '—'}</td>
                        <td><div className="btn-group">
                          <button className="btn btn-success btn-sm" onClick={() => setExtActionModal({ open: true, extension: ext, action: 'approve' })}>Approve</button>
                          <button className="btn btn-danger btn-sm" onClick={() => setExtActionModal({ open: true, extension: ext, action: 'reject' })}>Reject</button>
                        </div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div></div>
            </>
          )}

          {/* ALL MODALS */}
          <StudentHistoryModal isOpen={historyModal.open} studentId={historyModal.studentId} studentName={historyModal.studentName} onClose={() => setHistoryModal({ open: false, studentId: null, studentName: '' })} />

          {/* Manager History Detail Modal */}
          <Modal isOpen={managerHistoryModal.open} onClose={() => setManagerHistoryModal({ open: false, data: null, loading: false })} title={`Manager History — ${managerHistoryModal.data?.manager?.name || ''}`}>
            {managerHistoryModal.loading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}><Loader2 className="spinner" size={24} /></div>
            ) : managerHistoryModal.data ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '16px' }}>
                  {[
                    { label: 'Approved', val: managerHistoryModal.data.summary.approved, color: '#22c55e' },
                    { label: 'Rejected', val: managerHistoryModal.data.summary.rejected, color: '#ef4444' },
                    { label: 'Forwarded', val: managerHistoryModal.data.summary.forwarded, color: '#3b82f6' },
                  ].map(s => (
                    <div key={s.label} style={{ textAlign: 'center', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <p style={{ fontSize: '22px', fontWeight: 800, color: s.color }}>{s.val}</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.label}</p>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>Total Actions: {managerHistoryModal.data.summary.total}</p>
                <div className="data-table-wrapper" style={{ maxHeight: '300px' }}>
                  <table className="data-table">
                    <thead><tr><th>Student</th><th>Reason</th><th>Status</th><th>Date</th></tr></thead>
                    <tbody>
                      {[...(managerHistoryModal.data.approvedRequests || []),
                        ...(managerHistoryModal.data.rejectedRequests || []),
                        ...(managerHistoryModal.data.forwardedRequests || [])
                      ].sort((a, b) => new Date(b.managerAction?.actedAt || b.createdAt) - new Date(a.managerAction?.actedAt || a.createdAt))
                      .map(r => (
                        <tr key={r._id}>
                          <td style={{ fontSize: '12px', fontWeight: 600 }}>{r.studentId?.name || '—'}</td>
                          <td style={{ fontSize: '12px' }}>{r.reason}</td>
                          <td><span className={`badge badge-${r.managerAction?.status}`}>{r.managerAction?.status}</span></td>
                          <td style={{ fontSize: '11px' }}>{formatDate(r.managerAction?.actedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : <p>No data</p>}
          </Modal>

          <Modal isOpen={!!selectedRoleView} onClose={() => setSelectedRoleView(null)} title={`${selectedRoleView} Details`}>
            <div className="data-table-wrapper" style={{ maxHeight: '400px' }}>
              <table className="data-table"><thead><tr><th>Name</th><th>Email</th></tr></thead>
                <tbody>{getFilteredUsers().length > 0 ? getFilteredUsers().map((u) => (
                  <tr key={u._id}><td style={{ fontWeight: 600 }}>{u.name}</td><td style={{ color: 'var(--text-secondary)' }}>{u.email}</td></tr>
                )) : <tr><td colSpan={2}><div className="empty-state"><Users size={32} /><p>No {selectedRoleView}</p></div></td></tr>}</tbody>
              </table>
            </div>
            <div style={{ marginTop: '16px' }}><button className="btn btn-secondary w-full" onClick={() => setSelectedRoleView(null)}>Close</button></div>
          </Modal>

          <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title={`Create ${createRole}`}>
            <form onSubmit={handleCreateUser}>
              <div className="form-group"><label className="form-label">Name</label><input className="form-input" placeholder="Full name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" placeholder="email@cdgi.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
              <div className="modal-footer" style={{ padding: 0, marginTop: '16px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={creating}>{creating ? <Loader2 className="spinner" size={16} /> : 'Create'}</button>
              </div>
            </form>
          </Modal>

          <Modal isOpen={actionModal.open} onClose={() => setActionModal({ open: false, request: null, action: '' })} title={`${actionModal.action === 'approve' ? 'Approve' : 'Reject'} Request`}>
            <div className="form-group"><label className="form-label">Remark (optional)</label><textarea className="form-textarea" placeholder="Add a remark..." value={remark} onChange={(e) => setRemark(e.target.value)} /></div>
            <div className="modal-footer" style={{ padding: 0 }}>
              <button className="btn btn-secondary" onClick={() => setActionModal({ open: false, request: null, action: '' })}>Cancel</button>
              <button className={`btn ${actionModal.action === 'approve' ? 'btn-success' : 'btn-danger'}`} onClick={handleAction} disabled={acting}>
                {acting ? <Loader2 className="spinner" size={16} /> : actionModal.action === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </Modal>

          {/* Extension Action Modal */}
          <Modal isOpen={extActionModal.open} onClose={() => setExtActionModal({ open: false, extension: null, action: '' })} title={`${extActionModal.action === 'approve' ? 'Approve' : 'Reject'} Extension`}>
            <p style={{ marginBottom: '12px', color: 'var(--text-secondary)', fontSize: '14px' }}>
              {extActionModal.action === 'approve' ? 'Approve' : 'Reject'} extension from <strong>{extActionModal.extension?.student?.name}</strong> for <strong>+{extActionModal.extension?.requestedHours}hr</strong>?
            </p>
            <div className="form-group"><label className="form-label">Remark (optional)</label><textarea className="form-textarea" placeholder="Add a remark..." value={extRemark} onChange={(e) => setExtRemark(e.target.value)} /></div>
            <div className="modal-footer" style={{ padding: 0 }}>
              <button className="btn btn-secondary" onClick={() => setExtActionModal({ open: false, extension: null, action: '' })}>Cancel</button>
              <button className={`btn ${extActionModal.action === 'approve' ? 'btn-success' : 'btn-danger'}`} onClick={handleExtAction} disabled={extActing}>
                {extActing ? <Loader2 className="spinner" size={16} /> : extActionModal.action === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </Modal>
        </>
      )}
    </Layout>
  );
}