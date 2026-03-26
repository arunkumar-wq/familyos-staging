import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, register } = useAuth();
  const [tab, setTab] = useState('login');
  const [form, setForm] = useState({ email: 'arun@familyos.ai', password: 'password123', firstName: '', lastName: '', familyName: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const upd = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
    setLoading(true); setError('');
    try {
      if (tab === 'login') {
        await login(form.email, form.password);
      } else {
        if (!form.firstName || !form.lastName || !form.email || !form.password) {
          throw new Error('All fields are required.');
        }
        await register({ firstName: form.firstName, lastName: form.lastName, email: form.email, password: form.password, familyName: form.familyName });
      }
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = e => { if (e.key === 'Enter') handleSubmit(); };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0f1f3d 0%, #1a3260 55%, #07b98a 100%)', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 22, padding: '36px 36px 28px', width: '100%', maxWidth: 440, boxShadow: '0 24px 80px rgba(0,0,0,.22)' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <div style={{ width: 40, height: 40, background: 'var(--navy)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18 }}>⌂</div>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, color: 'var(--navy)' }}>FamilyOS</span>
        </div>

        {/* Tab toggle */}
        <div style={{ display: 'flex', background: 'var(--surface2)', borderRadius: 10, padding: 3, marginBottom: 24 }}>
          {[['login','Sign in'],['signup','Create account']].map(([id,lbl]) => (
            <button key={id} onClick={() => { setTab(id); setError(''); }}
              style={{ flex: 1, height: 36, border: 'none', background: tab===id?'#fff':'none', color: tab===id?'var(--navy)':'var(--txt2)', borderRadius: 8, fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14, fontWeight: tab===id?600:400, cursor: 'pointer', boxShadow: tab===id?'0 1px 4px rgba(0,0,0,.1)':'none', transition: 'all .15s' }}>
              {lbl}
            </button>
          ))}
        </div>

        <h2 style={{ fontSize: 26, color: 'var(--navy)', marginBottom: 5 }}>
          {tab === 'login' ? 'Welcome back' : 'Create account'}
        </h2>
        <p style={{ fontSize: 14, color: 'var(--txt2)', marginBottom: 24 }}>
          {tab === 'login' ? 'Sign in to your family command center' : 'Start your free 14-day trial'}
        </p>

        {error && (
          <div style={{ background: 'var(--rose-bg)', border: '1px solid var(--rose)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--rose)' }}>{error}</div>
        )}

        {tab === 'signup' && (
          <div className="form-grid-2" style={{ marginBottom: 0 }}>
            <div className="form-group">
              <label className="form-label">First Name</label>
              <input className="form-input" value={form.firstName} onChange={upd('firstName')} placeholder="Arun" onKeyDown={handleKeyDown} />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name</label>
              <input className="form-input" value={form.lastName} onChange={upd('lastName')} placeholder="Kumar" onKeyDown={handleKeyDown} />
            </div>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Email Address</label>
          <input type="email" className="form-input" value={form.email} onChange={upd('email')} placeholder="you@example.com" onKeyDown={handleKeyDown} autoComplete="email" />
        </div>

        <div className="form-group" style={{ marginBottom: tab === 'login' ? 4 : 16 }}>
          <label className="form-label">Password</label>
          <input type="password" className="form-input" value={form.password} onChange={upd('password')} placeholder="••••••••" onKeyDown={handleKeyDown} autoComplete={tab === 'login' ? 'current-password' : 'new-password'} />
        </div>

        {tab === 'login' && (
          <div style={{ textAlign: 'right', marginBottom: 18 }}>
            <a href="#" style={{ fontSize: 13, color: 'var(--teal)', fontWeight: 500 }}>Forgot password?</a>
          </div>
        )}

        {tab === 'signup' && (
          <div className="form-group">
            <label className="form-label">Family Name <span style={{ color: 'var(--txt3)', fontWeight: 400 }}>(optional)</span></label>
            <input className="form-input" value={form.familyName} onChange={upd('familyName')} placeholder="e.g. Kumar Family" onKeyDown={handleKeyDown} />
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{ width: '100%', height: 48, background: loading ? 'var(--txt3)' : 'var(--navy)', color: '#fff', border: 'none', borderRadius: 10, fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', marginBottom: 16, transition: 'background .15s' }}
        >
          {loading ? 'Please wait…' : tab === 'login' ? 'Sign in to FamilyOS →' : 'Create Account & Get Started →'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 14px', color: 'var(--txt3)', fontSize: 13 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />or<div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        <button
          style={{ width: '100%', height: 44, background: '#fff', border: '1.5px solid var(--border2)', borderRadius: 10, fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14, fontWeight: 500, color: 'var(--txt)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
          onMouseLeave={e => e.currentTarget.style.background = '#fff'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--txt2)' }}>
          {tab === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <a href="#" onClick={e => { e.preventDefault(); setTab(tab === 'login' ? 'signup' : 'login'); setError(''); }}
            style={{ color: 'var(--teal)', fontWeight: 600 }}>
            {tab === 'login' ? 'Start free trial →' : 'Sign in →'}
          </a>
        </p>

        {tab === 'login' && (
          <div style={{ marginTop: 16, padding: '10px 14px', background: 'var(--teal-bg)', borderRadius: 8, fontSize: 12, color: 'var(--teal)', textAlign: 'center' }}>
            Demo: <strong>arun@familyos.ai</strong> / <strong>password123</strong>
          </div>
        )}
      </div>
    </div>
  );
}
