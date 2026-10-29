/** "(2,135)" → -2135, "$4,585" → 4585: a cell of a filing's table, in the table's unit. */
export const cell = (s: string) => {
  const n = Number(s.replace(/[$,()\s]/g, ''));
  return /\(/.test(s) ? -n : n;
};

/** The numbers of a table row as its text reads in the filing: "Revenue | $41 | | $386 | …". */
export const cells = (row: string) => row.split('|').slice(1).map(c => c.trim()).filter(Boolean).map(cell);

/** An amount from the table (in millions) as a reader says it: "$41 million", "$16.3 billion". */
export const money = (millions: number) => (Math.abs(millions) < 1000 ? `$${Math.abs(millions).toLocaleString('en-US')} million` : `$${(Math.abs(millions) / 1000).toFixed(1)} billion`);

/** Anthropic's three compute agreements' minimums, in billions, as the filing's passages state them (Microsoft, Google,
 *  Amazon); a test checks each is there, word for word. */
export const COMMITTED = [44.9, 114.5, 110.0];
