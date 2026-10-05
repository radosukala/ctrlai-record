import type { Issue } from '@/content/issues';
import { KIND_LABEL, STANCE_LABEL } from '@/content/types';
import { mediaFor } from '@/lib/media';
import { dateRange, longDate, shortDate } from '@/lib/site';
import { signals } from '@/lib/stats';
import { button, COLOR, esc, frame, MONO, SANS, SERIF } from './html';

/** Resend replaces this with a one-click unsubscribe link for each person when it sends a broadcast. */
export const UNSUBSCRIBE = '{{{RESEND_UNSUBSCRIBE_URL}}}';

export type RenderedIssue = { subject: string; preheader: string; html: string; text: string };

export function issueSubject(issue: Issue): string {
  return issue.subject ?? `Issue ${issue.number}: ${issue.main[0].headline}`;
}

/** Links back to the site carry where the visit came from, so the numbers can say what the email did. */
function ours(origin: string, path: string, issue: Issue): string {
  const url = new URL(path, origin);
  url.searchParams.set('utm_source', 'newsletter');
  url.searchParams.set('utm_medium', 'email');
  url.searchParams.set('utm_campaign', `issue-${issue.number}`);
  return url.toString();
}

/** Renders an issue as an email. `origin` must be the live site: images and links are absolute. */
export function renderIssueEmail(issue: Issue, origin: string): RenderedIssue {
  const page = ours(origin, `/week/${issue.slug}`, issue);
  const hall = ours(origin, '/hall-of-fame#start-here', issue);
  const subject = issueSubject(issue);
  const range = dateRange(issue.from, issue.to);

  const sources = (event: Issue['main'][number]) => event.sources.map(source => `<a href="${esc(source.url)}" style="color:${COLOR.ink2};">${esc(source.label)}</a>`).join(' · ');

  const main = issue.main.map(event => `
<tr><td style="padding:16px 0;border-top:1px solid ${COLOR.line2};">
<div style="font-family:${MONO};font-size:12px;color:${COLOR.muted};">${esc(shortDate(event.date))}</div>
<div style="margin-top:3px;font-size:17px;font-weight:600;line-height:1.35;color:${COLOR.ink};">${esc(event.headline)}</div>
<div style="margin-top:5px;font-size:15px;line-height:1.55;color:${COLOR.ink2};">${esc(event.text)}</div>
<div style="margin-top:7px;font-size:12.5px;color:${COLOR.muted};">${sources(event)}</div>
</td></tr>`).join('');

  const also = issue.also.map(event => `
<tr><td style="padding:9px 0;border-top:1px solid ${COLOR.line2};font-size:14.5px;line-height:1.5;color:${COLOR.ink2};">
<span style="font-family:${MONO};font-size:12px;color:${COLOR.muted};">${esc(shortDate(event.date))}</span>&nbsp; <strong style="color:${COLOR.ink};">${esc(event.headline)}.</strong> ${esc(event.text)} <span style="font-size:12.5px;color:${COLOR.muted};">${sources(event)}</span>
</td></tr>`).join('');

  const picks = issue.picks.map((pick, index) => {
    const media = mediaFor(pick.url);
    const image = media && 'image' in media && media.image ? `${origin}${media.image}` : null;
    const numbers = signals(pick, 'week').slice(0, 4).map(signal => `${signal.value} ${signal.label}`).join(' · ');
    const byline = pick.outlet && pick.outlet !== pick.creator ? `${pick.creator} · ${pick.outlet}` : pick.creator;
    const kind = pick.minutes ? `${KIND_LABEL[pick.kind]}, ${pick.minutes} min` : KIND_LABEL[pick.kind];
    return `
<tr><td style="padding:22px 0;border-top:1px solid ${COLOR.line};">
<div style="font-family:${SERIF};font-size:24px;line-height:1;color:${COLOR.moss};">${index + 1}</div>
${image ? `<a href="${esc(ours(origin, `/week/${issue.slug}#${pick.id}`, issue))}" style="text-decoration:none;"><img src="${esc(image)}" width="536" alt="${esc(pick.title)}" style="display:block;width:100%;max-width:536px;height:auto;margin:10px 0 0;border:1px solid ${COLOR.line};border-radius:6px;"></a>` : ''}
<div style="margin-top:12px;font-family:${SERIF};font-size:23px;line-height:1.15;"><a href="${esc(pick.url)}" style="color:${COLOR.ink};text-decoration:none;">${esc(pick.title)}</a></div>
<div style="margin-top:6px;font-size:13.5px;line-height:1.5;color:${COLOR.muted};">${esc(byline)} · ${esc(kind)} · ${esc(longDate(pick.published))} · <strong>${esc(STANCE_LABEL[pick.stance])}</strong></div>
<div style="margin-top:8px;font-size:15px;line-height:1.55;color:${COLOR.ink2};">${esc(pick.why)}</div>
${numbers ? `<div style="margin-top:8px;font-family:${MONO};font-size:12px;color:${COLOR.muted};">${esc(numbers)}</div>` : ''}
</td></tr>`;
  }).join('');

  const section = (title: string) => `<h2 style="margin:34px 0 4px;padding-top:0;font-family:${SERIF};font-size:28px;font-weight:400;line-height:1.1;color:${COLOR.ink};">${esc(title)}</h2>`;

  const body = `
<h1 style="margin:0 0 12px;font-family:${SERIF};font-size:38px;font-weight:400;line-height:1.05;letter-spacing:-0.01em;">This week in <em style="color:${COLOR.moss};">AI control</em></h1>
<p style="margin:0 0 4px;font-size:16px;line-height:1.6;color:${COLOR.ink2};">${esc(issue.summary)}</p>
<p style="margin:14px 0 0;">${button(page, 'Open this week on ctrlai.com')} <span style="font-size:13px;color:${COLOR.muted};">&nbsp;Videos play on the page.</span></p>
${section('What happened')}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:6px;">${main}${also ? `<tr><td style="padding:14px 0 4px;border-top:1px solid ${COLOR.line};font-family:${MONO};font-size:11.5px;letter-spacing:0.1em;text-transform:uppercase;color:${COLOR.muted};">Also this week</td></tr>${also}` : ''}</table>
${section(`Seven worth your time`)}
<p style="margin:4px 0 0;font-size:14.5px;line-height:1.55;color:${COLOR.muted};">Picked from everything published this week, in the order we’d open them. The numbers show how people responded, not whether it’s right.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px;">${picks}</table>
<p style="margin:26px 0 0;padding-top:22px;border-top:1px solid ${COLOR.line};font-size:15px;line-height:1.6;color:${COLOR.ink2};">New to the subject? <a href="${esc(hall)}" style="color:${COLOR.ink};font-weight:600;">Start with six videos, one evening</a>, from the Hall of Fame.</p>`;

  const footer = `You’re getting this because you subscribed to Ctrl AI at ctrlai.com.<br><a href="${UNSUBSCRIBE}" style="color:${COLOR.muted};">Unsubscribe</a> · <a href="${esc(ours(origin, '/about#privacy', issue))}" style="color:${COLOR.muted};">Privacy</a> · <a href="${esc(page)}" style="color:${COLOR.muted};">View on the web</a>`;

  const html = frame({ title: subject, preheader: issue.summary, label: `Issue ${issue.number} · ${range}`, body, footer });

  const lines: string[] = [
    `This week in AI control · Issue ${issue.number} · ${range}`, '', issue.summary, '', `Open this week (videos play on the page): ${page}`, '',
    'WHAT HAPPENED', '',
    ...issue.main.flatMap(event => [`${shortDate(event.date)} · ${event.headline}`, event.text, `Sources: ${event.sources.map(source => `${source.label} ${source.url}`).join(' · ')}`, '']),
    ...(issue.also.length ? ['ALSO THIS WEEK', '', ...issue.also.flatMap(event => [`${shortDate(event.date)} · ${event.headline}. ${event.text}`, `  ${event.sources.map(source => source.url).join(' · ')}`, '']) ] : []),
    'SEVEN WORTH YOUR TIME', '',
    ...issue.picks.flatMap((pick, index) => [`${index + 1}. ${pick.title}`, `   ${pick.creator}${pick.outlet && pick.outlet !== pick.creator ? ` · ${pick.outlet}` : ''} · ${KIND_LABEL[pick.kind]}${pick.minutes ? `, ${pick.minutes} min` : ''} · ${STANCE_LABEL[pick.stance]}`, `   ${pick.why}`, `   ${pick.url}`, '']),
    `New to the subject? Six videos, one evening: ${hall}`, '',
    '—', `You’re getting this because you subscribed to Ctrl AI at ctrlai.com.`, `Unsubscribe: ${UNSUBSCRIBE}`, '',
  ];
  return { subject, preheader: issue.summary, html, text: lines.join('\n') };
}
