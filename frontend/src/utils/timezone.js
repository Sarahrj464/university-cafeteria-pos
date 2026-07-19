export const DEFAULT_TIMEZONE = 'Asia/Karachi';
export const DEFAULT_LOCALE = 'en-US';

let activeTimeZone = DEFAULT_TIMEZONE;
let activeLocale = DEFAULT_LOCALE;

export function setTimeZone(timeZone) {
  activeTimeZone = typeof timeZone === 'string' && timeZone.trim() ? timeZone.trim() : DEFAULT_TIMEZONE;
}

export function setLocale(locale) {
  activeLocale = typeof locale === 'string' && locale.trim() ? locale.trim() : DEFAULT_LOCALE;
}

function safeDate(value) {
  if (value === null || value === undefined) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDateTime(
  value,
  {
    timeZone = activeTimeZone,
    locale = activeLocale,
    dateStyle = 'medium',
    timeStyle = 'short',
    hour12,
  } = {}
) {
  const d = safeDate(value);
  if (!d) return '';
  return new Intl.DateTimeFormat(locale, {
    dateStyle,
    timeStyle,
    timeZone,
    ...(hour12 === undefined ? {} : { hour12 }),
  }).format(d);
}

export function formatTime(
  value,
  {
    timeZone = activeTimeZone,
    locale = activeLocale,
    hour12 = false,
  } = {}
) {
  const d = safeDate(value);
  if (!d) return '';
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12,
  }).format(d);
}

export function formatDate(
  value,
  {
    timeZone = activeTimeZone,
    locale = activeLocale,
  } = {}
) {
  const d = safeDate(value);
  if (!d) return '';
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d);
}

// For human "time ago" without external libs.
export function formatTimeAgo(value, { timeZone = DEFAULT_TIMEZONE } = {}) {
  const d = safeDate(value);
  if (!d) return '';

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);

  const abs = Math.abs(diffSeconds);
  const isPast = diffSeconds >= 0;

  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  const units = [
    { name: 'year', seconds: 31536000 },
    { name: 'month', seconds: 2592000 },
    { name: 'week', seconds: 604800 },
    { name: 'day', seconds: 86400 },
    { name: 'hour', seconds: 3600 },
    { name: 'minute', seconds: 60 },
    { name: 'second', seconds: 1 },
  ];

  for (const u of units) {
    if (abs >= u.seconds || u.name === 'second') {
      const value = Math.round(abs / u.seconds) * (isPast ? -1 : 1);
      return rtf.format(value, u.name);
    }
  }

  return '';
}

