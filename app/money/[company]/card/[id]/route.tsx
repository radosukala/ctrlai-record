import { ImageResponse } from 'next/og';
import { COMPANIES, getCompany, latestFiling } from '@/content/money';
import { LossCard, POST_X_SIZE, ogFonts } from '@/lib/og';
import { lossSteps, rowOf, short, signed } from '@/lib/money';
import { money } from '@/lib/filings';
import { shortDate } from '@/lib/site';

/** Cards for a company's page, for its maker to post (the picture is the same on X and LinkedIn): /money/<company>/card/<id>. */
const CARDS = ['net-loss'];

export const dynamicParams = false;

export function generateStaticParams() {
  return COMPANIES.flatMap(c => CARDS.map(id => ({ company: c.slug, id })));
}

export async function GET(_request: Request, { params }: { params: Promise<{ company: string; id: string }> }) {
  const { company: slug, id } = await params;
  const company = getCompany(slug);
  if (!company || !CARDS.includes(id)) return new Response('Not found', { status: 404 });
  const f = latestFiling(company);
  const last = f.money.table.columns.length - 1;
  const [net, fair, opLoss, cash] = ['net-loss', 'fair-value', 'operating-loss', 'operating-cash'].map(k => rowOf(f, k)[last]);
  const steps = lossSteps(f).map(s => ({ label: s.label, value: s.value, tone: s.tone, amount: `${s.value < 0 ? '−' : '+'}${short(s.value)}` }));
  return new ImageResponse(
    <LossCard
      label={`The money · ${company.name} ${f.form} · filed ${shortDate(f.filed)}, ${f.filed.slice(0, 4)}`}
      title={`Where the ${money(net)} loss comes from`}
      steps={steps}
      takeaway={`${money(fair)} is a change in what ${company.name} owes on convertible notes, not cash paid out. The operating loss was ${money(opLoss)}; cash from operations was ${signed(cash).replace('⁠', '')}.`}
      disclosure="Ctrl AI is written with Claude, made by Anthropic; same rules for every company. Not investment advice."
    />,
    { ...POST_X_SIZE, fonts: await ogFonts() },
  );
}
