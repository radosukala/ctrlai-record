import type { MetadataRoute } from 'next';
import { ISSUES } from '@/content/issues';
import { UPDATED } from '@/content/hall';
import { FILM_PATH, FILM_PUBLIC, INCIDENT_PATH } from '@/content/incidents/openai-hf/publish';
import { newsletterEnabled } from '@/lib/newsletter/config';
import { absoluteUrl } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: absoluteUrl('/'), lastModified: ISSUES[0].to, changeFrequency: 'weekly', priority: 1 },
    { url: absoluteUrl('/hall-of-fame'), lastModified: UPDATED, changeFrequency: 'weekly', priority: 0.9 },
    { url: absoluteUrl('/about'), changeFrequency: 'monthly', priority: 0.5 },
    ...(newsletterEnabled() ? [{ url: absoluteUrl('/subscribe'), changeFrequency: 'monthly' as const, priority: 0.6 }] : []),
    ...(FILM_PUBLIC ? [{ url: absoluteUrl(FILM_PATH), changeFrequency: 'monthly' as const, priority: 0.9 }, { url: absoluteUrl(INCIDENT_PATH), changeFrequency: 'monthly' as const, priority: 0.8 }] : []),
    ...ISSUES.map(issue => ({ url: absoluteUrl(`/week/${issue.slug}`), lastModified: issue.to, changeFrequency: 'yearly' as const, priority: 0.8 })),
  ];
}
