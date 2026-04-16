import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('gurmail@linio.ai');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async e => {
    e.preventDefault(); setError(''); setLoading(true);
    try { await login(email, password); }
    catch(err) { setError(err.response?.data?.error || 'Invalid email or password.'); }
    finally { setLoading(false); }
  };

  const MARKETING_URL = 'https://web-production-f406.up.railway.app';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'linear-gradient(135deg, #f0f7f7 0%, #e8f0f7 50%, #f5f1f8 100%)' }}>

      {/* Marketing Header */}
      <header style={{ background: '#ffffff', borderBottom: '1px solid #e5e7eb', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <a href={MARKETING_URL} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #0a9e9e, #1a3a6b)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 16 }}>L</div>
          <span style={{ fontSize: 20, fontWeight: 800, color: '#1a3a6b', letterSpacing: '-0.02em' }}>LINIO</span>
        </a>
        <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }} className="login-nav">
          <a href={MARKETING_URL + '/features'} style={{ padding: '8px 14px', color: '#4b5563', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>Features</a>
          <a href={MARKETING_URL + '/pricing'} style={{ padding: '8px 14px', color: '#4b5563', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>Pricing</a>
          <a href={MARKETING_URL + '/about'} style={{ padding: '8px 14px', color: '#4b5563', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>About</a>
        </nav>
      </header>

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', position: 'relative' }}>
        <div style={{ maxWidth: 1100, width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }} className="login-grid">
          <div className="login-hero-text">
            <div style={{ display: 'inline-block', padding: '4px 12px', background: 'rgba(10, 158, 158, 0.08)', borderRadius: 20, color: '#0a9e9e', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>AI-Powered Family Management</div>
            <h1 style={{ fontSize: 38, fontWeight: 800, color: '#1a3a6b', lineHeight: 1.15, margin: '0 0 16px', letterSpacing: '-0.02em' }}>
              Your family's finances and documents — <em style={{ color: '#0a9e9e', fontStyle: 'italic' }}>in one calm place.</em>
            </h1>
            <p style={{ fontSize: 16, color: '#6b7280', lineHeight: 1.6, margin: 0 }}>
              The intelligent system that organizes every document, tracks every asset, and acts before you even ask.
            </p>
            <div style={{ marginTop: 24, display: 'flex', gap: 12, fontSize: 12, color: '#9ca3af' }}>
              <span>Bank-level encryption</span>
              <span>·</span>
              <span>No data selling</span>
              <span>·</span>
              <span>SOC 2 Type II</span>
            </div>
          </div>

          <div className="login-form-wrap">
            <div className="login-card">
              <div className="login-logo">
                <div className="login-logo-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2zM9 22V12h6v10"/></svg></div>
                <span className="login-logo-text">LINIO</span>
              </div>
              <h1 className="login-title">Welcome back</h1>
              <p className="login-sub">Sign in to your family command center</p>
              {error && (
                <div role="alert" style={{background:'var(--red-bg)',border:'1px solid var(--red-border)',borderRadius:'var(--r-md)',padding:'10px 14px',marginBottom:16,color:'var(--red)',fontSize:13}}>{error}</div>
              )}
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label" htmlFor="login-email">Email address</label>
                  <input id="login-email" type="email" inputMode="email" className="form-input" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@family.com" required autoFocus autoComplete="email"/>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="login-pw">Password</label>
                  <input id="login-pw" type="password" className="form-input" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password" required autoComplete="current-password"/>
                </div>
                <button type="submit" className="btn btn-teal btn-lg" style={{width:'100%',marginTop:8}} disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* Marketing Footer */}
      <footer style={{ background: '#1a2332', color: '#cbd5e1', padding: '40px 24px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 40 }} className="login-footer-grid">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: 'linear-gradient(135deg, #0a9e9e, #3883f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14 }}>L</div>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>LINIO</span>
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0, maxWidth: 280 }}>The intelligent system for families who take their future seriously.</p>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Product</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
              <a href={MARKETING_URL + '/features'} style={{ color: '#cbd5e1', textDecoration: 'none' }}>Features</a>
              <a href={MARKETING_URL + '/pricing'} style={{ color: '#cbd5e1', textDecoration: 'none' }}>Pricing</a>
              <a href={MARKETING_URL + '/#security'} style={{ color: '#cbd5e1', textDecoration: 'none' }}>Security</a>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Company</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
              <a href={MARKETING_URL + '/about'} style={{ color: '#cbd5e1', textDecoration: 'none' }}>About</a>
              <a href={MARKETING_URL + '/#blog'} style={{ color: '#cbd5e1', textDecoration: 'none' }}>Blog</a>
              <a href={MARKETING_URL + '/#contact'} style={{ color: '#cbd5e1', textDecoration: 'none' }}>Contact</a>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Legal</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
              <a href={MARKETING_URL + '/#privacy'} style={{ color: '#cbd5e1', textDecoration: 'none' }}>Privacy Policy</a>
              <a href={MARKETING_URL + '/#terms'} style={{ color: '#cbd5e1', textDecoration: 'none' }}>Terms of Service</a>
              <a href={MARKETING_URL + '/#cookies'} style={{ color: '#cbd5e1', textDecoration: 'none' }}>Cookie Policy</a>
            </div>
          </div>
        </div>
        <div style={{ maxWidth: 1100, margin: '30px auto 0', paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
          © 2026 LINIO Inc. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
