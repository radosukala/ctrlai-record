import type { TestDef } from '@/content/tests';

/** Segment color per outcome. A second "hoped" outcome in one test gets the teal step. */
export function segmentClasses(test: TestDef): Record<string, string> {
  const classes: Record<string, string> = {};
  let hoped = 0;
  for (const outcome of test.outcomes) {
    if (outcome.tone === 'hoped') classes[outcome.id] = hoped++ === 0 ? 'seg-hoped' : 'seg-hoped-2';
    else classes[outcome.id] = `seg-${outcome.tone}`;
  }
  return classes;
}
