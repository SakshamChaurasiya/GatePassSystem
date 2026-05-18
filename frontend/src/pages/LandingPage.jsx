import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ShieldCheck, QrCode, ClipboardCheck, Bell, BarChart3, Lock,
  ArrowRight, ChevronRight, Globe, ExternalLink, Mail,
  FileText, UserCheck, ScanLine
} from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import useThemeStore from '../store/useThemeStore';
import { Sun, Moon } from 'lucide-react';

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-50px' },
  transition: { duration: 0.6, ease: 'easeOut' },
};

const stagger = {
  initial: {},
  whileInView: { transition: { staggerChildren: 0.1 } },
  viewport: { once: true },
};

const staggerChild = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  viewport: { once: true },
};

export default function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, role } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  const handleCTA = () => {
    if (isAuthenticated) {
      navigate(`/${role}`);
    } else {
      navigate('/login');
    }
  };

  const features = [
    { icon: FileText, title: 'Digital Pass Requests', desc: 'Students submit pass requests online with reason, destination, and dates — no paper forms needed.', color: '#6366f1' },
    { icon: ClipboardCheck, title: 'Multi-level Approvals', desc: 'Managers review and forward to wardens for final approval, ensuring proper authorization chain.', color: '#22c55e' },
    { icon: QrCode, title: 'QR Code Verification', desc: 'Each approved pass generates a unique QR code that gatekeepers scan for instant verification.', color: '#f59e0b' },
    { icon: Bell, title: 'Real-time Notifications', desc: 'Instant alerts for pass approvals, gate activity, late returns, and overdue students.', color: '#ef4444' },
    { icon: BarChart3, title: 'Analytics Dashboard', desc: 'Comprehensive insights into pass usage, student movement patterns, and late return tracking.', color: '#3b82f6' },
    { icon: Lock, title: 'Role-based Access', desc: 'Six distinct roles — Super Admin, Admin, Warden, Manager, Gatekeeper, and Student.', color: '#8b5cf6' },
  ];

  const steps = [
    { num: '01', title: 'Request', desc: 'Student submits a gate pass request with reason, destination, and travel dates.', icon: FileText },
    { num: '02', title: 'Approve', desc: 'Manager reviews and forwards to Warden, who grants final approval.', icon: UserCheck },
    { num: '03', title: 'Verify', desc: 'Gatekeeper scans the QR code at the gate for instant verification and tracking.', icon: ScanLine },
  ];

  const developers = [
  { 
    name: 'Saksham Chaurasiya', 
    role: 'Full Stack Developer', 
    gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    links: { website: 'https://sakshamportfolio-kohl.vercel.app/', linkedin: 'https://www.linkedin.com/in/saksham-chaurasiya-14f', email: 'chaurasiyasaksham23@gmail.com' }
  },
  { 
    name: 'Siddhi Jain', 
    role: 'Full Stack Developer', 
    gradient: 'linear-gradient(135deg, #ec4899, #f43f5e)',
    links: { website: '#', linkedin: 'https://www.linkedin.com/in/siddhi-jain-b4950028b', email: 'siddhijain3010@gmail.com' }
  },
  { 
    name: 'Vidushi Jain', 
    role: 'Full Stack Developer', 
    gradient: 'linear-gradient(135deg, #14b8a6, #22c55e)',
    links: { website: '#', linkedin: 'https://www.linkedin.com/in/vidushijain13/', email: 'vidushi2005jain@gmail.com' }
  },
];

  return (
    <div className="landing-page">
      {/* Navbar */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="landing-logo-icon"><ShieldCheck size={20} /></div>
            <span>GatePass</span>
          </div>
          <div className="landing-nav-links">
            <a href="#features">Features</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#developers">Developers</a>
            <button className="btn-icon" onClick={toggleTheme} title="Toggle theme" style={{ marginLeft: '4px' }}>
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleCTA}>
              {isAuthenticated ? 'Dashboard' : 'Sign In'} <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="landing-hero">
        <div className="hero-bg-orb hero-orb-1" />
        <div className="hero-bg-orb hero-orb-2" />
        <div className="hero-bg-orb hero-orb-3" />

        <motion.div className="hero-content" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: 'easeOut' }}>
          <motion.div className="hero-badge" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2, duration: 0.5 }}>
            <ShieldCheck size={14} /> CDGI Hostel Management
          </motion.div>

          <h1 className="hero-title">
            Smart <span className="hero-gradient-text">Gate Pass</span><br />
            Management System
          </h1>
          <p className="hero-subtitle">
            Streamline hostel pass requests, multi-level approvals, and gate verification
            with QR codes — all in one modern, digital platform.
          </p>

          <div className="hero-actions">
            <button className="btn btn-primary btn-lg" onClick={handleCTA}>
              {isAuthenticated ? 'Go to Dashboard' : 'Get Started'} <ArrowRight size={18} />
            </button>
            <a href="#features" className="btn btn-secondary btn-lg">
              Learn More <ChevronRight size={18} />
            </a>
          </div>

          <motion.div className="hero-stats" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.6 }}>
            <div className="hero-stat"><span className="hero-stat-value">6</span><span className="hero-stat-label">User Roles</span></div>
            <div className="hero-stat-divider" />
            <div className="hero-stat"><span className="hero-stat-value">QR</span><span className="hero-stat-label">Verification</span></div>
            <div className="hero-stat-divider" />
            <div className="hero-stat"><span className="hero-stat-value">24/7</span><span className="hero-stat-label">Real-time</span></div>
          </motion.div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="landing-section" id="features">
        <motion.div className="section-header" {...fadeUp}>
          <span className="section-badge">Features</span>
          <h2>Everything you need for<br /><span className="hero-gradient-text">hostel gate management</span></h2>
          <p>A comprehensive solution replacing manual registers with a fully digital, trackable system.</p>
        </motion.div>

        <motion.div className="features-grid" {...stagger}>
          {features.map((f, i) => (
            <motion.div className="feature-card" key={i} {...staggerChild}>
              <div className="feature-icon" style={{ background: `${f.color}15`, color: f.color }}>
                <f.icon size={24} />
              </div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* How It Works */}
      <section className="landing-section landing-section-alt" id="how-it-works">
        <motion.div className="section-header" {...fadeUp}>
          <span className="section-badge">How It Works</span>
          <h2>Three simple steps to<br /><span className="hero-gradient-text">seamless gate management</span></h2>
          <p>From request to verification — the entire workflow is digitized and tracked.</p>
        </motion.div>

        <div className="steps-grid">
          {steps.map((s, i) => (
            <motion.div className="step-card" key={i} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.15 }}>
              <div className="step-num">{s.num}</div>
              <div className="step-icon-wrap">
                <s.icon size={28} />
              </div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Developers */}
      <section className="landing-section" id="developers">
        <motion.div className="section-header" {...fadeUp}>
          <span className="section-badge">Team</span>
          <h2>About the <span className="hero-gradient-text">Developers</span></h2>
          <p>Built with passion by talented developers from CDGI.</p>
        </motion.div>

        <motion.div className="developers-grid" {...stagger}>
          {developers.map((d, i) => (
            <motion.div className="developer-card" key={i} {...staggerChild}>
              <div className="developer-avatar" style={{ background: d.gradient }}>
                {d.name.split(' ').map(w => w[0]).join('')}
              </div>
              <h3>{d.name}</h3>
              <p>{d.role}</p>
              <div className="developer-links">
                {/* Globe for Website */}
                <a href={d.links.website} target="_blank" rel="noopener noreferrer" aria-label="Website">
                  <Globe size={16} />
                </a>
                {/* ExternalLink for LinkedIn */}
                <a href={d.links.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                  <ExternalLink size={16} />
                </a>
                {/* Mail for Email */}
                <a href={`mailto:${d.links.email}`} aria-label="Email">
                  <Mail size={16} />
                </a>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="landing-logo">
              <div className="landing-logo-icon"><ShieldCheck size={18} /></div>
              <span>GatePass</span>
            </div>
            <p>CDGI Hostel Gate Pass Management System.<br />Digitizing hostel security, one pass at a time.</p>
          </div>
          <div className="footer-links-group">
            <h4>Quick Links</h4>
            <a href="#features">Features</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#developers">Developers</a>
          </div>
          <div className="footer-links-group">
            <h4>Roles</h4>
            <span>Student</span>
            <span>Manager</span>
            <span>Warden</span>
            <span>Gatekeeper</span>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} CDGI Gate Pass System. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
