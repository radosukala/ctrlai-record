import Link from 'next/link';
import '@/components/accord/accord.css';
import { Section } from '@/components/Section';
import {
  ABSENCES, ACCORD, CELLS, CELLS_ONLY_OTHERS_REFER, CELLS_OWN_WORDS_REFER, CELLS_WITH_BEFORE, CELLS_WITH_NEWS, CHANGELOG, CHECKED_ON, COMMITMENTS, COMPANIES, DAYS_SINCE,
  CONTEXT, MEETINGS, PARAGRAPHS, SIGNATURES,
} from '@/content/accord';
import { STRINGS } from '@/content/accord/strings';
import type { Lang } from '@/content/lang';
import { SITE } from '@/lib/site';
import { Legend, Matrix } from './Matrix';
import { CompanySection, EvidenceList, Paras } from './Evidence';
import { StatusMark } from './StatusMark';
import { fmtDate } from './format';

const [TITLE, SUBTITLE, WHY, STARTS, , , , , TOGETHER, MEET, CODIFY] = PARAGRAPHS;
const BY_ID = Object.fromEntries(COMMITMENTS.map(c => [c.id, c]));

/** The tracker in one language. The site's header and footer stay in English; the page wraps its own words in lang. */
export function AccordView({ lang }: { lang: Lang }) {
  const T = STRINGS[lang];
  const published = fmtDate(lang, ACCORD.published);
  const plainOf = (id: string) => (lang === 'cs' ? BY_ID[id].plainCs : BY_ID[id].plain);
  const silentOf = (id: string) => (lang === 'cs' ? BY_ID[id].silentCs : BY_ID[id].silent);
  const meetingsSummary = lang === 'cs' && (MEETINGS as { cs?: { summary?: string } }).cs?.summary ? (MEETINGS as { cs?: { summary?: string } }).cs!.summary! : MEETINGS.summary;
  const meetingsLang = meetingsSummary === MEETINGS.summary ? 'en' : 'cs';
  const mail = <a key="mail" href={`mailto:${T.method.correctionsMail}`}>{T.method.correctionsMail}</a>;
  const code = <a key="code" href={SITE.repoUrl}>{lang === 'cs' ? 'zdrojovém kódu' : 'the source code'}</a>;
  const about = <Link key="about" href="/about">{lang === 'cs' ? 'About (anglicky)' : 'About page'}</Link>;
  const fill = (text: string) => {
    const parts = text.split(/(\{mail\}|\{code\}|\{about\})/);
    return parts.map((part, i) => (part === '{mail}' ? <span key={i}>{mail}</span> : part === '{code}' ? <span key={i}>{code}</span> : part === '{about}' ? <span key={i}>{about}</span> : part));
  };
  return (
    <div className="page acc-page" lang={lang}>
      <div className="shell">
        <header className="acc-hero">
          <p className="dateline">
            <b>{T.dateline}</b>
            <span>{T.daysAfter(DAYS_SINCE)}</span>
            <span>{T.checked} {fmtDate(lang, CHECKED_ON)}</span>
            <Link href={T.other.href} hrefLang={T.other.lang} lang={T.other.lang} className="muted">{T.other.label}</Link>
          </p>
          <h1 className="headline">{T.headline[0]} <em>{T.headline[1]}</em></h1>
          <p className="lede">{T.lede(published)}</p>
          {T.translationNote ? <p className="acc-note">{T.translationNote}</p> : null}
          <ul className="acc-figures">
            <li><b>{DAYS_SINCE}</b><span>{T.fig.days}</span></li>
            <li><b>{CELLS_WITH_NEWS()} / {CELLS.length}</b><span>{T.fig.news}</span></li>
            <li><b>{CELLS_OWN_WORDS_REFER()}</b><span>{T.fig.tied(CELLS_ONLY_OTHERS_REFER())}</span></li>
            <li><b>{CELLS_WITH_BEFORE()} / {CELLS.length}</b><span>{T.fig.before}</span></li>
          </ul>
        </header>
      </div>

      <div className="shell">
        <Section id="glance" className="acc-wide" title={T.glance.title} blurb={T.glance.blurb}>
          <Matrix lang={lang} />
          <Legend lang={lang} />
        </Section>
      </div>

      <div className="shell">
        <Section id="promises" title={T.promises.title} blurb={T.promises.blurb}>
          <div className="acc-doc" lang="en">
            <h3>{TITLE}</h3>
            <p className="acc-doc-sub">{SUBTITLE}</p>
            <p>{WHY}</p>
            <p>{STARTS}</p>
            <div className="acc-promises">
              {COMMITMENTS.filter(c => c.id !== 'G').map(c => (
                <div className="acc-promise" key={c.id} id={`promise-${c.id}`}>
                  <span className="cap">{c.number}</span>
                  <p className="acc-promise-words">{c.text}</p>
                  <p className="acc-promise-plain" lang={lang}><b>{T.promises.plain}</b>{plainOf(c.id)}</p>
                  <p className="acc-promise-silent" lang={lang}><b>{T.promises.silent}</b>{silentOf(c.id)}</p>
                </div>
              ))}
            </div>
            <p>{TOGETHER}</p>
            <div className="acc-promise acc-promise-meet" id="promise-G">
              <span className="cap">{T.meet}</span>
              <p className="acc-promise-words">{MEET}</p>
              <p className="acc-promise-plain" lang={lang}><b>{T.promises.plain}</b>{plainOf('G')}</p>
              <p className="acc-promise-silent" lang={lang}><b>{T.promises.silent}</b>{silentOf('G')}</p>
            </div>
            <p>{CODIFY}</p>
            <p className="acc-signers" lang={lang}>
              <b>{T.promises.signedBy}</b>
              {SIGNATURES.map(s => <span key={s.company}>{s.name}, {s.company}</span>)}
              <span>{T.promises.andTrump}</span>
            </p>
          </div>
          <p className="acc-orig" lang={lang}>
            <span>{T.promises.originalLead}</span>
            <a href={ACCORD.original.url}>{T.promises.pdf}</a>
            <a href={ACCORD.original.archived}>{T.promises.ourCopy}</a>
            <a href={ACCORD.original.transcription}>{T.promises.transcription}</a>
            <span>{T.promises.sha} <span className="acc-hash">{ACCORD.original.sha1}</span></span>
            <a href="/accord/data.json">{lang === 'cs' ? 'data tohoto sledování (JSON)' : 'the data behind this page (JSON)'}</a>
          </p>
        </Section>
      </div>

      <div className="shell">
        <Section id="companies" title={T.companies.title} blurb={T.companies.blurb}>
          {T.companies.sourcesNote ? <p className="acc-note" style={{ marginBottom: 20 }}>{T.companies.sourcesNote}</p> : null}
          <div className="acc-companies">
            {COMPANIES.map(c => <CompanySection key={c.id} company={c} lang={lang} />)}
            <section className="acc-company" id="meetings" aria-labelledby="meetings-h">
              <header className="acc-company-head">
                <h3 id="meetings-h">{T.companies.meetingsTitle}</h3>
                <p className="acc-company-meta">{T.companies.meetingsMeta} {T.companies.checked} {fmtDate(lang, MEETINGS.checkedOn)}.</p>
              </header>
              <div className="acc-meetings">
                <p><StatusMark status={MEETINGS.status} lang={lang} /></p>
                <Paras text={meetingsSummary} lang={meetingsLang} />
                {MEETINGS.evidence.length > 0 ? <EvidenceList items={MEETINGS.evidence} lang={lang} /> : null}
                {(MEETINGS.statements ?? []).length > 0 ? (
                  <details className="acc-evidence">
                    <summary>{T.companies.meetingsStatements} ({(MEETINGS.statements ?? []).length})</summary>
                    <EvidenceList items={MEETINGS.statements ?? []} lang={lang} />
                  </details>
                ) : null}
                <details className="acc-looked">
                  <summary>{T.companies.where} ({MEETINGS.searched.length})</summary>
                  <ul lang="en">{MEETINGS.searched.map(s => <li key={s}>{s}</li>)}</ul>
                </details>
              </div>
            </section>
          </div>
        </Section>
      </div>

      {CONTEXT.items.length > 0 ? (
        <div className="shell">
          <Section id="around" title={T.context.title} blurb={T.context.blurb}>
            <div className="acc-context">
              {CONTEXT.items.map(item => {
                const cs = lang === 'cs' && item.cs?.title && item.cs?.text;
                return (
                  <article className="acc-context-item" key={item.id} id={`around-${item.id}`}>
                    <h3 lang={cs ? 'cs' : 'en'}>{cs ? item.cs!.title : item.title}</h3>
                    <Paras text={(cs ? item.cs!.text : item.text) ?? ''} lang={cs ? 'cs' : 'en'} />
                    <details className="acc-evidence">
                      <summary>{T.sources(item.evidence.length)}</summary>
                      <EvidenceList items={item.evidence} lang={lang} />
                    </details>
                  </article>
                );
              })}
            </div>
            <details className="acc-looked" style={{ marginTop: 20 }}>
              <summary>{T.companies.where} ({CONTEXT.searched.length})</summary>
              <ul lang="en">{CONTEXT.searched.map(s => <li key={s}>{s}</li>)}</ul>
              {CONTEXT.unreachable.length > 0 ? (
                <>
                  <h5>{T.companies.couldNot}</h5>
                  <ul lang="en">{CONTEXT.unreachable.map(s => <li key={s}>{s}</li>)}</ul>
                </>
              ) : null}
            </details>
          </Section>
        </div>
      ) : null}

      <div className="shell">
        <Section id="silent" title={T.silent.title} blurb={T.silent.blurb}>
          <div className="rules">
            {ABSENCES.map(a => (
              <div key={a.id} className="rule">
                <h3>{lang === 'cs' ? a.titleCs : a.title}</h3>
                <p>{lang === 'cs' ? a.textCs : a.text}</p>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <div className="shell">
        <Section id="method" title={T.method.title}>
          <div className="prose">
            {T.method.paras.map(p => (
              <p key={p.lead}><strong>{p.lead}</strong> {fill(p.text)}</p>
            ))}
          </div>
          <ul className="acc-log" aria-label={T.method.changes}>
            {CHANGELOG.map(entry => (
              <li key={entry.date + entry.text}>
                <time dateTime={entry.date}>{fmtDate(lang, entry.date)}</time>
                <span lang={lang}>{lang === 'cs' ? entry.cs : entry.text}</span>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <div className="shell">
        <div className="acc-cta">
          <h2>{T.cta.title}</h2>
          <p>{T.cta.text}</p>
          <Link className="key key-primary" href={lang === 'cs' ? '/cs/say/discuss' : '/say/discuss'}>{T.cta.button}</Link>
        </div>
      </div>
    </div>
  );
}
