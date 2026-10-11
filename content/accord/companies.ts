import type { CompanyId, CompanyRecord, ContextItem, Evidence, Status } from './types';
import { COMPANY_ORDER } from './facts';
import anthropic from './companies/anthropic.json';
import google from './companies/google.json';
import meta from './companies/meta.json';
import nvidia from './companies/nvidia.json';
import openai from './companies/openai.json';
import xai from './companies/xai.json';
import meetingsJson from './meetings.json';
import contextJson from './context.json';

/**
 * What each company has shown publicly, curated from sources we opened and saved. The data lives in ./companies/<id>.json;
 * scripts/verify-accord.ts checks every quotation in it against the saved source text and writes ./verification.json.
 */
const BY_ID = { anthropic, google, meta, nvidia, openai, xai } as unknown as Record<CompanyId, CompanyRecord>;

export const COMPANIES: CompanyRecord[] = COMPANY_ORDER.map(id => BY_ID[id]);

export const company = (id: string): CompanyRecord | undefined => COMPANIES.find(c => c.id === id);

/** The meeting commitment belongs to the companies together, so it has one record, not six. */
export const MEETINGS = meetingsJson as unknown as {
  checkedOn: string;
  status: Status;
  summary: string;
  /** Sources about the companies meeting or working together, dated on or after the accord. The status rests on these. */
  evidence: Evidence[];
  /** What signers have said about working together. Listed, but not counted toward the status. */
  statements?: Evidence[];
  searched: string[];
};

/** What is happening around the accord: the order signed with it, the reactions, the critics and the defenders. */
export const CONTEXT = contextJson as unknown as { checkedOn: string; items: ContextItem[]; searched: string[]; unreachable: string[] };
