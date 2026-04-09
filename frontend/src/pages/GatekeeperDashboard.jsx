import { useEffect, useState } from 'react';
import { ScanLine, QrCode, LogIn, LogOut, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import api from '../services/api';

export default function GatekeeperDashboard() {
  const [passes, setPasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('passes');
  const [qrInput, setQrInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [passIdInput, setPassIdInput] = useState('');
  const [markingAction, setMarkingAction] = useState('');

  const fetchPasses = async () => {
    try {
      const res = await api.get('/passes/get-passes');
      setPasses(res.data.passes || []);
    } catch (err) {
      toast.error('Failed to load passes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPasses();
  }, []);

  const handleMarkOut = async (passId) => {
    setMarkingAction(passId + '-out');
    try {
      await api.post('/passes/mark-out', { passId });
      toast.success('Student marked OUT');
      fetchPasses();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setMarkingAction('');
    }
  };

  const handleMarkIn = async (passId) => {
    setMarkingAction(passId + '-in');
    try {
      await api.post('/passes/mark-in', { passId });
      toast.success('Student marked IN');
      fetchPasses();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setMarkingAction('');
    }
  };

  const handleQRScan = async () => {
    if (!qrInput.trim()) {
      toast.error('Enter QR code');
      return;
    }
    setScanning(true);
    try {
      const res = await api.post('/passes/qr', { qrCode: qrInput.trim() });
      toast.success(res.data.message);
      setQrInput('');
      fetchPasses();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid QR');
    } finally {
      setScanning(false);
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <Layout pageTitle="Gatekeeper Dashboard">
      {loading ? (
        <div className="page-loader"><div className="spinner" /></div>
      ) : (
        <>
          <div className="tabs">
            <button className={`tab-btn ${activeTab === 'passes' ? 'active' : ''}`} onClick={() => setActiveTab('passes')}>Active Passes</button>
            <button className={`tab-btn ${activeTab === 'scan' ? 'active' : ''}`} onClick={() => setActiveTab('scan')}>QR Scanner</button>
          </div>

          {activeTab === 'passes' && (
            <>
              <div className="stats-grid">
                <StatCard icon={QrCode} label="Active Passes" value={passes.length} color="green" />
              </div>
              <h2 className="section-title">Active Passes</h2>
              <div className="card">
                <div className="data-table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Pass ID</th>
                        <th>Student</th>
                        <th>Valid From</th>
                        <th>Valid To</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {passes.length === 0 ? (
                        <tr><td colSpan={5}><div className="empty-state"><QrCode size={40} /><p>No active passes</p></div></td></tr>
                      ) : (
                        passes.map((p) => (
                          <tr key={p._id}>
                            <td style={{ color: 'var(--text-accent)', fontWeight: 600 }}>{p.passId}</td>
                            <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{p.studentId?.name || '—'}</td>
                            <td>{formatDate(p.validFrom)}</td>
                            <td>{formatDate(p.validTo)}</td>
                            <td>
                              <div className="btn-group">
                                <button
                                  className="btn btn-warning btn-sm"
                                  onClick={() => handleMarkOut(p.passId)}
                                  disabled={!!p.usedAt || markingAction === p.passId + '-out'}
                                  title="Mark OUT"
                                >
                                  {markingAction === p.passId + '-out' ? <Loader2 className="spinner" size={14} /> : <><LogOut size={14} /> Out</>}
                                </button>
                                <button
                                  className="btn btn-success btn-sm"
                                  onClick={() => handleMarkIn(p.passId)}
                                  disabled={!p.usedAt || !!p.returnedAt || markingAction === p.passId + '-in'}
                                  title="Mark IN"
                                >
                                  {markingAction === p.passId + '-in' ? <Loader2 className="spinner" size={14} /> : <><LogIn size={14} /> In</>}
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

          {activeTab === 'scan' && (
            <>
              <h2 className="section-title">QR Code Scanner</h2>
              <div className="card" style={{ maxWidth: '500px' }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  Enter or paste the QR code value to automatically mark a student IN or OUT.
                </p>
                <div className="form-group">
                  <label className="form-label">QR Code Value</label>
                  <input
                    className="form-input"
                    placeholder="e.g. QR-xxxxxxxx-xxxx-xxxx-xxxx"
                    value={qrInput}
                    onChange={(e) => setQrInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleQRScan()}
                  />
                </div>
                <button className="btn btn-primary" onClick={handleQRScan} disabled={scanning}>
                  {scanning ? <Loader2 className="spinner" size={18} /> : <><ScanLine size={18} /> Scan & Process</>}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </Layout>
  );
}
