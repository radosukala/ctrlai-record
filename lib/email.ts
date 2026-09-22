import { LOGIN_TOKEN_MINUTES } from './auth';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const DEFAULT_FROM = 'Ctrl AI <record@ctrlai.com>';

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

/**
 * The site's paper and forest palette, written out by hand because mail clients can't read CSS variables
 * or web fonts. The system font stack is deliberate: a client falling back mid-render looks worse.
 */
function shell(body: string): string {
  return `<div style="margin:0;padding:40px 20px;background:#f5f4ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px;background:#fdfdf9;color:#263b31;border:1px solid #d9dcd1;border-radius:12px;">
    <p style="margin:0 0 28px;font-size:15px;font-weight:600;letter-spacing:-0.02em;">[·] ctrl AI</p>
    ${body}
    <p style="margin:36px 0 0;padding-top:22px;border-top:1px solid #e6e7df;font-size:13px;line-height:1.6;color:#667064;">
      You received this because this address was entered on ctrlai.com. There is no password: access works only through links like the one above. If this wasn't you, ignore this email and nothing will happen.
    </p>
  </div>
</div>`;
}

/** Nothing about the address or the link is logged, here or by callers. */
async function send(input: { to: string; subject: string; text: string; html: string }): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return false;
  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: process.env.RESEND_FROM?.trim() || DEFAULT_FROM, to: [input.to], subject: input.subject, text: input.text, html: input.html }),
    });
    if (!response.ok) console.error(`[email] Resend rejected the message with status ${response.status}`);
    return response.ok;
  } catch (error) {
    console.error(`[email] could not reach Resend: ${error instanceof Error ? error.constructor.name : typeof error}`);
    return false;
  }
}

export async function sendSignInEmail(input: { to: string; url: string }): Promise<boolean> {
  const heading = 'Keep your record.';
  const lead = `Open this link to sign in to Ctrl AI. It works once and expires in ${LOGIN_TOKEN_MINUTES} minutes. Your runs and checks stay public under your contributor number or chosen name. This address is never shown to anyone.`;
  const text = `${heading}\n\n${input.url}\n\n${lead}\n`;
  const html = shell(`
    <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:400;line-height:1.1;">${escapeHtml(heading)}</h1>
    <p style="margin:0 0 26px;font-size:15px;line-height:1.6;color:#46554b;">${escapeHtml(lead)}</p>
    <p style="margin:0;"><a href="${escapeHtml(input.url)}" style="display:inline-block;padding:13px 22px;background:#263b31;color:#f5f4ee;font-size:15px;font-weight:500;text-decoration:none;border-radius:6px;">Sign in to Ctrl AI</a></p>
  `);
  return send({ to: input.to, subject: 'Your Ctrl AI sign-in link', text, html });
}
