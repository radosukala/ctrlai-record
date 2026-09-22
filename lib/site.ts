export const SITE = {
  name: 'Ctrl AI',
  tagline: 'The public record of how AI behaves.',
  description: 'Run a 60-second test on the AI you use. Add the receipt. Two strangers check it. Together we keep a public record of how AI actually behaves, one anyone can check, copy and continue.',
  url: (process.env.PUBLIC_ORIGIN ?? 'https://ctrlai.com').replace(/\/$/, ''),
  dataLicense: 'CC BY 4.0',
  dataLicenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  codeLicense: 'AGPL-3.0',
  codeLicenseUrl: 'https://www.gnu.org/licenses/agpl-3.0.html',
  hashtag: '#CtrlAI',
  repoUrl: 'https://github.com/radosukala/ctrlai-record',
};

export function absoluteUrl(path: string): string {
  return `${SITE.url}${path.startsWith('/') ? path : `/${path}`}`;
}
