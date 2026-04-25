import { useEffect, useState } from 'react';
import { Loader2, LogOut, LogIn, QrCode, AlertTriangle, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import StatCard from './StatCard';
import { getAllPassesWithStatus } from '../services/passService';

export default function LivePassesPanel({ onViewStudentHistory }) {
  const [passes, setPasses] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchPasses = async () => {
    try {
      const filters = {};
      if (statusFilter) filters.status = statusFilter;
      const res = await getAllPassesWithStatus(filters);
      setPasses(res.passes || []);
      setSummary(res.summary || {});
    } catch (err) {
      toast.error('Failed to load passes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPasses(); }, [statusFilter]);
  useEffect(() => {
    const interval = setInterval(fetchPasses, 30000);
    return () => clearInterval(interval);
  }, [statusFilter]);

  const fmtTime = (d) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

  const badge = (status, late) => {
    const colors = { active: '#22c55e', out: '#f59e0b', returned: '#3b82f6', expired: '#6b7280' };
    const labels = { active: 'Ready', out: 'OUT', returned: 'Returned', expired: 'Expired' };
    const c = colors[status] || '#6b7280';
    return (
      <>
        <span style={{ padding: '3px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: `${c}18`, color: c }}>{labels[status] || status}</span>
        {late && <span style={{ padding: '2px 6px', borderRadius: '20px', fontSize: '10px', fontWeight: 700, background: 'rgba(239,68,68,0.12)', color: '#ef4444', marginLeft: '4px' }}>LATE</span>}
      </>
    );
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '40px' }}><Loader2 className="spinner" size={24} /></div>;

  return (
    <>
      <div className="stats-grid">
        <StatCard icon={QrCode} label="Total Passes" value={summary.total || 0} color="blue" />
        <div onClick={() => setStatusFilter('out')} style={{ cursor: 'pointer' }}>
          <StatCard icon={LogOut} label="Currently OUT" value={summary.out || 0} color="yellow" />
        </div>
        <StatCard icon={LogIn} label="Returned" value={summary.returned || 0} color="green" />
        <StatCard icon={AlertTriangle} label="Late Returns" value={summary.lateReturns || 0} color="red" />
      </div>

      {summary.out > 0 && (
        <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '12px', padding: '14px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertTriangle size={18} color="#f59e0b" />
          <p style={{ color: '#f59e0b', fontWeight: 600, fontSize: '14px' }}>{summary.out} student{summary.out > 1 ? 's' : ''} currently outside</p>
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <Filter size={16} color="var(--text-muted)" />
        {['', 'active', 'out', 'returned', 'expired'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} style={{
            padding: '5px 12px', borderRadius: '8px', border: '1px solid var(--border-color)',
            background: statusFilter === s ? 'var(--accent-primary)' : 'transparent',
            color: statusFilter === s ? '#fff' : 'var(--text-secondary)',
            fontSize: '12px', fontWeight: 600, cursor: 'pointer'
          }}>{s || 'All'}</button>
        ))}
      </div>

      <div className="card">
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead><tr><th>Pass ID</th><th>Student</th><th>Valid</th><th>Status</th><th>Out</th><th>In</th><th>Action</th></tr></thead>
            <tbody>
              {passes.length === 0 ? (
                <tr><td colSpan={7}><div className="empty-state"><QrCode size={32} /><p>No passes found</p></div></td></tr>
              ) : passes.map(p => (
                <tr key={p._id}>
                  <td style={{ fontWeight: 600, fontSize: '12px', color: 'var(--text-accent)' }}>{p.passId}</td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '12px' }}>{p.studentId?.name || '—'}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{p.studentId?.email}</div>
                  </td>
                  <td style={{ fontSize: '11px' }}>{fmtTime(p.validFrom)} – {fmtTime(p.validTo)}</td>
                  <td>{badge(p.status, p.lateReturn)}</td>
                  <td style={{ fontSize: '11px' }}>{fmtTime(p.usedAt)}</td>
                  <td style={{ fontSize: '11px' }}>{fmtTime(p.returnedAt)}</td>
                  <td>
                    {onViewStudentHistory && p.studentId?._id && (
                      <button className="btn btn-sm btn-secondary" onClick={() => onViewStudentHistory(p.studentId._id, p.studentId.name)}>History</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
