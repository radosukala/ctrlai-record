import type { Moment } from '../../lib/moments';
import momentsJson from './moments.json';

/**
 * When each timed, speaker-certain quotation is said in its recording, word by word (scripts/radar/moments.ts builds
 * the file in the daily finish). A quotation with a moment can be played from its source and lit up as it is spoken.
 */
export const MOMENTS = momentsJson as Record<string, Moment>;
export const momentFor = (quoteId: string): Moment | undefined => MOMENTS[quoteId];
