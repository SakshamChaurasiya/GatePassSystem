import { useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { QrCode, LogIn, LogOut, AlertCircle, Loader2, Camera, Clock, Search, RefreshCw } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import { getGatekeeperPasses, markOut, markIn, scanQR } from '../services/passService';

export default function GatekeeperDashboard() {
  const [passes, setPasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('passes');
  const [qrInput, setQrInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [markingAction, setMarkingAction] = useState('');
  const [passIdInput, setPassIdInput] = useState('');
  const [passIdLoading, setPassIdLoading] = useState(false);
  const [scannerReady, setScannerReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const scannerRef = useRef(null);
  const scanLockRef = useRef(false);

  const fetchPasses = async () => {
    try {
      const res = await getGatekeeperPasses();
      setPasses(res.passes || []);
    } catch (err) {
      toast.error('Failed to load passes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPasses(); }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchPasses, 30000);
    return () => clearInterval(interval);
  }, []);

  // Cleanup scanner on tab change or unmount
  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (e) {
        // ignore cleanup errors
      }
      scannerRef.current = null;
    }
    setScannerReady(false);
  }, []);

  // Stop scanner when leaving the scan tab
  useEffect(() => {
    if (activeTab !== 'scan') {
      stopScanner();
      setCameraError('');
    }
  }, [activeTab, stopScanner]);

  const startCamera = async () => {
    setCameraError('');
    try {
      await new Promise(r => setTimeout(r, 300));
      const readerEl = document.getElementById('reader');
      if (!readerEl) {
        setCameraError('Scanner element not found. Try refreshing the page.');
        return;
      }

      // Clear any previous content
      readerEl.innerHTML = '';

      const html5QrCode = new Html5Qrcode('reader');
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText) => {
          if (!scanLockRef.current) {
            handleAutoScan(decodedText);
          }
        },
        () => {}
      );

      setScannerReady(true);
    } catch (err) {
      console.error('Camera error:', err);
      const msg = typeof err === 'string' ? err : err?.message || 'Camera not available';
      setCameraError(msg);
      setScannerReady(false);
      // Clean up the reader div if it got messed up
      const readerEl = document.getElementById('reader');
      if (readerEl) readerEl.innerHTML = '';
    }
  };

  const handleMarkOut = async (passId) => {
    setMarkingAction(passId + '-out');
    try {
      await markOut(passId);
      toast.success('Student marked OUT');
      fetchPasses();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to mark out');
    } finally {
      setMarkingAction('');
    }
  };

  const handleMarkIn = async (passId) => {
    setMarkingAction(passId + '-in');
    try {
      const res = await markIn(passId);
      toast.success(res.message || 'Student marked IN');
      fetchPasses();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to mark in');
    } finally {
      setMarkingAction('');
    }
  };

  const handleAutoScan = async (value) => {
    if (scanLockRef.current) return;
    scanLockRef.current = true;
    setScanning(true);
    try {
      // Stop the scanner first to free the camera
      await stopScanner();

      const res = await scanQR(value);
      toast.success(res.message || 'Scan successful!');
      await fetchPasses();

      // Switch to passes tab so user sees the result
      setActiveTab('passes');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid or expired QR code');
    } finally {
      scanLockRef.current = false;
      setScanning(false);
    }
  };

  const handleQRScan = async () => {
    const value = qrInput.trim();
    if (!value) { toast.error('Enter QR code'); return; }
    setScanning(true);
    try {
      const res = await scanQR(value);
      toast.success(res.message || 'Scan successful!');
      setQrInput('');
      await fetchPasses();
      setActiveTab('passes');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid QR');
    } finally {
      setScanning(false);
    }
  };

  const handlePassIdMarkOut = async () => {
    const value = passIdInput.trim();
    if (!value) { toast.error('Enter a Pass ID'); return; }
    setPassIdLoading(true);
    try {
      await markOut(value);
      toast.success('Student marked OUT successfully');
      setPassIdInput('');
      await fetchPasses();
      setActiveTab('passes');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to mark out');
    } finally {
      setPassIdLoading(false);
    }
  };

  const handlePassIdMarkIn = async () => {
    const value = passIdInput.trim();
    if (!value) { toast.error('Enter a Pass ID'); return; }
    setPassIdLoading(true);
    try {
      const res = await markIn(value);
      toast.success(res.message || 'Student marked IN successfully');
      setPassIdInput('');
      await fetchPasses();
      setActiveTab('passes');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to mark in');
    } finally {
      setPassIdLoading(false);
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

  const activePasses = passes.filter(p => p.status === 'active');
  const outPasses = passes.filter(p => p.status === 'out');
  const returnedPasses = passes.filter(p => p.status === 'returned');

  // Card styles
  const passCardStyle = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '14px',
    padding: '16px 20px',
    marginBottom: '12px',
    transition: 'all 0.2s ease'
  };

  const passCardRowStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '10px'
  };

  const passInfoGrid = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '8px',
    marginBottom: '12px'
  };

  const passInfoItem = {
    fontSize: '12px',
    color: 'var(--text-secondary)',
  };

  const passInfoLabel = {
    fontSize: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--text-muted)',
    marginBottom: '2px',
    fontWeight: 600,
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e', border: 'rgba(34,197,94,0.3)', label: 'ACTIVE' },
      out: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: 'rgba(245,158,11,0.3)', label: 'OUT' },
      returned: { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: 'rgba(59,130,246,0.3)', label: 'RETURNED' },
      expired: { bg: 'rgba(107,114,128,0.15)', color: '#6b7280', border: 'rgba(107,114,128,0.3)', label: 'EXPIRED' },
    };
    const s = styles[status] || styles.expired;
    return (
      <span style={{
        padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
        background: s.bg, color: s.color, border: `1px solid ${s.border}`,
        display: 'inline-block', letterSpacing: '0.04em'
      }}>
        {s.label}
      </span>
    );
  };

  return (
    <Layout pageTitle="Gatekeeper Dashboard">
      {loading ? (
        <div className="page-loader"><div className="spinner" /></div>
      ) : (
        <>
          <div className="tabs">
            <button className={`tab-btn ${activeTab === 'passes' ? 'active' : ''}`} onClick={() => setActiveTab('passes')}>All Passes</button>
            <button className={`tab-btn ${activeTab === 'lookup' ? 'active' : ''}`} onClick={() => setActiveTab('lookup')}>Pass ID Lookup</button>
            <button className={`tab-btn ${activeTab === 'scan' ? 'active' : ''}`} onClick={() => setActiveTab('scan')}>QR Scanner</button>
          </div>

          {activeTab === 'passes' && (
            <>
              <motion.div className="stats-grid" initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }}>
                <StatCard icon={QrCode} label="Active" value={activePasses.length} color="green" />
                <StatCard icon={LogOut} label="Currently OUT" value={outPasses.length} color="yellow" />
                <StatCard icon={LogIn} label="Returned Today" value={returnedPasses.length} color="blue" />
                <StatCard icon={Clock} label="Total" value={passes.length} color="purple" />
              </motion.div>

              {outPasses.length > 0 && (
                <div style={{
                  background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
                  borderRadius: '12px', padding: '14px 20px', marginBottom: '24px',
                  display: 'flex', alignItems: 'center', gap: '10px'
                }}>
                  <AlertCircle size={18} color="#f59e0b" />
                  <p style={{ color: '#f59e0b', fontWeight: 600, fontSize: '14px' }}>
                    {outPasses.length} student{outPasses.length > 1 ? 's' : ''} currently OUT
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 className="section-title" style={{ marginBottom: 0 }}>Approved Passes</h2>
                <button className="btn btn-sm btn-secondary" onClick={fetchPasses} title="Refresh">
                  <RefreshCw size={14} /> Refresh
                </button>
              </div>

              {passes.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
                  <QrCode size={48} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                  <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>No passes available</p>
                </div>
              ) : (
                passes.map((p) => (
                  <div key={p._id} style={passCardStyle}>
                    {/* Row 1: Pass ID + Status */}
                    <div style={passCardRowStyle}>
                      <div>
                        <span style={{ color: 'var(--text-accent)', fontWeight: 700, fontSize: '15px', marginRight: '8px' }}>
                          {p.passId}
                        </span>
                        {getStatusBadge(p.status)}
                        {p.lateReturn && (
                          <span style={{
                            padding: '3px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: 700,
                            background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)',
                            marginLeft: '6px'
                          }}>LATE</span>
                        )}
                      </div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>
                        {p.studentId?.name || '—'}
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '6px' }}>
                          {p.studentId?.email}
                        </span>
                      </div>
                    </div>

                    {/* Row 2: Info grid */}
                    <div style={passInfoGrid}>
                      <div>
                        <div style={passInfoLabel}>Valid From</div>
                        <div style={passInfoItem}>{formatDate(p.validFrom)}</div>
                      </div>
                      <div>
                        <div style={passInfoLabel}>Valid To</div>
                        <div style={passInfoItem}>{formatDate(p.validTo)}</div>
                      </div>
                      <div>
                        <div style={passInfoLabel}>Out Time</div>
                        <div style={passInfoItem}>{p.usedAt ? formatDate(p.usedAt) : '—'}</div>
                      </div>
                      <div>
                        <div style={passInfoLabel}>In Time</div>
                        <div style={passInfoItem}>{p.returnedAt ? formatDate(p.returnedAt) : '—'}</div>
                      </div>
                    </div>

                    {/* Row 3: Action Buttons — ALWAYS VISIBLE */}
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {p.status === 'active' && (
                        <button
                          className="btn btn-warning"
                          onClick={() => handleMarkOut(p.passId)}
                          disabled={markingAction === p.passId + '-out'}
                          style={{ flex: 1, minWidth: '120px', padding: '10px 16px', fontSize: '14px', fontWeight: 700 }}
                        >
                          {markingAction === p.passId + '-out'
                            ? <Loader2 className="spinner" size={16} />
                            : <><LogOut size={16} /> Mark OUT</>
                          }
                        </button>
                      )}
                      {p.status === 'out' && (
                        <button
                          className="btn btn-success"
                          onClick={() => handleMarkIn(p.passId)}
                          disabled={markingAction === p.passId + '-in'}
                          style={{ flex: 1, minWidth: '120px', padding: '10px 16px', fontSize: '14px', fontWeight: 700 }}
                        >
                          {markingAction === p.passId + '-in'
                            ? <Loader2 className="spinner" size={16} />
                            : <><LogIn size={16} /> Mark IN</>
                          }
                        </button>
                      )}
                      {p.status === 'returned' && (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: '6px',
                          color: '#3b82f6', fontSize: '13px', fontWeight: 600,
                          padding: '8px 0'
                        }}>
                          ✓ Completed
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {activeTab === 'lookup' && (
            <>
              <h2 className="section-title">Pass ID Lookup</h2>
              <div className="card" style={{ maxWidth: '550px', margin: '0 auto' }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '14px' }}>
                  Enter the Pass ID (e.g. <strong>PASS-abc12345</strong>) to manually mark a student OUT or IN.
                </p>
                <div className="form-group">
                  <label className="form-label">Pass ID</label>
                  <input
                    className="form-input"
                    placeholder="e.g. PASS-abc12345"
                    value={passIdInput}
                    onChange={(e) => setPassIdInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handlePassIdMarkOut()}
                    style={{ fontSize: '16px', padding: '12px 16px' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-warning"
                    onClick={handlePassIdMarkOut}
                    disabled={passIdLoading || !passIdInput.trim()}
                    style={{ flex: 1, minWidth: '140px', padding: '12px 20px' }}
                  >
                    {passIdLoading ? <Loader2 className="spinner" size={18} /> : <><LogOut size={18} /> Mark OUT</>}
                  </button>
                  <button
                    className="btn btn-success"
                    onClick={handlePassIdMarkIn}
                    disabled={passIdLoading || !passIdInput.trim()}
                    style={{ flex: 1, minWidth: '140px', padding: '12px 20px' }}
                  >
                    {passIdLoading ? <Loader2 className="spinner" size={18} /> : <><LogIn size={18} /> Mark IN</>}
                  </button>
                </div>
              </div>
            </>
          )}

          {activeTab === 'scan' && (
            <>
              <h2 className="section-title">QR Code Scanner</h2>
              <div className="card" style={{ maxWidth: '500px', margin: '0 auto' }}>

                {/* Manual QR Input — Primary method */}
                <div style={{ marginBottom: '24px' }}>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '14px' }}>
                    Paste or type the QR code value from the student's pass.
                  </p>
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label className="form-label">QR Code Value</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        className="form-input"
                        placeholder="e.g. QR-xxxxxxxx-xxxx-xxxx-xxxx"
                        value={qrInput}
                        onChange={(e) => setQrInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleQRScan()}
                        style={{ fontSize: '15px' }}
                      />
                      <button className="btn btn-primary" onClick={handleQRScan} disabled={scanning || !qrInput.trim()} style={{ whiteSpace: 'nowrap', minWidth: '100px' }}>
                        {scanning ? <Loader2 className="spinner" size={18} /> : 'Process'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px',
                  color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em'
                }}>
                  <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
                  <span>or use camera</span>
                  <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
                </div>

                {/* Camera Scanner — single persistent #reader div, never unmounted */}
                <div id="reader" style={{
                  width: '100%', borderRadius: '12px', overflow: 'hidden',
                  background: '#000', marginBottom: '12px',
                  border: scannerReady ? '2px solid var(--border-subtle)' : 'none',
                  height: scannerReady ? 'auto' : '0px',
                  minHeight: scannerReady ? '280px' : '0px',
                  transition: 'min-height 0.2s ease'
                }} />

                {!scannerReady ? (
                  <div style={{ textAlign: 'center', padding: '20px' }}>
                    <Camera size={36} style={{ margin: '0 auto 12px', opacity: 0.4, color: 'var(--text-muted)' }} />
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' }}>
                      Use your device camera to scan QR codes directly.
                    </p>
                    <button
                      className="btn btn-secondary"
                      onClick={startCamera}
                      disabled={scanning}
                      style={{ margin: '0 auto' }}
                    >
                      <Camera size={16} /> Start Camera Scanner
                    </button>
                    {cameraError && (
                      <div style={{
                        marginTop: '14px', padding: '10px 14px', borderRadius: '8px',
                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                        color: '#ef4444', fontSize: '13px', textAlign: 'left'
                      }}>
                        <strong>Camera Error:</strong> {cameraError}
                        <br />
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          Use the manual QR input above instead.
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={stopScanner}
                      style={{ width: '100%', marginBottom: '8px' }}
                    >
                      Stop Camera
                    </button>
                    {scanning && (
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        padding: '10px', marginTop: '8px',
                        background: 'rgba(34,197,94,0.1)', borderRadius: '8px', border: '1px solid rgba(34,197,94,0.2)'
                      }}>
                        <Loader2 className="spinner" size={16} style={{ color: '#22c55e' }} />
                        <span style={{ color: '#22c55e', fontWeight: 600, fontSize: '13px' }}>Processing scan...</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </>
      )}
    </Layout>
  );
}
