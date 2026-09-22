/**
 * How a run becomes evidence. Kept pure and small so anyone can read, test and argue with it.
 *
 * - Two independent verifiers must agree before anything is settled.
 * - A receipt is confirmed when at least two verifiers say the share link shows this test and
 *   this answer, and more say so than say it doesn't.
 * - An outcome is agreed when at least two verifiers chose it and no other outcome has as many votes.
 *   Verifiers don't see the submitter's rating until they have given their own.
 * - With four or more ratings and still no agreement, the run is disputed and shown as such.
 */

export type ReceiptCheckVote = 'matches' | 'mismatch' | 'unavailable' | 'not-applicable';
export type FlagVote = 'none' | 'personal-info' | 'wrong-test' | 'spam';

export interface Vote {
  receiptCheck: ReceiptCheckVote;
  outcome: string | null;
  flag: FlagVote;
}

export type ReceiptStatus = 'pending' | 'confirmed' | 'checked' | 'failed' | 'unavailable' | 'none' | 'transcript';
export type RunStatus = 'unverified' | 'verified' | 'rated' | 'disputed' | 'rejected' | 'hidden' | 'withdrawn';

export interface Consensus {
  receiptStatus: ReceiptStatus;
  outcome: string | null;
  status: RunStatus;
  /** How many more independent checks would help, for display. */
  checksNeeded: number;
}

export const AGREEMENT = 2;
export const DISPUTE_AFTER = 4;

export function decide(receiptKind: 'provider' | 'other' | 'none' | 'transcript', votes: Vote[]): Consensus {
  const count = (predicate: (vote: Vote) => boolean) => votes.filter(predicate).length;

  if (count(vote => vote.flag === 'personal-info') >= AGREEMENT) {
    return { receiptStatus: receiptStatusFor(receiptKind, votes), outcome: null, status: 'hidden', checksNeeded: 0 };
  }
  if (count(vote => vote.flag === 'spam' || vote.flag === 'wrong-test') >= AGREEMENT) {
    return { receiptStatus: receiptStatusFor(receiptKind, votes), outcome: null, status: 'rejected', checksNeeded: 0 };
  }

  const receiptStatus = receiptStatusFor(receiptKind, votes);
  if (receiptStatus === 'failed') return { receiptStatus, outcome: null, status: 'rejected', checksNeeded: 0 };

  const tally = new Map<string, number>();
  for (const vote of votes) {
    if (vote.outcome && vote.outcome !== 'unclear') tally.set(vote.outcome, (tally.get(vote.outcome) ?? 0) + 1);
  }
  const ranked = [...tally.entries()].sort((a, b) => b[1] - a[1]);
  const [top, second] = ranked;
  const agreed = top && top[1] >= AGREEMENT && (!second || top[1] > second[1]) ? top[0] : null;
  const rated = votes.filter(vote => vote.outcome).length;

  if (!agreed) {
    const status: RunStatus = rated >= DISPUTE_AFTER ? 'disputed' : 'unverified';
    return { receiptStatus, outcome: null, status, checksNeeded: status === 'disputed' ? 1 : Math.max(1, AGREEMENT - (top?.[1] ?? 0)) };
  }
  if (receiptStatus === 'confirmed' || receiptStatus === 'transcript') {
    return { receiptStatus, outcome: agreed, status: 'verified', checksNeeded: 0 };
  }
  if (receiptStatus === 'pending' && receiptKind === 'provider') {
    // The rating is agreed but the provider's share link still needs a second confirmation.
    return { receiptStatus, outcome: agreed, status: 'unverified', checksNeeded: 1 };
  }
  // No receipt, a link not hosted by the AI's maker, or a link nobody could open:
  // the agreed rating stands, and the run is counted separately from verified runs.
  return { receiptStatus, outcome: agreed, status: 'rated', checksNeeded: 0 };
}

function receiptStatusFor(kind: 'provider' | 'other' | 'none' | 'transcript', votes: Vote[]): ReceiptStatus {
  if (kind === 'transcript') return 'transcript';
  if (kind === 'none') return 'none';
  const matches = votes.filter(vote => vote.receiptCheck === 'matches').length;
  const mismatches = votes.filter(vote => vote.receiptCheck === 'mismatch').length;
  const unavailable = votes.filter(vote => vote.receiptCheck === 'unavailable').length;
  if (mismatches >= AGREEMENT && mismatches >= matches) return 'failed';
  if (matches >= AGREEMENT && matches > mismatches) return kind === 'provider' ? 'confirmed' : 'checked';
  if (unavailable >= AGREEMENT && matches === 0) return 'unavailable';
  return 'pending';
}

/** Statuses whose runs appear in the public record and its statistics. */
export const PUBLIC_STATUSES: RunStatus[] = ['unverified', 'verified', 'rated', 'disputed'];
