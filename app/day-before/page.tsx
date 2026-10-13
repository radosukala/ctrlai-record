import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DayBefore } from '@/components/scenario/DayBefore';
import { Evidence } from '@/components/scenario/Evidence';
import { DAY_BEFORE_PATH, DAY_BEFORE_PUBLIC, DAY_BEFORE_SHOWN } from '@/content/scenarios/day-before/publish';
import { FILM } from '@/content/scenarios/day-before/film';
import { absoluteUrl } from '@/lib/site';

const TITLE = 'The day before';
const MINUTES = Math.round(FILM.duration / 60);
const DESCRIPTION = `A ${MINUTES}-minute rehearsal for the day after an AI breach, on a model city that is not real. You make five decisions; between them, people on the record argue the other side. Every quotation is word for word, with its source.`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  robots: DAY_BEFORE_PUBLIC ? { index: true, follow: true } : { index: false, follow: false },
  alternates: { canonical: DAY_BEFORE_PATH },
  openGraph: { title: TITLE, description: DESCRIPTION, type: 'video.other', url: absoluteUrl(DAY_BEFORE_PATH) },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
};

export default function DayBeforePage() {
  if (!DAY_BEFORE_SHOWN) notFound();
  return (
    <div className="page dbf-page">
      <div className="shell">
        <header className="hero">
          <div className="hero-main">
            <p className="dateline"><b>A rehearsal</b> · about {MINUTES} minutes · a synthetic narrator and music</p>
            <h1 className="headline">The day before.</h1>
            <p className="lede">
              A rehearsal for the day after a large AI-enabled cyberattack. You make five decisions across ten days in an invented city. Between
              decisions, people on the record argue the options, and everything they say is a quotation you can check. Nothing in the picture is real.
            </p>
            <p className="lede">
              Axios reported on 9 October that executives at AI companies are privately gaming out what follows a catastrophic AI event.{' '}
              <Link href="/base/axios-2026-10-09-ai-companies-day-after-scenarios">Our record of that report</Link>. This rehearsal is for everyone else.
            </p>
          </div>
        </header>
      </div>
      <DayBefore />
      <Evidence />
    </div>
  );
}
