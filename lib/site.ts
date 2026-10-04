export const SITE = {
  name: 'Ctrl AI',
  tagline: 'What matters about keeping AI under human control. This week, and for good.',
  description: 'Every week, the events and the seven pieces worth your time on AI control, safety and alignment, picked from everything published and measured by how people responded. Plus a Hall of Fame of what you shouldn’t miss.',
  url: (process.env.PUBLIC_ORIGIN ?? 'https://ctrlai.com').replace(/\/$/, ''),
  contentLicense: 'CC BY 4.0',
  contentLicenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  codeLicense: 'AGPL-3.0',
  codeLicenseUrl: 'https://www.gnu.org/licenses/agpl-3.0.html',
  repoUrl: 'https://github.com/radosukala/ctrlai-record',
  suggestUrl: 'https://github.com/radosukala/ctrlai-record/issues/new?title=Suggestion:%20&body=Link:%0A%0AWhy%20it%20belongs:%0A',
};

export function absoluteUrl(path: string): string {
  return `${SITE.url}${path.startsWith('/') ? path : `/${path}`}`;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const SHORT = MONTHS.map(month => month.slice(0, 3));

/** "2026-09-28" → "September 28, 2026"; "2026-09" → "September 2026"; "2020" → "2020". */
export function longDate(value: string): string {
  const [y, m, d] = value.split('-');
  if (!m) return y;
  if (!d) return `${MONTHS[Number(m) - 1]} ${y}`;
  return `${MONTHS[Number(m) - 1]} ${Number(d)}, ${y}`;
}

/** "2026-09-28" → "Sep 28". */
export function shortDate(value: string): string {
  const [, m, d] = value.split('-');
  return `${SHORT[Number(m) - 1]} ${Number(d)}`;
}

/** "September 27 – October 4, 2026", sharing the year (and month) where they match. */
export function dateRange(from: string, to: string): string {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  if (fy !== ty) return `${longDate(from)} – ${longDate(to)}`;
  if (fm !== tm) return `${MONTHS[fm - 1]} ${fd} – ${MONTHS[tm - 1]} ${td}, ${ty}`;
  return `${MONTHS[tm - 1]} ${fd}–${td}, ${ty}`;
}
