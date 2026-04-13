import React, { useState, useEffect, useMemo } from 'react';
import api from '../utils/api';
import { PageHeader, Modal } from '../components/UI';
import { fmtDate } from '../utils/formatters';

export default function CalendarPage() {
  const [tasks, setTasks] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({title:'',dueDate:'',priority:'medium',notes:''});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthName = now.toLocaleDateString('en-US',{month:'long',year:'numeric'});
  const [selectedDate, setSelectedDate] = useState(now.getDate());

  useEffect(() => {
    api.get('/tasks')
      .then(r=>setTasks(r.data))
      .catch(() => setError('Failed to load tasks'))
      .finally(()=>setLoading(false));
  }, []);

  const addTask = async () => {
    if (!form.title.trim()) { setError('Task title is required'); return; }
    setError('');
    try {
      await api.post('/tasks',{title:form.title.trim(),due_date:form.dueDate||null,priority:form.priority,notes:form.notes});
      const tasksRes = await api.get('/tasks');
      setTasks(tasksRes.data);
      setShowAdd(false);
      setForm({title:'',dueDate:'',priority:'medium',notes:''});
    } catch(e){
      setError(e.response?.data?.error || 'Failed to add task');
    }
  };

  const toggleTask = async (task) => {
    const upd = {...task,is_done:!task.is_done};
    const prev = [...tasks];
    setTasks(ts=>ts.map(t=>t.id===task.id?upd:t));
    try {
      await api.put('/tasks/'+task.id,upd);
    } catch {
      setTasks(prev);
    }
  };

  const daysInMonth = new Date(year,month+1,0).getDate();
  const firstDay = new Date(year,month,1).getDay();

  const tasksByDate = useMemo(() => {
    const map = {};
    tasks.filter(t => t.due_date).forEach(t => {
      const d = new Date(t.due_date);
      if (d.getMonth() === month && d.getFullYear() === year) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(t);
      }
    });
    return map;
  }, [tasks, month, year]);

  const pending = tasks.filter(t=>!t.is_done);
  const done = tasks.filter(t=>t.is_done);

  return (
    <div className="page-inner">
      <PageHeader title="Calendar &amp; Tasks" sub={monthName}>
        <button className="btn btn-teal" onClick={()=>{setShowAdd(true);setError('');}}>+ Add Task</button>
      </PageHeader>
      {error && !showAdd && (
        <div role="alert" style={{ background: 'var(--red-bg)', border: '1px solid var(--red-border)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: 'var(--red)', fontSize: 13 }}>{error}</div>
      )}
      <div className="dash-grid-2">
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="sec-bar sec-bar-teal">{monthName}</div>
          <div style={{ padding: 16 }}>
            <div className="gcal-grid">
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                <div key={d} className="gcal-header">{d}</div>
              ))}
              {Array.from({length: firstDay}).map((_,i) => (
                <div key={'e-'+i} className="gcal-cell gcal-empty" />
              ))}
              {Array.from({length: daysInMonth}, (_,i) => i+1).map(d => {
                const isToday = d === now.getDate();
                const isSelected = d === selectedDate;
                const dayTasks = tasksByDate[d] || [];
                return (
                  <div key={d}
                    className={'gcal-cell' + (isToday ? ' gcal-today' : '') + (isSelected ? ' gcal-selected' : '')}
                    onClick={() => setSelectedDate(d)}
                  >
                    <div className="gcal-date-num">
                      <span className={isToday ? 'gcal-today-badge' : ''}>{d}</span>
                    </div>
                    <div className="gcal-tasks">
                      {dayTasks.slice(0, 3).map((t, i) => (
                        <div key={i} className="gcal-task-bar" style={{
                          background: t.is_done ? '#d1d5db' : t.priority <= 2 ? '#dc2626' : t.priority <= 5 ? '#f59e0b' : '#0a9e9e',
                          color: t.is_done ? '#9ca3af' : '#fff',
                          textDecoration: t.is_done ? 'line-through' : 'none'
                        }}>
                          {t.title.length > 18 ? t.title.substring(0, 16) + '\u2026' : t.title}
                        </div>
                      ))}
                      {dayTasks.length > 3 && (
                        <div className="gcal-more">+{dayTasks.length - 3} more</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected date detail */}
            <div className="gcal-detail">
              <div className="gcal-detail-header">
                <span>{new Date(year, month, selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                <span className="gcal-detail-count">{(tasksByDate[selectedDate] || []).length} tasks</span>
              </div>
              {!tasksByDate[selectedDate] || tasksByDate[selectedDate].length === 0 ? (
                <div className="gcal-detail-empty">No tasks on this date</div>
              ) : (
                tasksByDate[selectedDate].map(t => (
                  <div key={t.id} className="gcal-detail-task" onClick={() => toggleTask(t)}>
                    <div className="gcal-detail-check" style={{ background: t.is_done ? '#0a9e9e' : 'transparent', borderColor: t.is_done ? '#0a9e9e' : 'var(--border2)' }}>
                      {t.is_done && <span style={{ color: '#fff', fontSize: 10 }}>✓</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: t.is_done ? 'var(--txt4)' : 'var(--txt)', textDecoration: t.is_done ? 'line-through' : 'none' }}>{t.title}</div>
                    </div>
                    <span className="gcal-priority-badge" style={{
                      background: t.priority <= 2 ? '#fee2e2' : t.priority <= 5 ? '#fef3c7' : '#d1fae5',
                      color: t.priority <= 2 ? '#dc2626' : t.priority <= 5 ? '#92400e' : '#065f46'
                    }}>{t.priority <= 2 ? 'High' : t.priority <= 5 ? 'Med' : 'Low'}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div className="card">
            <div className="sec-bar sec-bar-orange" style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingRight:12}}>
              <span>Pending</span>
              <span style={{fontSize:11,opacity:.75}}>{pending.length} tasks</span>
            </div>
            <div>
              {loading ? (
                <div style={{padding:'20px',textAlign:'center',color:'var(--txt4)'}}>Loading...</div>
              ) : pending.length === 0 ? (
                <div style={{padding:'20px',textAlign:'center',color:'var(--txt4)',fontSize:13}}>No pending tasks</div>
              ) : pending.slice(0,8).map(t=>(
                <div key={t.id} className="task-item" onClick={()=>toggleTask(t)}>
                  <div className="task-check"/>
                  <span className="task-title">{t.title}</span>
                  {t.due_date&&(<span className="task-due">{fmtDate(t.due_date)}</span>)}
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="sec-bar sec-bar-navy" style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingRight:12}}>
              <span>Completed</span>
              <span style={{fontSize:11,opacity:.75}}>{done.length}</span>
            </div>
            <div>
              {done.length === 0 ? (
                <div style={{padding:'20px',textAlign:'center',color:'var(--txt4)',fontSize:13}}>No completed tasks</div>
              ) : done.slice(0,5).map(t=>(
                <div key={t.id} className="task-item">
                  <div className="task-check done">✓</div>
                  <span className="task-title done">{t.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {showAdd&&(
        <Modal title="Add Task" onClose={()=>setShowAdd(false)} footer={
          <><button className="btn btn-outline" onClick={()=>setShowAdd(false)}>Cancel</button><button className="btn btn-teal" onClick={addTask}>Add Task</button></>
        }>
          {error && (
            <div role="alert" style={{ background: 'var(--red-bg)', border: '1px solid var(--red-border)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, color: 'var(--red)', fontSize: 13 }}>{error}</div>
          )}
          <div className="form-group">
            <label className="form-label" htmlFor="task-title">Task Title</label>
            <input id="task-title" className="form-input" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Renew passport" autoFocus/>
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="task-due">Due Date</label>
              <input id="task-due" type="date" className="form-input" value={form.dueDate} onChange={e=>setForm(f=>({...f,dueDate:e.target.value}))}/>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="task-priority">Priority</label>
              <select id="task-priority" className="form-select" value={form.priority} onChange={e=>setForm(f=>({...f,priority:e.target.value}))}>
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
              </select>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
