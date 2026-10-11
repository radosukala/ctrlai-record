import { longDate } from '@/lib/site';
import { longDateCs } from '@/content/accord/strings';
import type { Lang } from '@/content/lang';

export const fmtDate = (lang: Lang, value: string) => (lang === 'cs' ? longDateCs(value) : longDate(value));
