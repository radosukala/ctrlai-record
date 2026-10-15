import { redirect } from 'next/navigation';

/** The decision briefs are listed with the questions they bear on. */
export default function DecisionsIndex() {
  redirect('/questions#decisions');
}
