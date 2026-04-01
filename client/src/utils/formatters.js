export const fmtINR = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

export const fmtK = (n) => {
  const v = Math.abs(n || 0);
  if (v >= 10000000) return '₹' + (v / 10000000).toFixed(2) + ' Cr';
  if (v >= 100000)   return '₹' + (v / 100000).toFixed(2) + ' L';
  return '₹' + v.toLocaleString('en-IN');
};

export const fmtDate = (d) => {
  if (!d) return '—';
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
};

export const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
};

export const initials = (f, l) => `${(f || '')[0] || ''}${(l || '')[0] || ''}`.toUpperCase();

export const catIcon = (c) => ({ identity: '🪪', finance: '💰', property: '🏠', insurance: '🛡', legal: '⚖️', education: '🎓', medical: '🏥', tax: '🧾', other: '📄' }[c] || '📄');

export const catColor = (c) => ({ identity: 'navy', finance: 'teal', property: 'amber', insurance: 'red', legal: 'purple', education: 'blue', medical: 'teal', tax: 'amber', other: 'gray' }[c] || 'gray');

export const assetColor = (c) => ({ 'real-estate': '#1e429f', equities: '#057a55', 'fixed-income': '#c27803', cash: '#6c2bd9', gold: '#f59e0b', crypto: '#3b82f6', mf: '#0891b2', other: '#6b7280' }[c] || '#6b7280');
