/**
 * ParkPilot — Core Helper & Utility Functions
 * Reusable formatting, debounce, ID generators, and string sanitizers.
 */

function formatCurrency(amount) {
  return `$${Number(amount || 0).toFixed(2)}`;
}

function formatMinutes(minutes) {
  const m = Math.floor(minutes || 0);
  const hrs = Math.floor(m / 60);
  const rem = m % 60;
  if (hrs > 0) return `${hrs}h ${rem}m`;
  return `${rem}m`;
}

function generateId(prefix = 'ID') {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
}

function debounce(func, wait = 250) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

if (typeof window !== 'undefined') {
  window.formatCurrency = formatCurrency;
  window.formatMinutes = formatMinutes;
  window.generateId = generateId;
  window.debounce = debounce;
  window.escapeHtml = escapeHtml;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { formatCurrency, formatMinutes, generateId, debounce, escapeHtml };
}
