import { redirect } from 'next/navigation';

/** The Base is the front page now; entries keep their permalinks at /base/<slug>. */
export default function BaseIndex() {
  redirect('/');
}
