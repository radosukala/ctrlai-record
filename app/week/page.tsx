import { redirect } from 'next/navigation';
import { LATEST } from '@/content/issues';

/** "This week" always means the latest issue. */
export default function ThisWeek() {
  redirect(`/week/${LATEST.slug}`);
}
