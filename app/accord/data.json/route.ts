import { ACCORD, CHECKED_ON, COMMITMENTS, COMPANIES, CONTEXT, FULL_TEXT, MEETINGS, SINCE, STATUS_LABEL, STATUS_MEANING, type Evidence } from '@/content/accord';
import { SITE } from '@/lib/site';

/**
 * The tracker's data, open: every status, summary and source, as JSON, under the same license as the rest of our words
 * (CC BY 4.0). Saved source texts are other people's writing and are not included; the quotations are, with their sources.
 */
const strip = (e: Evidence) => {
  const { textFile: _textFile, ...rest } = e;
  return rest;
};

export const dynamic = 'force-static';

export function GET() {
  const body = {
    about: 'Data behind the accord tracker at ' + SITE.url + '/accord. A status says what is public, not what is true inside a company.',
    license: SITE.contentLicense,
    licenseUrl: SITE.contentLicenseUrl,
    checkedOn: CHECKED_ON,
    sinceDate: SINCE,
    accord: { title: ACCORD.title, subtitle: ACCORD.subtitle, published: ACCORD.published, original: ACCORD.original, text: FULL_TEXT },
    statuses: Object.fromEntries(Object.entries(STATUS_LABEL).map(([id, label]) => [id, { label, meaning: STATUS_MEANING[id as keyof typeof STATUS_MEANING] }])),
    commitments: COMMITMENTS.map(({ id, number, short, text, plain, silent }) => ({ id, number, short, text, plainReadingIsOurs: plain, whatTheTextLeavesOpen: silent })),
    companies: COMPANIES.map(c => ({
      id: c.id,
      name: c.name,
      printedAs: c.printedAs,
      signedBy: c.signedBy,
      entity: c.entity ?? null,
      checkedOn: c.checkedOn,
      searched: c.searched,
      unreachable: c.unreachable,
      commitments: Object.fromEntries(
        Object.entries(c.cells).map(([layer, cell]) => [layer, { status: cell.status, summary: cell.summary, beforeSummary: cell.beforeSummary ?? null, note: cell.note ?? null, since: cell.since.map(strip), before: cell.before.map(strip) }]),
      ),
      accordStatements: c.accordStatements.map(strip),
      documents: c.documents,
    })),
    meetings: { checkedOn: MEETINGS.checkedOn, status: MEETINGS.status, summary: MEETINGS.summary, evidence: MEETINGS.evidence.map(strip), statements: (MEETINGS.statements ?? []).map(strip), searched: MEETINGS.searched },
    around: CONTEXT.items.map(i => ({ id: i.id, title: i.title, text: i.text, evidence: i.evidence.map(strip) })),
  };
  return Response.json(body, { headers: { 'Cache-Control': 'public, max-age=300, s-maxage=3600' } });
}
