import type { MetadataRoute } from 'next';
import { ISSUES } from '@/content/issues';
import { UPDATED } from '@/content/hall';
import { FILM_PATH, FILM_PUBLIC, INCIDENT_PATH } from '@/content/incidents/openai-hf/publish';
import { newsletterEnabled } from '@/lib/newsletter/config';
import { CHECKED_ON } from '@/content/accord';
import { ENTRIES, onRecord } from '@/content/base';
import { DAYS, MONTHS } from '@/content/base/editions';
import { FILINGS } from '@/content/filings';
import { DAY_BEFORE_PATH, DAY_BEFORE_PUBLIC } from '@/content/scenarios/day-before/publish';
import { absoluteUrl } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: absoluteUrl('/'), lastModified: ENTRIES[0]?.published ?? ISSUES[0].to, changeFrequency: 'daily', priority: 1 },
    // The editions: every day's and every month's, at a permanent address.
    ...DAYS.map(d => ({ url: absoluteUrl(`/day/${d}`), lastModified: d, changeFrequency: 'yearly' as const, priority: 0.7 })),
    ...MONTHS.map(m => ({ url: absoluteUrl(`/month/${m}`), changeFrequency: 'daily' as const, priority: 0.8 })),
    { url: absoluteUrl('/base'), changeFrequency: 'daily', priority: 0.8 },
    { url: absoluteUrl('/questions'), changeFrequency: 'weekly', priority: 0.8 },
    // What AI companies told investors, word for word, next to what they say in public.
    ...FILINGS.map(f => ({ url: absoluteUrl(`/filings/${f.slug}`), lastModified: f.filed, changeFrequency: 'monthly' as const, priority: 0.8 })),
    { url: absoluteUrl('/hall-of-fame'), lastModified: UPDATED, changeFrequency: 'weekly', priority: 0.9 },
    { url: absoluteUrl('/accord'), lastModified: CHECKED_ON, changeFrequency: 'weekly', priority: 0.9 },
    { url: absoluteUrl('/cs/accord'), lastModified: CHECKED_ON, changeFrequency: 'weekly', priority: 0.6 },
    { url: absoluteUrl('/say'), changeFrequency: 'weekly', priority: 0.8 },
    { url: absoluteUrl('/cs/say'), changeFrequency: 'weekly', priority: 0.5 },
    { url: absoluteUrl('/say/read'), changeFrequency: 'weekly', priority: 0.6 },
    { url: absoluteUrl('/say/discuss'), changeFrequency: 'weekly', priority: 0.6 },
    { url: absoluteUrl('/cs/say/discuss'), changeFrequency: 'weekly', priority: 0.5 },
    { url: absoluteUrl('/about'), changeFrequency: 'monthly', priority: 0.5 },
    ...(newsletterEnabled() ? [{ url: absoluteUrl('/subscribe'), changeFrequency: 'monthly' as const, priority: 0.6 }] : []),
    ...(FILM_PUBLIC ? [{ url: absoluteUrl(FILM_PATH), changeFrequency: 'monthly' as const, priority: 0.9 }, { url: absoluteUrl(INCIDENT_PATH), changeFrequency: 'monthly' as const, priority: 0.8 }] : []),
    ...(DAY_BEFORE_PUBLIC ? [{ url: absoluteUrl(DAY_BEFORE_PATH), changeFrequency: 'monthly' as const, priority: 0.8 }] : []),
    ...ISSUES.map(issue => ({ url: absoluteUrl(`/week/${issue.slug}`), lastModified: issue.to, changeFrequency: 'yearly' as const, priority: 0.8 })),
    // The Base: every entry, and everyone who spoke or wrote in one (people only mentioned have no page worth indexing).
    { url: absoluteUrl('/people'), changeFrequency: 'daily', priority: 0.7 },
    ...ENTRIES.map(e => ({ url: absoluteUrl(`/base/${e.slug}`), lastModified: e.published, changeFrequency: 'monthly' as const, priority: e.importance === 3 ? 0.8 : e.importance === 2 ? 0.6 : 0.4 })),
    ...onRecord().map(r => ({ url: absoluteUrl(`/people/${r.person.id}`), lastModified: r.latest, changeFrequency: 'weekly' as const, priority: 0.5 })),
  ];
}
