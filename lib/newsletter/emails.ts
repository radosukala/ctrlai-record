import { button, COLOR, esc, frame, SANS, SERIF } from './html';
import { CONFIRM_DAYS } from './token';

export type Message = { to: string; subject: string; html: string; text: string };

/** The only thing a stranger can trigger: one short message, to an address they typed, asking whether it was them. */
export function confirmEmail(input: { to: string; url: string }): Message {
  const heading = 'One click to finish.';
  const lead = `Someone, hopefully you, asked to get Ctrl AI’s weekly issue at this address: what happened in AI control, and seven pieces worth your time. Nothing is sent until you press the button. The link works for ${CONFIRM_DAYS} days.`;
  const small = 'If it wasn’t you, ignore this email. You won’t hear from us again.';
  const html = frame({
    title: 'Confirm your subscription to Ctrl AI',
    preheader: 'Press the button to start getting the weekly issue.',
    body: `<h1 style="margin:0 0 14px;font-family:${SERIF};font-size:32px;font-weight:400;line-height:1.1;">${esc(heading)}</h1>
<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:${COLOR.ink2};">${esc(lead)}</p>
<p style="margin:0 0 24px;">${button(input.url, 'Confirm my subscription')}</p>
<p style="margin:0;font-size:13px;line-height:1.6;color:${COLOR.muted};">${esc(small)}</p>`,
    footer: 'Ctrl AI · ctrlai.com',
  });
  return { to: input.to, subject: 'Confirm your subscription to Ctrl AI', html, text: `${heading}\n\n${lead}\n\nConfirm: ${input.url}\n\n${small}\n` };
}

/** Sent once, when someone confirms. It answers the question a new subscriber has: what do I read first? */
export function welcomeEmail(input: { to: string; latestUrl: string; latestNumber: number; startUrl: string }): Message {
  const heading = 'You’re in.';
  const lead = 'Each week you’ll get what happened in AI control and the seven pieces worth your time. You can unsubscribe from any issue with one click.';
  const latest = `Meanwhile, here is issue ${input.latestNumber}, the latest. Every item has two independent sources, and the videos play on the page.`;
  const start = 'New to the subject? Start with six videos for one evening.';
  const html = frame({
    title: 'Welcome to Ctrl AI',
    preheader: 'The latest issue, and where to start if you’re new.',
    body: `<h1 style="margin:0 0 14px;font-family:${SERIF};font-size:32px;font-weight:400;line-height:1.1;">${esc(heading)}</h1>
<p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:${COLOR.ink2};">${esc(lead)}</p>
<p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:${COLOR.ink2};">${esc(latest)}</p>
<p style="margin:0 0 26px;">${button(input.latestUrl, `Read issue ${input.latestNumber}`)}</p>
<p style="margin:0;font-size:15px;line-height:1.6;color:${COLOR.ink2};">${esc(start)} <a href="${esc(input.startUrl)}" style="color:${COLOR.ink};">Start here</a>.</p>`,
    footer: 'Ctrl AI · ctrlai.com',
  });
  return {
    to: input.to,
    subject: 'You’re in. Here’s the latest issue',
    html,
    text: `${heading}\n\n${lead}\n\n${latest}\n${input.latestUrl}\n\n${start}\n${input.startUrl}\n`,
  };
}
