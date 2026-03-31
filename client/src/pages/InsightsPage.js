import React from 'react';
import { PageHeader, Badge, StatCard } from '../components/UI';

const INSIGHTS = [
  { id: 1, sev: 'urgent',  tag: 'URGENT',   tagClr: 'red',   bdrClr: 'var(--red)',   title: 'Passport expiring in 47 days - act now',      body: 'Your passport expires Jun 14, 2025. Renewal takes 6-8 weeks via Passport Seva. A trip is scheduled in 60 days. Apply immediately.', actions: [['primary','Start Renewal'],['outline','View Document']] },
  { id: 2, sev: 'urgent',  tag: 'URGENT',   tagClr: 'red',   bdrClr: 'var(--red)',   title: 'Property tax Rs.42,800 due in 12 days',       body: 'Annual property tax for your Noida property is due March 1. Late fee 1.5% per month applies. AI pre-filled the payment form.', actions: [['primary','Pay Now'],['outline','Schedule']] },
  { id: 3, sev: 'warning', tag: 'REVIEW',   tagClr: 'amber', bdrClr: 'var(--amber)', title: 'Will and Testament is 4 years old',            body: 'Your will was last updated Jan 2021. You have since acquired a new property and had life changes. Experts recommend reviewing every 3-5 years.', actions: [['primary','Find Lawyer'],['outline','View Doc']] },
  { id: 4, sev: 'warning', tag: 'OPTIMIZE', tagClr: 'amber', bdrClr: 'var(--amber)', title: 'Portfolio drift: equities over target by 4.2%', body: 'Strong performance has shifted your allocation to 36.2% (target 32%). AI recommends moving Rs.6.2L into fixed income to restore balance.', actions: [['primary','Rebalance Plan'],['outline','Ignore 30d']] },
  { id: 5, sev: 'info',    tag: 'SAVE',     tagClr: 'teal',  bdrClr: 'var(--teal)',  title: 'AI found cheaper car insurance - save Rs.8,400/yr', body: 'Your current HDFC Ergo policy renews Apr 1. AI compared 10 insurers. Bajaj Allianz quoted Rs.12,400 vs your current Rs.20,800 for equivalent coverage.', actions: [['primary','Compare Quotes']] },
  { id: 6, sev: 'info',    tag: 'OPTIMIZE', tagClr: 'blue',  bdrClr: 'var(--blue)',  title: 'FD rates improved - lock in higher returns',  body: 'SBI is currently offering 7.5% for 2-year FDs vs your existing 6.8%. Rolling over 1 FD could earn Rs.52,000 extra over 2 years.', actions: [['primary','View FD Options']] },
];

export default function InsightsPage() {
  return (
    <div className="page-inner" style={{ maxWidth: 900 }}>
      <PageHeader title="AI Insights" sub="Proactive intelligence across your vault and finances">
        <button className="btn btn-outline">Preferences</button>
        <button className="btn btn-teal">Run Analysis</button>
      </PageHeader>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 28 }}>
        <StatCard icon="!" iconBg="var(--red-bg)"    label="Urgent"       value="2"  sub="Action required"   accent="red"    />
        <StatCard icon="~" iconBg="var(--amber-bg)"  label="Warnings"     value="3"  sub="Review within 30d" accent="amber"  />
        <StatCard icon="*" iconBg="var(--teal-bg)"   label="Suggestions"  value="6"  sub="Optimise and save" subUp accent="teal" />
        <StatCard icon="+" iconBg="var(--purple-bg)" label="Auto-Actions" value="14" sub="This month"        accent="purple" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {INSIGHTS.map(ins => (
          <div key={ins.id} className="card insight-card" style={{ borderColor: ins.bdrClr, padding: 20 }}>
            <div style={{ display: 'flex', gap: 14 }}>
              <div className="insight-icon" style={{ background: 'var(--' + ins.tagClr + '-bg)' }}>
                {ins.sev === 'urgent' ? '!' : ins.sev === 'warning' ? '~' : '*'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <Badge color={ins.tagClr}>{ins.tag}</Badge>
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--txt)', marginBottom: 7 }}>{ins.title}</div>
                <div style={{ fontSize: 13, color: 'var(--txt2)', lineHeight: 1.65, marginBottom: 12 }}>{ins.body}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {ins.actions.map(([v, label]) => (
                    <button key={label} className={'btn btn-' + (v === 'primary' ? 'primary' : 'outline') + ' btn-sm'}>{label}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}