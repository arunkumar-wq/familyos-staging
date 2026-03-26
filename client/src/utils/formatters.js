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
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export const initials = (firstName, lastName) =>
  `${(firstName || '')[0] || ''}${(lastName || '')[0] || ''}`.toUpperCase();

export const catIcon = (cat) => ({
  identity: '🪪', finance: '💰', property: '🏠', insurance: '🛡',
  legal: '⚖️', education: '🎓', medical: '🏥', tax: '🧾', other: '📄',
}[cat] || '📄');

export const catColor = (cat) => ({
  identity: 'navy', finance: 'teal', property: 'amber', insurance: 'rose',
  legal: 'violet', education: 'blue', medical: 'teal', tax: 'amber', other: 'navy',
}[cat] || 'navy');

export const assetColor = (cat) => ({
  'real-estate': '#0f1f3d', equities: '#07b98a', 'fixed-income': '#f59e0b',
  cash: '#7c3aed', gold: '#f59e0b', crypto: '#3b82f6', other: '#8fa3c7',
}[cat] || '#8fa3c7');
