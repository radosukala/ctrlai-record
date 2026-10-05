/**
 * Mail clients read neither CSS variables nor web fonts, so the site's paper and forest palette is written out by
 * hand, with a system font stack. Layout is tables, because that is what every client still renders the same way.
 */
export const COLOR = {
  paper: '#f5f4ee', card: '#fdfdf9', ink: '#263b31', ink2: '#46554b', muted: '#667064',
  line: '#d9dcd1', line2: '#e6e7df', acid: '#d5eb8c', moss: '#597247', forest: '#263b31',
};
export const SERIF = "Georgia,'Times New Roman',serif";
export const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
export const MONO = "ui-monospace,'SF Mono',Menlo,Consolas,monospace";

export function esc(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

export function button(href: string, label: string): string {
  return `<a href="${esc(href)}" style="display:inline-block;padding:13px 22px;background:${COLOR.forest};color:${COLOR.paper};font-family:${SANS};font-size:15px;font-weight:600;text-decoration:none;border-radius:6px;">${esc(label)}</a>`;
}

/** The frame every email shares: wordmark, a card for the content, and a quiet footer. */
export function frame(input: { title: string; preheader: string; label?: string; body: string; footer: string }): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${esc(input.title)}</title></head>
<body style="margin:0;padding:0;background:${COLOR.paper};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;line-height:1px;">${esc(input.preheader)}${'&nbsp;&zwnj;'.repeat(40)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLOR.paper};"><tr><td align="center" style="padding:28px 14px 36px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
<tr><td style="padding:0 4px 16px;font-family:${SANS};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="font-size:20px;font-weight:600;letter-spacing:-0.04em;color:${COLOR.ink};">[·] ctrl<sup style="font-size:10px;letter-spacing:0;">AI</sup></td>
<td align="right" style="font-family:${MONO};font-size:11.5px;letter-spacing:0.08em;text-transform:uppercase;color:${COLOR.muted};">${input.label ? esc(input.label) : ''}</td>
</tr></table></td></tr>
<tr><td style="background:${COLOR.card};border:1px solid ${COLOR.line};border-radius:12px;padding:30px 30px 32px;font-family:${SANS};color:${COLOR.ink};">
${input.body}
</td></tr>
<tr><td style="padding:18px 4px 0;font-family:${SANS};font-size:12.5px;line-height:1.6;color:${COLOR.muted};">${input.footer}</td></tr>
</table></td></tr></table></body></html>`;
}
