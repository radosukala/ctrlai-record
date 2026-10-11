import { LAYERS, COMMITMENTS, type CompanyRecord, type Evidence, type LayerId } from '@/content/accord';
import { STRINGS } from '@/content/accord/strings';
import { nb, type Lang } from '@/content/lang';
import { fmtDate } from './format';
import { StatusMark } from './StatusMark';

const BY_ID = Object.fromEntries(COMMITMENTS.map(c => [c.id, c]));

/** A labelled passage in one or more paragraphs: the label starts the first, a blank line in the data starts a new paragraph. */
function Labelled({ label, text, lang, className }: { label: string; text: string; lang: Lang; className: string }) {
  return <>{text.split(/\n\n+/).map((para, i) => <p className={className} lang={lang} key={i}>{i === 0 ? <><b>{label}</b>{' '}</> : null}{nb(para, lang)}</p>)}</>;
}

/** A summary in one or more paragraphs: a blank line in the data starts a new paragraph. */
export function Paras({ text, lang, className = 'acc-summary' }: { text: string; lang: Lang; className?: string }) {
  return <>{text.split(/\n\n+/).map((para, i) => <p className={className} lang={lang} key={i}>{nb(para, lang)}</p>)}</>;
}

export function EvidenceList({ items, lang = 'en' }: { items: Evidence[]; lang?: Lang }) {
  const T = STRINGS[lang];
  return (
    <ul className="acc-ev-list" lang="en">
      {items.map(e => (
        <li className="acc-ev" key={e.id}>
          <p className="acc-ev-claim">{e.claim}</p>
          <blockquote className="acc-ev-quote"><p>“{e.quote}”</p></blockquote>
          <p className="acc-ev-src">
            <a href={e.url}>{e.publisher}: {e.title}</a>
            <span lang={lang}>{e.published ? fmtDate(lang, e.published) : T.noDate}{e.dateNote ? <> <span lang="en">({e.dateNote})</span></> : null}</span>
            {e.mentionsAccord ? <span className="acc-tag" lang={lang}>{T.mentions}</span> : null}
          </p>
        </li>
      ))}
    </ul>
  );
}

/** A cell's sentence in the page's language, falling back to English (marked as such) when no translation exists. */
function say(lang: Lang, en: string | undefined, cs: string | undefined) {
  if (lang === 'cs' && cs) return { text: cs, lang: 'cs' as const };
  return { text: en ?? '', lang: 'en' as const };
}

function LayerBlock({ company, layer, lang }: { company: CompanyRecord; layer: LayerId; lang: Lang }) {
  const T = STRINGS[lang];
  const c = BY_ID[layer];
  const cell = company.cells[layer];
  const hasEvidence = cell.since.length > 0 || cell.before.length > 0;
  const summary = say(lang, cell.summary, cell.cs?.summary);
  const beforeSummary = say(lang, cell.beforeSummary, cell.cs?.beforeSummary);
  const note = say(lang, cell.note, cell.cs?.note);
  return (
    <article className="acc-layer" id={`${company.id}-${layer}`}>
      <h4>
        <span className="cap">{c.number}</span>
        <span className="acc-layer-name">{lang === 'cs' ? c.shortCs : c.short}</span>
        <StatusMark status={cell.status} lang={lang} />
      </h4>
      <Paras text={summary.text} lang={summary.lang} />
      {cell.before.length > 0 && cell.beforeSummary ? (
        <Labelled label={T.companies.earlierRecord} text={beforeSummary.text} lang={beforeSummary.lang} className="acc-before" />
      ) : null}
      {cell.note ? <Labelled label={T.noteLabel} text={note.text} lang={note.lang} className="acc-note" /> : null}
      {hasEvidence ? (
        <details className="acc-evidence">
          <summary>{T.companies.evidence(T.sources(cell.since.length), T.sources(cell.before.length))}</summary>
          {cell.since.length > 0 ? (
            <>
              <h5>{T.companies.sinceLead}</h5>
              <EvidenceList items={cell.since} lang={lang} />
            </>
          ) : null}
          {cell.before.length > 0 ? (
            <>
              <h5>{T.companies.beforeLead}</h5>
              <EvidenceList items={cell.before} lang={lang} />
            </>
          ) : null}
        </details>
      ) : null}
    </article>
  );
}

export function CompanySection({ company, lang = 'en' }: { company: CompanyRecord; lang?: Lang }) {
  const T = STRINGS[lang];
  return (
    <section className="acc-company" id={company.id} aria-labelledby={`${company.id}-h`}>
      <header className="acc-company-head">
        <h3 id={`${company.id}-h`}>{company.name}</h3>
        <p className="acc-company-meta">
          {T.companies.signedBy(company.signedBy)} {company.entity ? <span lang="en">{company.entity} </span> : null}{T.companies.checked} {fmtDate(lang, company.checkedOn)}.
        </p>
      </header>
      <div className="acc-layers">
        {LAYERS.map(layer => <LayerBlock key={layer} company={company} layer={layer} lang={lang} />)}
      </div>
      <div className="acc-company-foot">
        {company.accordStatements.length > 0 ? (
          <div>
            <h5>{T.companies.statementsLead(company.name)}</h5>
            <EvidenceList items={company.accordStatements} lang={lang} />
          </div>
        ) : (
          <p className="acc-note">{T.companies.none(company.name)}</p>
        )}
        <details className="acc-looked">
          <summary>{T.companies.where} ({company.searched.length})</summary>
          <ul lang="en">{company.searched.map(s => <li key={s}>{s}</li>)}</ul>
          {company.unreachable.length > 0 ? (
            <>
              <h5>{T.companies.couldNot}</h5>
              <ul lang="en">{company.unreachable.map(s => <li key={s}>{s}</li>)}</ul>
            </>
          ) : null}
        </details>
      </div>
    </section>
  );
}
