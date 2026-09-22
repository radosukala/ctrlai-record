const dateFormat = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const dateTimeFormat = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' });

export function formatDate(iso: string | Date): string {
  return dateFormat.format(typeof iso === 'string' ? new Date(iso) : iso);
}

export function formatDateTime(iso: string | Date): string {
  return `${dateTimeFormat.format(typeof iso === 'string' ? new Date(iso) : iso)} UTC`;
}

/** Dates stored as YYYY, YYYY-MM or YYYY-MM-DD, shown at the precision they were recorded. */
export function formatPublished(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return formatDate(`${value}T00:00:00Z`);
  if (/^\d{4}-\d{2}$/.test(value)) return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}-01T00:00:00Z`));
  return value;
}

export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count.toLocaleString('en-US')} ${count === 1 ? one : many}`;
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
