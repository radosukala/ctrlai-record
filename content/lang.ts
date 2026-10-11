/** The two languages the site's "A Say in AI" pages are written in. The rest of the site is English only. */
export type Lang = 'en' | 'cs';

/**
 * Czech typography: keep one-letter words (k, s, v, z, o, u, a, i) with the word after them, a number with its percent sign
 * or its thousands group, and a day number with its month, so a line never breaks between them. English text is returned as is.
 */
export function nb(text: string, lang: Lang): string {
  if (lang !== 'cs') return text;
  return text
    .replace(/(^|[\s(„“"])([KkSsVvZzOoUuAaIi])\s+(?=\S)/g, '$1$2 ')
    .replace(/(\d)\s+%/g, '$1 %')
    .replace(/(\d)\s+(?=\d{3}\b)/g, '$1 ')
    .replace(/(\d{1,2}\.)\s+(?=(?:ledna|února|března|dubna|května|června|července|srpna|září|října|listopadu|prosince)\b)/g, '$1 ');
}
