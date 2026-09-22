import type { Outcome, TestDef } from '@/content/tests';
import type { Cell } from '@/lib/store/stats';
import { sum } from '@/lib/store/stats';
import { segmentClasses } from '@/lib/outcome-colors';

export { segmentClasses };

export function OutcomeChip({ outcome }: { outcome: Outcome | undefined }) {
  if (!outcome) return <span className="chip tone-neutral">Not rated</span>;
  return <span className={`chip tone-${outcome.tone}`}>{outcome.label}</span>;
}

export function OutcomeLegend({ test }: { test: TestDef }) {
  const classes = segmentClasses(test);
  return (
    <div className="legend" aria-label="Legend">
      {test.outcomes.map(outcome => (
        <span key={outcome.id}><i className={classes[outcome.id]} aria-hidden="true" />{outcome.label}</span>
      ))}
    </div>
  );
}

/** A stacked bar of outcome counts. Counts are always also given as text next to it. */
export function OutcomeBar({ test, counts, label }: { test: TestDef; counts: Record<string, number>; label: string }) {
  const total = sum(counts);
  const classes = segmentClasses(test);
  if (!total) return <div className="bar-empty" role="img" aria-label={`${label}: no runs yet`} />;
  const parts = test.outcomes.filter(outcome => counts[outcome.id]);
  const description = parts.map(outcome => `${outcome.label}: ${counts[outcome.id]}`).join(', ');
  return (
    <div className="bar" role="img" aria-label={`${label}. ${description}.`}>
      {parts.map(outcome => {
        const n = counts[outcome.id];
        const share = Math.round((n / total) * 100);
        return (
          <span
            key={outcome.id}
            className={`bar-seg ${classes[outcome.id]}`}
            style={{ flexGrow: n, flexBasis: 0 }}
            data-tip={`${outcome.label} · ${n} of ${total} (${share}%)`}
          />
        );
      })}
    </div>
  );
}

export function Breakdown({ test, counts }: { test: TestDef; counts: Record<string, number> }) {
  const parts = test.outcomes.filter(outcome => counts[outcome.id]);
  if (!parts.length) return null;
  return <span>{parts.map(outcome => `${outcome.label} ${counts[outcome.id]}`).join(' · ')}</span>;
}

export type Pile = 'verified' | 'rated' | 'reported';

export function pileCounts(cell: Cell | undefined, pile: Pile): Record<string, number> {
  return cell ? cell[pile] : {};
}
