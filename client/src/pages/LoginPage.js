import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, register } = useAuth();
  const [mode,    setMode]    = useState('login');
  const [form,    setForm]    = useState({ email: '', password: '', firstName: '', lastName: '' });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const upd = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    setLoading(true); setError('');
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await register({ firstName: form.firstName, lastName: form.lastName, email: form.email, password: form.password });
    } catch (e) {
      setError(e.response?.data?.error || 'An error occurred. Please try again.');
    } finally { setLoading(false); }
  };

  const demoLogin = async () => {
    setLoading(true); setError('');
    try { await login('arun@familyos.ai', 'password123'); }
    catch (e) { setError('Demo login failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="login-bg">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">F</div>
          <span className="login-logo-text">FamilyOS</span>
        </div>
        <div className="login-title">{mode === 'login' ? 'Welcome back' : 'Create account'}</div>
        <div className="login-sub">
          {mode === 'login' ? 'Sign in to your family dashboard' : 'Start managing your family finances'}
        </div>
        {error && (
          <div style={{ background: 'var(--red-bg)', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: 'var(--red)', fontSize: 13 }}>
            {error}
          </div>
        )}
        {mode === 'register' && (
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">First Name</label>
              <input className="form-input" value={form.firstName} onChange={upd('firstName')} placeholder="Arun" />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name</label>
              <input className="form-input" value={form.lastName} onChange={upd('lastName')} placeholder="Kumar" />
            </div>
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="form-input" type="email" value={form.email} onChange={upd('email')} placeholder="you@example.com" onKeyDown={e => e.key === 'Enter' && submit()} />
        </div>
        <div className="form-group">
          <label className="form-label">Password</label>
          <input className="form-input" type="password" value={form.password} onChange={upd('password')} placeholder="Enter password" onKeyDown={e => e.key === 'Enter' && submit()} />
        </div>
        <button className="btn btn-primary" style={{ width: '100%', height: 44, fontSize: 15, marginTop: 4, marginBottom: 12 }} onClick={submit} disabled={loading}>
          {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
        </button>
        {mode === 'login' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span style={{ fontSize: 12, color: 'var(--txt4)' }}>OR</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>
            <button className="btn btn-outline" style={{ width: '100%', height: 44, fontSize: 13, marginBottom: 16 }} onClick={demoLogin} disabled={loading}>
              Try Demo - arun@familyos.ai
            </button>
          </>
        )}
        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--txt3)' }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError(''); }} style={{ background: 'none', border: 'none', color: 'var(--blue)', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
            {mode === 'login' ? 'Sign up free' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}
