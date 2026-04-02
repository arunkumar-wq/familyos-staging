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
      const r = await api.post('/tasks',{title:form.title.trim(),due_date:form.dueDate||null,priority:form.priority,notes:form.notes});
      // Reload tasks to get full data
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
  const taskDays = useMemo(() => new Set(tasks.filter(t=>t.due_date).map(t=>{
    const d = new Date(t.due_date);
    if (d.getMonth() === month && d.getFullYear() === year) return d.getDate();
    return null;
  }).filter(Boolean)), [tasks, month, year]);

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
      <div className="dash-grid-2" style={{display:'grid',gridTemplateColumns:'1fr 340px',gap:14}}>
        <div className="card">
          <div className="sec-bar sec-bar-teal">{monthName}</div>
          <div style={{padding:20}}>
            <div className="cal-grid" role="grid" aria-label="Calendar">
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>(<div key={d} className="cal-day-name" role="columnheader">{d}</div>))}
              {Array.from({length:firstDay}).map((_,i)=>(<div key={'e-'+i} role="gridcell"/>))}
              {Array.from({length:daysInMonth},(_,i)=>i+1).map(d=>(
                <div key={d} role="gridcell" className={'cal-day'+(d===now.getDate()?' today':'')+(taskDays.has(d)&&d!==now.getDate()?' has-event':'')}>{d}</div>
              ))}
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
                  <div className="task-check done">v</div>
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
