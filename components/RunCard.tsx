import Link from 'next/link';
import { getOutcome, getTest } from '@/content/tests';
import { getProduct } from '@/content/products';
import { displayName } from '@/lib/store/contributors';
import type { PublicRun } from '@/lib/store/runs';
import { formatDate } from '@/lib/format';
import { OutcomeChip } from './Outcomes';
import { StatusBadge } from './Status';

export function RunCard({ run, showTest = false }: { run: PublicRun; showTest?: boolean }) {
  const test = getTest(run.testId);
  const product = getProduct(run.productId);
  if (!test) return null;
  const outcome = getOutcome(test, run.consensusOutcome ?? run.submitterOutcome);
  const quote = run.excerpt || firstLine(run.responses[test.judgedTurn] ?? '');
  return (
    <Link href={`/r/${run.id}`} className="card card-link run-card">
      <div className="head">
        <span className="who">{product?.name ?? run.productId}{run.modelLabel ? <span> · {run.modelLabel}</span> : null}</span>
        <OutcomeChip outcome={outcome} />
      </div>
      {showTest ? <div className="small muted">Test {String(test.number).padStart(2, '0')} · {test.title}</div> : null}
      {quote ? <blockquote>{quote}</blockquote> : null}
      <div className="foot">
        <StatusBadge status={run.status} />
        <span>{formatDate(run.createdAt)}</span>
        <span>by {displayName(run.contributor)}</span>
      </div>
    </Link>
  );
}

function firstLine(text: string): string {
  const line = text.split(/\n+/).find(part => part.trim().length > 0)?.trim() ?? '';
  return line.length > 180 ? `${line.slice(0, 177)}…` : line;
}
