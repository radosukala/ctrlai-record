import { ISSUES } from '@/content/issues';
import { SITE, absoluteUrl, dateRange } from '@/lib/site';

export const dynamic = 'force-static';

function escape(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** One item per weekly issue: the summary, then the seven picks with links. */
export function GET() {
  const items = ISSUES.map(issue => {
    const link = absoluteUrl(`/week/${issue.slug}`);
    const body = `<p>${escape(issue.summary)}</p><ol>${issue.picks.map(pick => `<li><a href="${escape(pick.url)}">${escape(pick.title)}</a> · ${escape(pick.creator)}<br>${escape(pick.why)}</li>`).join('')}</ol>`;
    return `<item>
  <title>${escape(`Issue ${issue.number}: ${dateRange(issue.from, issue.to)}`)}</title>
  <link>${link}</link>
  <guid isPermaLink="true">${link}</guid>
  <pubDate>${new Date(`${issue.to}T18:00:00Z`).toUTCString()}</pubDate>
  <description>${escape(body)}</description>
</item>`;
  }).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Ctrl AI · This week in AI control</title>
  <link>${SITE.url}</link>
  <atom:link href="${absoluteUrl('/feed.xml')}" rel="self" type="application/rss+xml"/>
  <description>${escape(SITE.description)}</description>
  <language>en</language>
${items}
</channel>
</rss>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
