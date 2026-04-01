import React from 'react';
import { initials } from '../utils/formatters';

export function Avatar({ firstName, lastName, color = '#1e3a5f', size = 36 }) {
  return (
    <div className="avatar" style={{ width: size, height: size, background: color, fontSize: size * 0.33 }}>
      {initials(firstName, lastName)}
    </div>
  );
}

export function Badge({ color = 'navy', children, dot }) {
  return <span className={`badge badge-${color}${dot ? ' badge-dot' : ''}`}>{children}</span>;
}

export function StatCard({ icon, iconBg, label, value, sub, subUp, subDown, accent }) {
  return (
    <div className={`card stat-card${accent ? ` card-${accent}` : ''}`}>
      {icon && (
        <div className="stat-card-icon-wrap" style={{ background: iconBg || 'var(--blue-light)', color: 'var(--blue)' }}>
          {icon}
        </div>
      )}
      <div className="stat-card-label">{label}</div>
      <div className="stat-card-value">{value}</div>
      {sub && (
        <div className={`stat-card-sub${subUp ? ' up' : subDown ? ' down' : ''}`}>
          {subUp ? '➒' : subDown ? '➓' : ''} {sub}
        </div>
      )}
    </div>
  );
}

export function PageHeader({ title, sub, children }) {
  return (
    <div className="page-header">
      <div className="page-header-left">
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {children && <div className="page-header-actions">{children}</div>}
    </div>
  );
}

export function Modal({ title, onClose, children, footer, maxWidth = 560 }) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={title} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth }}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close dialog">&times;</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

export function LoadingSpinner({ message = 'Loading…' }) {
  return (
    <div className="loading-screen">
      <div className="spinner" />
      <p style={{ color: 'var(--txt3)', fontSize: 13 }}>{message}</p>
    </div>
  );
}

export function EmptyState({ icon, title, sub }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <div className="empty-state-title">{title}</div>
      {sub && <div className="empty-state-sub">{sub}</div>}
    </div>
  );
}

export function ProgressBar({ value, max = 100, color = 'var(--blue)' }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="progress-track">
      <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function SectionLabel({ children }) {
  return <div className="section-label">{children}</div>;
}

export function CardHeader({ title, action }) {
  return (
    <div className="card-header">
      <span className="card-header-title">{title}</span>
      {action}
    </div>
  );
}
