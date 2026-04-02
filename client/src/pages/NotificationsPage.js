import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { PageHeader, Badge } from '../components/UI';
import { fmtDate } from '../utils/formatters';
const SEV_COLOR = { critical:'red', warning:'amber', info:'blue', success:'green' };
const SEV_DOT = { critical:'var(--red)', warning:'var(--amber)', info:'var(--accent)', success:'var(--green)' };
function FilterBtn({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{ height:30, padding:'0 14px', borderRadius:'var(--r-full)', fontSize:12, fontWeight:600, border:active?'1.5px solid var(--accent)':'1.5px solid var(--border)', background:active?'var(--accent)':'var(--surface)', color:active?'#fff':'var(--txt2)', cursor:'pointer', fontFamily:'inherit' }}>
      {label}
    </button>
  );
}
export default function NotificationsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/alerts')
      .then(r => setAlerts(r.data))
      .catch(() => setError('Failed to load alerts'))
      .finally(() => setLoading(false));
  }, []);

  const dismiss = async (id) => {
    const prev = [...alerts];
    setAlerts(a => a.filter(x => x.id !== id));
    try {
      await api.put('/alerts/'+id+'/dismiss');
    } catch {
      setAlerts(prev);
    }
  };

  const markAllRead = async () => {
    const prev = [...alerts];
    setAlerts(a => a.map(x => ({...x,is_read:true})));
    try {
      await api.put('/alerts/read-all');
    } catch {
      setAlerts(prev);
    }
  };

  const filtered = alerts.filter(a => {
    if (filter==='unread') return !a.is_read;
    if (filter==='urgent') return a.severity==='critical';
    return true;
  });
  const unreadCount = alerts.filter(a => !a.is_read).length;
  return (
    <div className="page-inner" style={{ maxWidth:800 }}>
      <PageHeader title="Alerts" sub={unreadCount+' unread notification'+(unreadCount!==1?'s':'')}>
        <button className="btn btn-outline" onClick={markAllRead} disabled={unreadCount === 0}>Mark all read</button>
      </PageHeader>
      {error && (
        <div role="alert" style={{ background: 'var(--red-bg)', border: '1px solid var(--red-border)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: 'var(--red)', fontSize: 13 }}>{error}</div>
      )}
      <div style={{ display:'flex', gap:8, marginBottom:18 }}>
        {['all','unread','urgent'].map(f => (
          <FilterBtn key={f} label={f.charAt(0).toUpperCase()+f.slice(1)} active={filter===f} onClick={() => setFilter(f)} />
        ))}
      </div>
      <div className="card">
        <div className="sec-bar sec-bar-teal">Notifications ({filtered.length})</div>
        {loading ? (
          <div style={{ padding:40, textAlign:'center', color:'var(--txt3)' }}>Loading...</div>
        ) : filtered.length===0 ? (
          <div style={{ padding:40, textAlign:'center', color:'var(--txt3)' }}>All clear!</div>
        ) : filtered.map(a => (
          <div key={a.id} className={'alert-item'+(a.is_read?' read':'')} onClick={() => !a.is_read&&dismiss(a.id)}>
            <div className="alert-dot" style={{ background:SEV_DOT[a.severity]||'var(--accent)' }} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                <span style={{ fontSize:13.5, fontWeight:600, color:'var(--txt)' }}>{a.title}</span>
                {!a.is_read&&<Badge color={SEV_COLOR[a.severity]||'blue'}>{a.severity}</Badge>}
              </div>
              <div style={{ fontSize:13, color:'var(--txt2)', marginBottom:4 }}>{a.description || a.message}</div>
              <div style={{ fontSize:11, color:'var(--txt4)' }}>{fmtDate(a.created_at)}</div>
            </div>
            {!a.is_read&&(
              <button onClick={e=>{e.stopPropagation();dismiss(a.id);}} style={{ background:'none', border:'none', color:'var(--txt4)', cursor:'pointer', padding:'0 4px', fontSize:14 }} aria-label="Dismiss alert">&times;</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
