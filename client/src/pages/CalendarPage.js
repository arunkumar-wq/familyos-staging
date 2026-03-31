import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { PageHeader, Modal } from '../components/UI';

export default function CalendarPage() {
  const [tasks,    setTasks]    = useState([]);
  const [showAdd,  setShowAdd]  = useState(false);
  const [form,     setForm]     = useState({ title: '', dueDate: '', priority: 'medium', notes: '' });
  const [loading,  setLoading]  = useState(true);

  const now       = new Date();
  const year      = now.getFullYear();
  const month     = now.getMonth();
  const monthName = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  useEffect(() => {
    api.get('/tasks').then(r => setTasks(r.data)).finally(() => setLoading(false));
  }, []);

  const addTask = async () => {
    if (!form.title) return;
    try {
      const r = await api.post('/tasks', {
        title:    form.title,
        due_date: form.dueDate,
        priority: form.priority,
        notes:    form.notes,
      });
      setTasks(t => [r.data, ...t]);
      setShowAdd(false);
      setForm({ title: '', dueDate: '', priority: 'medium', notes: '' });
    } catch (e) {
      console.error(e);
    }
  };

  const toggleTask = async (task) => {
    const upd = { ...task, is_done: !task.is_done };
    setTasks(ts => ts.map(t => t.id === task.id ? upd : t));
    await api.put(`/tasks/${task.id}`, upd).catch(() => {});
  };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay    = new Date(year, month, 1).getDay();
  const taskDays    = new Set(tasks.filter(t => t.due_date).map(t => new Date(t.due_date).getDate()));
  const pending     = tasks.filter(t => !t.is_done);
  const done        = tasks.filter(t => t.is_done);

  return (
    <div className="page-inner">
      <PageHeader title="Calendar &amp; Tasks" sub={monthName}>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Task</button>
      </PageHeader>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }}>
        {/* Calendar */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <span style={{ fontSize: 15, fontWeight: 600 }}>{monthName}</span>
          </div>
          <div className="cal-grid">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
              <div key={d} className="cal-day-name">{d}</div>
            ))}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`e-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => (
              <div
                key={d}
                className={`cal-day${d === now.getDate() ? ' today' : ''}${taskDays.has(d) && d !== now.getDate() ? ' has-event' : ''}`}
              >
                {d}
              </div>
            ))}
          </div>
        </div>

        {/* Task panels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-header" style={{ paddingBottom: 0 }}>
              <span className="card-header-title">PENDING</span>
              <span style={{ fontSize: 12, color: 'var(--txt3)' }}>{pending.length} tasks</span>
            </div>
            <div style={{ paddingTop: 12 }}>
              {loading ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--txt4)' }}>Loading...</div>
              ) : pending.slice(0, 6).map(t => (
                <div key={t.id} className="task-item" onClick={() => toggleTask(t)}>
                  <div className="task-check" />
                  <span className="task-title">{t.title}</span>
                  {t.due_date && (
                    <span className="task-due" style={{ color: 'var(--txt4)' }}>
                      {new Date(t.due_date).getDate()}/{new Date(t.due_date).getMonth() + 1}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-header-title">COMPLETED</span>
            </div>
            <div style={{ paddingTop: 12 }}>
              {done.slice(0, 3).map(t => (
                <div key={t.id} className="task-item">
                  <div className="task-check done">&#10003;</div>
                  <span className="task-title done">{t.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add Task Modal */}
      {showAdd && (
        <Modal
          title="Add Task"
          onClose={() => setShowAdd(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={addTask}>Add Task</button>
            </>
          }
        >
          <div className="form-group">
            <label className="form-label">Task Title</label>
            <input
              className="form-input"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Renew passport"
              autoFocus
            />
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input
                type="date"
                className="form-input"
                value={form.dueDate}
                onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-select" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
