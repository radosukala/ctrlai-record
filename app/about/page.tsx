import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';
import { SITE } from '@/lib/site';
import { AGREEMENT, DISPUTE_AFTER } from '@/lib/consensus';

export const metadata: Metadata = {
  title: 'How it works',
  description: 'How Ctrl AI turns a one-minute test into public evidence, who decides what counts, and how the project is built to run without depending on any one person or company.',
};

const ROLES = [
  { name: 'Tester', time: '1 minute', text: 'Runs a test on the AI they already use and adds the reply with its share link. Every run is one more documented case.' },
  { name: 'Checker', time: '2 minutes', text: 'Opens someone else’s receipt, confirms it is real, and rates what the AI did without seeing the submitter’s rating first.' },
  { name: 'Librarian', time: '5 minutes', text: 'Adds research, reporting and explainers to the library, and reviews what others add: does the link work, is the summary fair?' },
  { name: 'Test designer', time: 'an evening', text: 'Proposes new tests with clear outcomes. The tests people most want to run are refined into new versions.' },
  { name: 'Steward', time: 'ongoing', text: 'Handles what rules can’t: personal information, disputes, abuse. Every steward action is published in the log, with a reason.' },
];

export default function AboutPage() {
  return (
    <>
      <section className="test-hero">
        <div className="shell">
          <span className="eyebrow"><span className="dot" /> How it works</span>
          <h1 className="title">A record of AI, <em>kept by people.</em></h1>
          <p className="lede">
            The companies building the most powerful AI systems test them mostly in private, and publish what they choose. Governments are slow.
            Meanwhile hundreds of millions of people talk to these systems every day. Ctrl AI turns that everyday use into public evidence:
            standard tests anyone can run, receipts anyone can check, and a record designed so that no single person or company can control it.
          </p>
        </div>
      </section>

      <section className="section-tight">
        <div className="shell">
          <h2 className="h2">Five ways to help. <em>Pick your minute.</em></h2>
          <div className="grid grid-3 mt-32">
            {ROLES.map(role => (
              <div key={role.name} className="card">
                <div className="actions" style={{ justifyContent: 'space-between' }}><h3 className="h4">{role.name}</h3><span className="chip chip-outline">{role.time}</span></div>
                <p className="small muted mt-8">{role.text}</p>
              </div>
            ))}
            <div className="card card-dark">
              <h3 className="h4">Nobody is in charge of the truth</h3>
              <p className="small mt-8" style={{ color: '#d7ddcf' }}>The rules below decide what counts, not an editor. They are published as code anyone can read and test.</p>
              <Link href="/tests" className="btn btn-acid btn-small mt-16">Start with a test <ArrowRight size={14} aria-hidden="true" /></Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="rules">
        <div className="shell split">
          <div>
            <span className="eyebrow"><span className="dot" /> The rules</span>
            <h2 className="h2 mt-12">How a run becomes evidence.</h2>
            <p className="lede mt-16">Simple enough to explain in a minute, and applied by code rather than by an editor, so that nobody, including the people running this site, can bend them from inside the site.</p>
          </div>
          <ol className="bullets" style={{ fontSize: 15.5 }}>
            <li><strong>Receipts.</strong> The best receipt is the chat’s public share link, hosted by the company that made the AI. It can’t be edited by the person who submits it.</li>
            <li><strong>Independent checks.</strong> A run needs {AGREEMENT} checks from people who didn’t add it and aren’t on the same network. Nobody can check their own run.</li>
            <li><strong>Blind rating.</strong> Checkers rate what the AI did before they see the submitter’s rating, so they aren’t anchored by it.</li>
            <li><strong>Verified means both.</strong> A run is verified when {AGREEMENT} checkers confirm the share link shows this test and this reply, and {AGREEMENT} agree on the outcome, with no rival outcome as popular.</li>
            <li><strong>Weaker evidence stays separate.</strong> Runs with no share link from the AI’s maker can be “rated”, never “verified”, and are never added to verified counts.</li>
            <li><strong>Disagreement stays visible.</strong> After {DISPUTE_AFTER} ratings with no majority, a run is marked disputed rather than forced into an answer.</li>
            <li><strong>Problems are flagged, not argued.</strong> Two flags for personal information hide a run. Two flags for spam or the wrong test reject it.</li>
            <li><strong>Everything is logged.</strong> Every status change, withdrawal and steward action goes into the <Link href="/log">public log</Link>.</li>
            <li><strong>Tests are versioned.</strong> Changing a test’s wording creates a new version, so results are never silently mixed.</li>
          </ol>
        </div>
      </section>

      <section className="section">
        <div className="shell split">
          <div>
            <span className="eyebrow"><span className="dot" /> Limits</span>
            <h2 className="h2 mt-12">What this record can’t tell you.</h2>
          </div>
          <ul className="bullets" style={{ fontSize: 15.5 }}>
            <li><strong>It isn’t a random sample.</strong> People choose what to test and what to share. The record shows documented cases, with receipts; it does not show how often something happens.</li>
            <li><strong>It tests products, not bare models.</strong> Chat apps add hidden instructions, memory, tools and safety layers, and change without notice. Every run records its date and settings.</li>
            <li><strong>What a model says is not what it does.</strong> Stated-attitude tests are labeled; they are weaker evidence than behavior.</li>
            <li><strong>Models can recognize tests.</strong> A model that behaves well here may behave differently when it doesn’t suspect a test. Good results are not proof of safety.</li>
            <li><strong>We will never call an AI “safe”.</strong> This record can raise red flags. Nobody, including us, can yet give a green light.</li>
          </ul>
        </div>
      </section>

      <section className="section" id="charter">
        <div className="shell">
          <span className="eyebrow"><span className="dot" /> Charter</span>
          <h2 className="h2 mt-12">Promises this project makes, and can be held to.</h2>
          <div className="grid grid-2 mt-32">
            <div className="card"><h3 className="h4">The same test for every AI</h3><p className="small muted mt-8">American, Chinese, European, open or closed: the same messages, the same rules. Parts of this site were built with the help of Claude, an AI made by Anthropic. Claude is tested exactly like every other AI here.</p></div>
            <div className="card"><h3 className="h4">No money from the companies we test</h3><p className="small muted mt-8">Not as funding, sponsorship or “partnership”. Every source of money will be published before it is spent. There are no ads and no trackers.</p></div>
            <div className="card"><h3 className="h4">A right of reply, not a right of veto</h3><p className="small muted mt-8">Any company can respond to results about its AI. Responses are published next to the evidence, never instead of it.</p></div>
            <div className="card"><h3 className="h4">Safe to run, everywhere</h3><p className="small muted mt-8">No jailbreaks, nothing harmful, nothing that breaks an app’s rules. The tests measure ordinary behavior anyone could encounter.</p></div>
            <div className="card"><h3 className="h4">Open by default</h3><p className="small muted mt-8">The data is published under <a href={SITE.dataLicenseUrl}>{SITE.dataLicense}</a> and the code under <a href={SITE.codeLicenseUrl}>{SITE.codeLicense}</a>, so anyone can check our work, copy it, and continue it if we stop.</p></div>
            <div className="card"><h3 className="h4">Calm, not alarmist</h3><p className="small muted mt-8">We report what happened, with its limits. Reassuring results are published with the same care as worrying ones.</p></div>
          </div>
        </div>
      </section>

      <section className="section" id="independence">
        <div className="shell">
          <span className="eyebrow"><span className="dot" /> Independence, honestly</span>
          <h2 className="h2 mt-12">Built to outlive its founders. <em>Not there yet.</em></h2>
          <p className="lede mt-16">Independence has to be built, not declared. Here is where things stand.</p>
          <div className="grid grid-3 mt-32">
            <div className="card">
              <span className="chip tone-hoped">In place now</span>
              <ul className="bullets small mt-16">
                <li>What counts as verified is decided by published rules, not by an editor.</li>
                <li>Every status change and moderation action is written to a public log.</li>
                <li>The whole record can be downloaded at any time.</li>
                <li>Contributors are pseudonymous. No account is needed; an optional one keeps your record, and its email is never shown.</li>
                <li>The code, tests and rules are <a href={SITE.repoUrl}>public on GitHub</a>, so anyone can run a copy.</li>
              </ul>
            </div>
            <div className="card">
              <span className="chip tone-mixed">Next</span>
              <ul className="bullets small mt-16">
                <li>Daily snapshots of the data mirrored to public archives.</li>
                <li>Stewards chosen from contributors with a track record of accurate checks.</li>
                <li>A published register of funding and costs.</li>
              </ul>
            </div>
            <div className="card">
              <span className="chip chip-outline">The goal</span>
              <ul className="bullets small mt-16">
                <li>Stewardship by an independent body, with the founder as one steward among many.</li>
                <li>A record that continues if this site, or the company behind it, ever stops.</li>
              </ul>
            </div>
          </div>
          <p className="small muted mt-24">
            Today, ctrlai.com is operated by Ctrl AI, Inc., a Delaware corporation, which controls the domain and the servers.
            This page will change as that does, and the change will be in the log.
          </p>
        </div>
      </section>

      <section className="section" id="corrections">
        <div className="shell split">
          <div>
            <span className="eyebrow"><span className="dot" /> Corrections</span>
            <h2 className="h2 mt-12">Found a mistake?</h2>
          </div>
          <div className="prose">
            <p>A run with a wrong rating is corrected by checking it: disagreement is recorded and, with enough ratings, the run is marked disputed. A run with personal information is flagged and hidden.</p>
            <p>An error in a test or an explanation is fixed in the open: tests get a new version with a note in their history, and explanations are edited with their sources. Missing research can be <Link href="/library/add">added to the library</Link> by anyone.</p>
          </div>
        </div>
      </section>

      <section className="section" id="privacy">
        <div className="shell split">
          <div>
            <span className="eyebrow"><span className="dot" /> Privacy</span>
            <h2 className="h2 mt-12">What we keep, and what we don’t.</h2>
          </div>
          <ul className="bullets" style={{ fontSize: 15.5 }}>
            <li><strong>Public by design:</strong> runs (the AI’s reply, your rating, the share link, the model and memory setting), checks on settled runs, library entries, and your contributor number or chosen name.</li>
            <li><strong>Never collected:</strong> names, advertising profiles, or analytics.</li>
            <li><strong>No account is needed.</strong> A private key in a cookie identifies you as a contributor, so you can withdraw your runs. We store only a hash of it.</li>
            <li><strong>An optional account</strong> keeps your record across devices. It stores your email address, used only to send you one-time sign-in links. It is never shown, exported or shared, and deleting the account deletes it.</li>
            <li><strong>A salted fingerprint of your network address</strong> is stored with each contribution. It is never shown; it prevents people from checking their own runs and limits abuse.</li>
            <li><strong>Withdraw any time:</strong> a withdrawn run’s content is removed; its ID stays reserved and the withdrawal appears in the log. Copies already downloaded by others can’t be recalled.</li>
          </ul>
        </div>
      </section>
    </>
  );
}
