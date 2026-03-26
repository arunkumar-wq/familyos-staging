import React from 'react';
import { initials } from '../utils/formatters';

/* ─── AVATAR ──────────────────────────────────────────────────────── */
export function Avatar({ firstName, lastName, color = '#0f1f3d', size = 36 }) {
  return (
    <div
      className="avatar"
      style={{ width: size, height: size, background: color, fontSize: size * 0.32 }}
    >
      {initials(firstName, lastName)}
    </div>
  );
}

/* ─── BADGE ───────────────────────────────────────────────────────── */
export function Badge({ color = 'navy', children }) {
  return <span className={`badge badge-${color}`}>{children}</span>;
}

/* ─── STAT CARD ───────────────────────────────────────────────────── */
export function StatCard({ icon, iconBg, label, value, sub, subUp }) {
  return (
    <div className="card stat-card">
      <div className="stat-card-icon" style={{ background: iconBg || 'rgba(15,31,61,.06)' }}>{icon}</div>
      <div className="stat-card-label">{label}</div>
      <div className="stat-card-value">{value}</div>
      {sub && <div className={`stat-card-sub${subUp ? ' up' : ''}`}>{subUp ? '▲' : '●'} {sub}</div>}
    </div>
  );
}

/* ─── PAGE HEADER ─────────────────────────────────────────────────── */
export function PageHeader({ title, sub, children }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {children && <div className="page-header-actions">{children}</div>}
    </div>
  );
}

/* ─── MODAL ───────────────────────────────────────────────────────── */
export function Modal({ title, onClose, children, footer, maxWidth = 560 }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth }}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

/* ─── LOADING ─────────────────────────────────────────────────────── */
export function LoadingSpinner({ message = 'Loading…' }) {
  return (
    <div className="loading-screen">
      <div className="spinner" />
      <p style={{ color: 'var(--txt3)', fontSize: 13 }}>{message}</p>
    </div>
  );
}

/* ─── EMPTY STATE ─────────────────────────────────────────────────── */
export function EmptyState({ icon, title, sub }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <div className="empty-state-title">{title}</div>
      {sub && <div className="empty-state-sub">{sub}</div>}
    </div>
  );
}

/* ─── SECTION HEADER ──────────────────────────────────────────────── */
export function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt2)', textTransform: 'uppercase', letterSpacing: '.07em' }}>
      {children}
    </div>
  );
}

/* ─── PROGRESS BAR ────────────────────────────────────────────────── */
export function ProgressBar({ value, max = 100, color = 'var(--teal)' }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="progress-track">
      <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

/* ─── SELECT ──────────────────────────────────────────────────────── */
export function Select({ value, onChange, options, style = {} }) {
  return (
    <select
      className="form-select"
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{ height: 34, fontSize: 12, ...style }}
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
