import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle, QrCode } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/useAuthStore';
import { scanQR } from '../services/passService';

export default function GateScan() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, role } = useAuthStore();
  const [status, setStatus] = useState('processing'); // processing, success, error, unauthorized
  const [message, setMessage] = useState('');

  const qr = searchParams.get('qr');

  useEffect(() => {
    if (!qr) {
      setStatus('error');
      setMessage('No QR code found in the URL.');
      return;
    }

    if (!isAuthenticated) {
      setStatus('unauthorized');
      setMessage('You need to log in as a gatekeeper to process this QR code.');
      return;
    }

    if (role !== 'gatekeeper') {
      setStatus('error');
      setMessage('Only gatekeepers can process QR codes. You are logged in as: ' + role);
      return;
    }

    // Process the QR code
    const processQR = async () => {
      try {
        const res = await scanQR(qr);
        setStatus('success');
        setMessage(res.message || 'QR processed successfully!');
        toast.success(res.message || 'QR processed successfully!');

        // Redirect to gatekeeper dashboard after 2 seconds
        setTimeout(() => {
          navigate('/gatekeeper', { replace: true });
        }, 2000);
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Failed to process QR code.');
        toast.error(err.response?.data?.message || 'Failed to process QR code.');
      }
    };

    processQR();
  }, [qr, isAuthenticated, role, navigate]);

  const containerStyle = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0a0e1a',
    padding: '24px',
  };

  const cardStyle = {
    background: 'rgba(17, 24, 39, 0.9)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    padding: '40px',
    maxWidth: '400px',
    width: '100%',
    textAlign: 'center',
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <QrCode size={48} style={{ margin: '0 auto 20px', color: '#818cf8', opacity: 0.7 }} />

        {status === 'processing' && (
          <>
            <Loader2 className="spinner" size={40} style={{ margin: '0 auto 16px', color: '#818cf8' }} />
            <h2 style={{ color: '#f1f5f9', fontSize: '18px', marginBottom: '8px' }}>Processing QR Code</h2>
            <p style={{ color: '#94a3b8', fontSize: '14px' }}>Please wait...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle size={48} style={{ margin: '0 auto 16px', color: '#22c55e' }} />
            <h2 style={{ color: '#22c55e', fontSize: '18px', marginBottom: '8px' }}>Success!</h2>
            <p style={{ color: '#94a3b8', fontSize: '14px' }}>{message}</p>
            <p style={{ color: '#64748b', fontSize: '12px', marginTop: '12px' }}>Redirecting to dashboard...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle size={48} style={{ margin: '0 auto 16px', color: '#ef4444' }} />
            <h2 style={{ color: '#ef4444', fontSize: '18px', marginBottom: '8px' }}>Error</h2>
            <p style={{ color: '#94a3b8', fontSize: '14px' }}>{message}</p>
            <button
              onClick={() => navigate('/gatekeeper', { replace: true })}
              style={{
                marginTop: '20px', padding: '10px 24px', borderRadius: '10px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white',
                border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '14px'
              }}
            >
              Go to Dashboard
            </button>
          </>
        )}

        {status === 'unauthorized' && (
          <>
            <XCircle size={48} style={{ margin: '0 auto 16px', color: '#f59e0b' }} />
            <h2 style={{ color: '#f59e0b', fontSize: '18px', marginBottom: '8px' }}>Login Required</h2>
            <p style={{ color: '#94a3b8', fontSize: '14px' }}>{message}</p>
            <button
              onClick={() => navigate('/login', { replace: true })}
              style={{
                marginTop: '20px', padding: '10px 24px', borderRadius: '10px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white',
                border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '14px'
              }}
            >
              Go to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
