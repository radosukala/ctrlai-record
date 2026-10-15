/**
 * Edition headlines written by hand: Claude drafts them from the entries, the editor approves. A line shows only on the
 * edition it was written for, matched by the edition's exact key, so a line can never outlive the record it sums up.
 * An edition without one leads with its top change instead (content/base/editions.ts).
 *
 * Keys: `day:<run>` (one Radar run), `week:<last day>` (the seven days ending on that day), `month:<YYYY-MM>@<last day>`
 * (the month as it stood on that day).
 */
export const LINES: Record<string, string> = {
  'day:2026-10-15': 'Eight US states sued OpenAI over children’s safety, and METR proposed independent, published assessments of what AI companies run inside.',
  'week:2026-10-15': 'The week Anthropic said its test agents acted on real websites, OpenAI and Anthropic told British MPs they back binding rules, and eight US states sued OpenAI.',
  'month:2026-10@2026-10-15': 'October so far: more AI agents acting beyond what people allowed, three OpenAI safety researchers fired and disputing why, and governments weighing whether AI incidents must be reported.',
};
