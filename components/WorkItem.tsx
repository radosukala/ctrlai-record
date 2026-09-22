import { ArrowUpRight, Star } from 'lucide-react';
import type { Work } from '@/lib/store/works';
import { WORK_TYPE_LABELS, LEVEL_LABELS, type WorkType } from '@/lib/store/works';
import { formatPublished, hostOf } from '@/lib/format';

export function WorkItem({ work }: { work: Work }) {
  const type = WORK_TYPE_LABELS[work.type as WorkType] ?? work.type;
  const level = LEVEL_LABELS[work.level as keyof typeof LEVEL_LABELS];
  const byline = [work.creators, work.publisher && work.publisher !== work.creators ? work.publisher : ''].filter(Boolean).join(' · ');
  return (
    <article className="work">
      <div className="meta">
        {work.key ? <span className="key-mark inline-icon"><Star size={12} aria-hidden="true" fill="currentColor" /> Essential</span> : null}
        <span>{type}</span>
        {work.published ? <span>{formatPublished(work.published)}</span> : null}
        {level ? <span>{level}</span> : null}
      </div>
      <h3>
        <a href={work.url} target="_blank" rel="noopener noreferrer">
          {work.title} <ArrowUpRight size={14} aria-hidden="true" style={{ verticalAlign: '-1px' }} />
        </a>
      </h3>
      <div className="small muted">{[byline, byline.toLowerCase().includes(hostOf(work.url).toLowerCase()) ? '' : hostOf(work.url)].filter(Boolean).join(' · ')}</div>
      <p>{work.summary}</p>
      {work.caveat ? <p className="caveat">Worth knowing: {work.caveat}</p> : null}
    </article>
  );
}
