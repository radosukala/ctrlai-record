import Link from 'next/link';
import type { Metadata } from 'next';
import { Plus, Search } from 'lucide-react';
import { getDb } from '@/lib/db/client';
import { listWorks, pendingWorkCount, WORK_TYPES, WORK_TYPE_LABELS, LEVELS, LEVEL_LABELS } from '@/lib/store/works';
import { QUESTIONS, getQuestion } from '@/content/questions';
import { WorkItem } from '@/components/WorkItem';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Library',
  description: 'Research, reporting, explainers, organizations and debates about AI safety and human control of AI, in one place, with sources and caveats.',
};

type Search = { question?: string; type?: string; level?: string; q?: string };

export default async function LibraryPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const question = params.question && getQuestion(params.question) ? params.question : undefined;
  const type = params.type && (WORK_TYPES as readonly string[]).includes(params.type) ? params.type : undefined;
  const level = params.level && (LEVELS as readonly string[]).includes(params.level) ? params.level : undefined;
  const q = params.q?.slice(0, 80) || undefined;
  const db = await getDb();
  const [works, all, pending] = await Promise.all([listWorks(db, { question, type, level, q }), listWorks(db, {}), pendingWorkCount(db)]);
  const typeCounts = all.reduce<Record<string, number>>((acc, work) => ({ ...acc, [work.type]: (acc[work.type] ?? 0) + 1 }), {});
  const href = (patch: Partial<Search>) => {
    const next = new URLSearchParams();
    const merged = { question, type, level, q, ...patch };
    for (const [key, value] of Object.entries(merged)) if (value) next.set(key, value);
    const query = next.toString();
    return query ? `/library?${query}` : '/library';
  };

  return (
    <>
      <section className="test-hero">
        <div className="shell">
          <span className="eyebrow"><span className="dot" /> Library</span>
          <h1 className="title">Everything worth reading about AI and human control. <em>In one place.</em></h1>
          <p className="lede">
            Research papers, investigations, explainers, videos, laws and the organizations doing the work, from people who are alarmed and people who are skeptical.
            New additions are checked by two people before they are listed. The launch collection was compiled with the help of AI research assistants, and every link was opened and checked on 22 September 2026.
          </p>
          <div className="actions mt-24">
            <Link href="/library/add" className="btn btn-primary"><Plus size={16} aria-hidden="true" /> Add a work</Link>
            <Link href="/library/review" className="btn btn-ghost">Review new additions{pending ? ` (${pending})` : ''}</Link>
          </div>
        </div>
      </section>

      <section className="section-tight">
        <div className="shell split-wide">
          <div>
            <form action="/library" className="actions" role="search" style={{ flexWrap: 'nowrap' }}>
              {question ? <input type="hidden" name="question" value={question} /> : null}
              {type ? <input type="hidden" name="type" value={type} /> : null}
              {level ? <input type="hidden" name="level" value={level} /> : null}
              <label className="sr-only" htmlFor="library-search">Search the library</label>
              <input id="library-search" className="input" name="q" defaultValue={q} placeholder="Search titles, authors, summaries" />
              <button className="btn btn-primary" type="submit" aria-label="Search"><Search size={16} aria-hidden="true" /></button>
            </form>
            <p className="small muted mt-16">
              {works.length} {works.length === 1 ? 'work' : 'works'}{question ? ` on “${getQuestion(question)?.title}”` : ''}{type ? ` · ${WORK_TYPE_LABELS[type as keyof typeof WORK_TYPE_LABELS]}` : ''}{q ? ` matching “${q}”` : ''}
              {question || type || level || q ? <> · <Link href="/library">clear filters</Link></> : null}
            </p>
            <div className="mt-24">
              {works.length ? works.map(work => <WorkItem key={work.id} work={work} />) : (
                <div className="empty"><h3>Nothing matches.</h3><p>Try fewer filters, or <Link href="/library/add">add what’s missing</Link>.</p></div>
              )}
            </div>
          </div>
          <aside className="stack sticky" style={{ ['--stack' as string]: '20px' }}>
            <div>
              <h2 className="kind">Question</h2>
              <div className="filters mt-8">
                <Link className="filter" href={href({ question: undefined })} aria-current={!question ? 'true' : undefined}>All</Link>
                {QUESTIONS.map(item => (
                  <Link key={item.id} className="filter" href={href({ question: item.id })} aria-current={question === item.id ? 'true' : undefined}>{item.title}</Link>
                ))}
              </div>
            </div>
            <div>
              <h2 className="kind">Kind</h2>
              <div className="filters mt-8">
                <Link className="filter" href={href({ type: undefined })} aria-current={!type ? 'true' : undefined}>All</Link>
                {WORK_TYPES.filter(item => typeCounts[item]).map(item => (
                  <Link key={item} className="filter" href={href({ type: item })} aria-current={type === item ? 'true' : undefined}>
                    {WORK_TYPE_LABELS[item]} <small>{typeCounts[item]}</small>
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <h2 className="kind">Level</h2>
              <div className="filters mt-8">
                <Link className="filter" href={href({ level: undefined })} aria-current={!level ? 'true' : undefined}>All</Link>
                {LEVELS.map(item => (
                  <Link key={item} className="filter" href={href({ level: item })} aria-current={level === item ? 'true' : undefined}>{LEVEL_LABELS[item]}</Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
