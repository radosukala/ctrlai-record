import Link from 'next/link';
import '@/components/say/say.css';
import { fmtDate } from '@/components/accord/format';
import { Section } from '@/components/Section';
import { CELLS, CELLS_OWN_WORDS_REFER, CELLS_WITH_NEWS, CHECKED_ON, DAYS_SINCE } from '@/content/accord';
import { STRINGS } from '@/content/accord/strings';
import { nb, type Lang } from '@/content/lang';
import { HUB, PARTS, SAY } from '@/content/say';

/** The hub in one language. The site's header and footer stay in English; the page wraps its own words in lang. */
export function HubView({ lang }: { lang: Lang }) {
  const T = HUB[lang];
  const A = STRINGS[lang];
  return (
    <div className="page say-page" lang={lang}>
      <div className="shell">
        <header className="say-hero">
          <p className="dateline">
            <b>{SAY.name}</b>
            <span>{T.parts}</span>
            <Link href={T.other.href} hrefLang={T.other.lang} lang={T.other.lang} className="muted">{T.other.label}</Link>
          </p>
          <h1 className="headline">{T.headline[0]} <em>{T.headline[1]}</em></h1>
          <p className="lede">{nb(T.lede, lang)}</p>
          {T.note ? <p className="say-note">{T.note}</p> : null}
        </header>
      </div>

      <div className="shell">
        <Section id="parts" title={T.partsTitle} blurb={T.partsBlurb}>
          <ol className="say-parts">
            {PARTS.map((part, i) => {
              const href = part.href[lang];
              return (
                <li className="say-part" key={part.id} id={part.id}>
                  <span className="cap">{i + 1}</span>
                  <div className="say-part-main">
                    <h3>{part.title[lang]}</h3>
                    <p className="say-part-text">{nb(part.text[lang], lang)}</p>
                    <p className="say-part-how">{nb(part.how[lang], lang)}</p>
                  </div>
                  <div className="say-part-side">
                    <span className={`say-state say-state-${part.state}`}>{T.states[part.state]}</span>
                    {href ? <Link className={`key key-sm${part.state === 'live' ? ' key-primary' : ''}`} href={href}>{part.state === 'soon' ? T.preview : T.open}</Link> : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </Section>
      </div>

      <div className="shell">
        <div className="say-now">
          <p className="dateline"><b>{T.nowTitle}</b><span>{A.daysAfter(DAYS_SINCE)}</span><span>{A.checked} {fmtDate(lang, CHECKED_ON)}</span></p>
          <h2>{nb(T.nowLine(CELLS_WITH_NEWS(), CELLS_OWN_WORDS_REFER(), CELLS.length), lang)}</h2>
          <p>{nb(T.nowText, lang)}</p>
          <div className="say-now-actions">
            <Link className="key key-primary" href={A.path}>{T.nowOpen}</Link>
            <Link className="key" href={lang === 'cs' ? '/cs/say/discuss' : '/say/discuss'}>{T.nowAsk}</Link>
          </div>
        </div>
      </div>

      <div className="shell">
        <Section id="rules" title={T.rulesTitle} blurb={T.rulesBlurb}>
          <div className="rules">
            {T.rules.map(rule => (
              <div className="rule" key={rule.title}>
                <h3>{rule.title}</h3>
                <p>{nb(rule.text, lang)}</p>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}
