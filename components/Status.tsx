import { BadgeCheck, CircleDashed, Scale, ShieldCheck, Undo2, EyeOff, Ban } from 'lucide-react';
import type { RunStatus } from '@/lib/consensus';

export const STATUS_TEXT: Record<RunStatus, { label: string; explain: string }> = {
  verified: { label: 'Verified', explain: 'Two independent people confirmed the provider’s share link and agreed on what the AI did.' },
  rated: { label: 'Rated, no receipt', explain: 'Two people agreed on what the AI did, but there was no share link from the AI’s maker to confirm it.' },
  unverified: { label: 'Waiting for checks', explain: 'Not yet checked by two independent people. The rating shown is the submitter’s own.' },
  disputed: { label: 'Disputed', explain: 'Checkers disagree about what the AI did. The disagreement is kept visible.' },
  rejected: { label: 'Rejected', explain: 'Checkers found the receipt did not match, or that it was not this test.' },
  hidden: { label: 'Hidden', explain: 'Hidden because it may contain personal information.' },
  withdrawn: { label: 'Withdrawn', explain: 'Withdrawn by the person who added it.' },
};

export function StatusBadge({ status }: { status: RunStatus }) {
  const text = STATUS_TEXT[status];
  const Icon = { verified: BadgeCheck, rated: ShieldCheck, unverified: CircleDashed, disputed: Scale, rejected: Ban, hidden: EyeOff, withdrawn: Undo2 }[status];
  const cls = { verified: 'status-verified', rated: 'status-rated', unverified: 'status-waiting', disputed: 'status-disputed', rejected: 'status-removed', hidden: 'status-removed', withdrawn: 'status-removed' }[status];
  return (
    <span className={`status ${cls}`} title={text.explain}>
      <Icon aria-hidden="true" /> {text.label}
    </span>
  );
}
