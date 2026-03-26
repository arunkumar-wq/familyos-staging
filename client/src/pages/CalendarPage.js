import React, { useState } from 'react';
import { PageHeader, Badge } from '../components/UI';

const EVENTS = [
  { day: 1,  color: 'var(--rose)',   label: 'Property Tax ₹42,800' },
  { day: 7,  color: 'var(--rose)',   label: 'Passport Renewal Deadline' },
  { day: 13, color: 'var(--navy)',   label: 'Today' },
  { day: 20, color: 'var(--amber)',  label: 'Car Insurance Follow-up' },
  { day: 25, color: 'var(--teal)',   label: 'SBI FD Maturity' },
];

const UPCOMING = [
  { icon: '🏛', title: 'Property Tax Due', sub: 'Mar 1 · ₹42,800 · 6 days', sev: 'rose' },
  { icon: '🚗', title: 'Car Insurance Renewal', sub: 'Apr 1 · HDFC Ergo · 30 days', sev: 'amber' },
  { icon: '📋', title: 'Income Tax Filing', sub: 'Jul 31 · Consult CA first', sev: 'navy' },
  { icon: '🛂', title: 'Passport Expires — Arun', sub: 'Jun 14 · 107 days', sev: 'rose' },
  { icon: '🏥', title: 'Health Insurance Open Enrolment', sub: 'Jan 2026 · Annual', sev: 'violet' },
  { icon: '📈', title: 'Portfolio Review', sub: 'Quarterly · Mar 31', sev: 'teal' },
];

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
// March 2025 starts on Saturday (index 6)
const MONTH_START_DAY = 6;
const MONTH_DAYS = 31;

export default function CalendarPage() {
  const [selectedDay, setSelectedDay] = useState(13);
  const [month] = useState('March 2025');

  const grid = Array.from({ length: 35 }, (_, i) => {
    const day = i - MONTH_START_DAY + 1;
    return day > 0 && day <= MONTH_DAYS ? day : null;
  });

  const eventForDay = d => EVENTS.find(e => e.day === d);

  return (
    <div className="page-inner" style={{ maxWidth: 1100 }}>
      <PageHeader title="Calendar" sub="Deadlines, renewals, and family events">
        <button className="btn btn-outline">← Feb</button>
        <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--navy)', padding: '0 8px', alignSelf: 'center' }}>{month}</span>
        <button className="btn btn-outline">Apr →</button>
        <button className="btn btn-teal">+ Add Event</button>
      </PageHeader>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>
        {/* Calendar grid */}
        <div className="card" style={{ padding: 22 }}>
          <div className="cal-grid" style={{ marginBottom: 8 }}>
            {DAYS.map(d => <div key={d} className="cal-day-name">{d}</div>)}
          </div>
          <div className="cal-grid">
            {grid.map((day, i) => {
              const ev = eventForDay(day);
              const isToday = day === 13;
              const isSelected = day === selectedDay;
              return (
                <div
                  key={i}
                  className={`cal-day${isToday ? ' today' : ''}${ev ? ' has-event' : ''}`}
                  style={{
                    background: isToday ? 'var(--navy)' : isSelected && !isToday ? 'var(--surface2)' : ev ? ev.color + '18' : 'transparent',
                    color: isToday ? '#fff' : ev ? ev.color : day ? 'var(--txt2)' : 'transparent',
                    fontWeight: ev || isToday ? 700 : 400,
                    cursor: day ? 'pointer' : 'default',
                    outline: isSelected && !isToday ? '2px solid var(--teal)' : 'none',
                  }}
                  onClick={() => day && setSelectedDay(day)}
                >
                  {day || ''}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 20, marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
            {[['var(--navy)','Today'],['var(--rose)','Deadline'],['var(--amber)','Reminder'],['var(--teal)','Renewal'],['var(--violet)','Annual']].map(([c,l]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--txt2)' }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />{l}
              </div>
            ))}
          </div>

          {/* Selected day detail */}
          {selectedDay && eventForDay(selectedDay) && (
            <div style={{ marginTop: 16, padding: 14, background: 'var(--surface2)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt2)', marginBottom: 4 }}>Mar {selectedDay}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--txt)' }}>{eventForDay(selectedDay)?.label}</div>
            </div>
          )}
        </div>

        {/* Upcoming events */}
        <div className="card">
          <div style={{ padding: '16px 20px 0', marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt2)', textTransform: 'uppercase', letterSpacing: '.07em' }}>Upcoming Events</span>
          </div>
          {UPCOMING.map((e, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '13px 20px', borderBottom: i < UPCOMING.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer', transition: 'background .1s' }}
              onMouseEnter={el => el.currentTarget.style.background = 'var(--surface2)'}
              onMouseLeave={el => el.currentTarget.style.background = ''}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: `var(--${e.sev}-bg)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{e.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)' }}>{e.title}</div>
                <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 2 }}>{e.sub}</div>
              </div>
              <Badge color={e.sev}>→</Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
