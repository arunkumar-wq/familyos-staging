import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('gurmail@linio.ai');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async e => {
    e.preventDefault(); setError(''); setLoading(true);
    try { await login(email, password); }
    catch(err) { setError(err.response?.data?.error || 'Invalid email or password.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="login-bg">
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
        <div style={{marginTop:20,padding:16,background:'var(--surface2)',borderRadius:'var(--r-md)',border:'1px solid var(--border)'}}>
          <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'.06em',color:'var(--accent)',marginBottom:8}}>Demo Credentials</div>
          <div style={{fontSize:12,color:'var(--txt2)',lineHeight:1.7}}>
            <div>Email: gurmail@linio.ai</div>
            <div>Password: password123</div>
          </div>
        </div>
      </div>
    </div>
  );
}
