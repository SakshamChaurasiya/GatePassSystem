import { useEffect, useState } from 'react';
import { Loader2, FileText, QrCode, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from './Modal';
import { getStudentHistory } from '../services/passService';
import { formatISTDate, formatISTDateTime } from '../utils/dateUtils';

export default function StudentHistoryModal({ studentId, studentName, isOpen, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('summary');

  useEffect(() => {
    if (isOpen && studentId) {
      setLoading(true);
      getStudentHistory(studentId)
        .then(res => setData(res))
        .catch(() => toast.error('Failed to load history'))
        .finally(() => setLoading(false));
    }
  }, [isOpen, studentId]);

  const fmt = formatISTDate;
  const fmtTime = formatISTDateTime;

  const badge = (status) => {
    const colors = { pending: '#f59e0b', approved: '#22c55e', rejected: '#ef4444', forwarded: '#3b82f6', cancelled: '#6b7280', active: '#22c55e', out: '#f59e0b', returned: '#3b82f6', expired: '#6b7280' };
    const c = colors[status] || '#6b7280';
    return <span style={{ padding: '3px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: `${c}18`, color: c }}>{status}</span>;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`History — ${studentName || 'Student'}`}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}><Loader2 className="spinner" size={24} /></div>
      ) : !data ? (
        <p style={{ color: 'var(--text-secondary)' }}>No data</p>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {['summary', 'requests', 'passes'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', background: tab === t ? 'var(--accent-primary)' : 'transparent', color: tab === t ? '#fff' : 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {tab === 'summary' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="card" style={{ padding: '14px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px', color: 'var(--text-accent)' }}>Requests</h4>
                {Object.entries(data.requests).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '12px' }}>
                    <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{k}</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{v}</span>
                  </div>
                ))}
              </div>
              <div className="card" style={{ padding: '14px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px', color: 'var(--text-accent)' }}>Passes</h4>
                {Object.entries(data.passes).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '12px' }}>
                    <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{k === 'lateReturns' ? 'Late Returns' : k}</span>
                    <span style={{ fontWeight: 700, color: k === 'lateReturns' && v > 0 ? '#ef4444' : 'var(--text-primary)' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'requests' && (
            <div className="data-table-wrapper" style={{ maxHeight: '350px' }}>
              <table className="data-table">
                <thead><tr><th>Reason</th><th>Destination</th><th>Date</th><th>Status</th></tr></thead>
                <tbody>
                  {(data.requestDetails || []).length === 0 ? (
                    <tr><td colSpan={4}><div className="empty-state"><FileText size={32} /><p>No requests</p></div></td></tr>
                  ) : data.requestDetails.map(r => (
                    <tr key={r._id}>
                      <td style={{ fontWeight: 600, fontSize: '12px' }}>{r.reason}</td>
                      <td style={{ fontSize: '12px' }}>{r.destination}</td>
                      <td style={{ fontSize: '11px' }}>{fmt(r.fromDate)} – {fmt(r.toDate)}</td>
                      <td>{badge(r.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'passes' && (
            <div className="data-table-wrapper" style={{ maxHeight: '350px' }}>
              <table className="data-table">
                <thead><tr><th>Pass ID</th><th>Valid</th><th>Status</th><th>Out</th><th>In</th></tr></thead>
                <tbody>
                  {(data.passDetails || []).length === 0 ? (
                    <tr><td colSpan={5}><div className="empty-state"><QrCode size={32} /><p>No passes</p></div></td></tr>
                  ) : data.passDetails.map(p => (
                    <tr key={p._id}>
                      <td style={{ fontWeight: 600, fontSize: '12px', color: 'var(--text-accent)' }}>{p.passId}</td>
                      <td style={{ fontSize: '11px' }}>{fmtTime(p.validFrom)} – {fmtTime(p.validTo)}</td>
                      <td>{badge(p.status)} {p.lateReturn && <span style={{ color: '#ef4444', fontSize: '10px', fontWeight: 700 }}>LATE</span>}</td>
                      <td style={{ fontSize: '11px' }}>{fmtTime(p.usedAt)}</td>
                      <td style={{ fontSize: '11px' }}>{fmtTime(p.returnedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
