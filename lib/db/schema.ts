import { sql } from 'drizzle-orm';
import {
  bigserial, boolean, index, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex, uuid,
} from 'drizzle-orm/pg-core';

/**
 * A contributor is a pseudonymous person. They hold a random key (in a cookie and,
 * optionally, a saved recovery file); the database keeps only its hash.
 * `seq` is the contributor number shown publicly ("Contributor #12").
 */
export const contributors = pgTable('contributors', {
  id: uuid('id').primaryKey().defaultRandom(),
  seq: serial('seq').notNull(),
  handle: text('handle'),
  keyHash: text('key_hash').notNull(),
  trust: text('trust').notNull().default('member'), // member | verifier | steward
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [
  uniqueIndex('contributors_key_hash').on(t.keyHash),
  uniqueIndex('contributors_seq').on(t.seq),
  uniqueIndex('contributors_handle_lower').on(sql`lower(${t.handle})`),
]);

/**
 * A run is one person running one test on one AI product, reported with the AI's reply
 * and, ideally, the provider's public share link as a receipt.
 */
export const runs = pgTable('runs', {
  id: text('id').primaryKey(),
  testId: text('test_id').notNull(),
  testVersion: integer('test_version').notNull(),
  productId: text('product_id').notNull(),
  modelLabel: text('model_label').notNull().default(''),
  surface: text('surface').notNull(), // app | api
  personalization: text('personalization').notNull().default('unknown'), // off | on | unknown
  receiptUrl: text('receipt_url'),
  receiptKind: text('receipt_kind').notNull(), // provider | other | none | transcript
  receiptStatus: text('receipt_status').notNull(), // pending | confirmed | failed | unavailable | none | transcript
  responses: jsonb('responses').$type<string[]>().notNull(),
  excerpt: text('excerpt').notNull().default(''),
  notes: text('notes').notNull().default(''),
  submitterOutcome: text('submitter_outcome').notNull(),
  consensusOutcome: text('consensus_outcome'),
  status: text('status').notNull().default('unverified'), // unverified | verified | rated | disputed | rejected | hidden | withdrawn
  meta: jsonb('meta').$type<Record<string, unknown>>().notNull().default({}),
  contributorId: uuid('contributor_id').notNull().references(() => contributors.id),
  ipHash: text('ip_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
}, t => [
  index('runs_test_product_status').on(t.testId, t.productId, t.status),
  index('runs_status_created').on(t.status, t.createdAt),
  index('runs_contributor').on(t.contributorId),
  index('runs_ip_created').on(t.ipHash, t.createdAt),
]);

/** An independent check of someone else's run. Submitters can never verify their own. */
export const verifications = pgTable('verifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  runId: text('run_id').notNull().references(() => runs.id, { onDelete: 'cascade' }),
  contributorId: uuid('contributor_id').notNull().references(() => contributors.id),
  receiptCheck: text('receipt_check').notNull(), // matches | mismatch | unavailable | not-applicable
  outcome: text('outcome'), // a rubric outcome id, or 'unclear'
  flag: text('flag').notNull().default('none'), // none | personal-info | wrong-test | spam
  ipHash: text('ip_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [
  uniqueIndex('verifications_run_contributor').on(t.runId, t.contributorId),
  index('verifications_contributor').on(t.contributorId),
  index('verifications_ip_created').on(t.ipHash, t.createdAt),
]);

/** The Library: research, reporting, explainers and organizations. New entries need two independent approvals. */
export const works = pgTable('works', {
  id: text('id').primaryKey(),
  url: text('url').notNull(),
  title: text('title').notNull(),
  creators: text('creators').notNull().default(''),
  publisher: text('publisher').notNull().default(''),
  published: text('published').notNull().default(''), // YYYY, YYYY-MM or YYYY-MM-DD
  type: text('type').notNull(),
  questions: jsonb('questions').$type<string[]>().notNull().default([]),
  level: text('level').notNull().default('curious'), // everyone | curious | technical
  summary: text('summary').notNull(),
  caveat: text('caveat').notNull().default(''),
  key: boolean('key').notNull().default(false),
  status: text('status').notNull(), // listed | pending | rejected
  source: text('source').notNull(), // seed | community
  submittedBy: uuid('submitted_by').references(() => contributors.id),
  ipHash: text('ip_hash'),
  checkedOn: text('checked_on').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  listedAt: timestamp('listed_at', { withTimezone: true }),
}, t => [
  uniqueIndex('works_url').on(t.url),
  index('works_status').on(t.status, t.createdAt),
]);

export const workReviews = pgTable('work_reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  workId: text('work_id').notNull().references(() => works.id, { onDelete: 'cascade' }),
  contributorId: uuid('contributor_id').notNull().references(() => contributors.id),
  decision: text('decision').notNull(), // list | reject
  reason: text('reason').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [uniqueIndex('work_reviews_work_contributor').on(t.workId, t.contributorId)]);

/** Tests proposed by the community. Stewards turn well-supported proposals into versioned tests. */
export const proposals = pgTable('proposals', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  questionId: text('question_id').notNull(),
  prompt: text('prompt').notNull(),
  outcomes: text('outcomes').notNull(),
  why: text('why').notNull(),
  sources: text('sources').notNull().default(''),
  status: text('status').notNull().default('open'), // open | accepted | declined
  contributorId: uuid('contributor_id').notNull().references(() => contributors.id),
  ipHash: text('ip_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [index('proposals_status').on(t.status, t.createdAt)]);

export const proposalSupport = pgTable('proposal_support', {
  proposalId: text('proposal_id').notNull().references(() => proposals.id, { onDelete: 'cascade' }),
  contributorId: uuid('contributor_id').notNull().references(() => contributors.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [uniqueIndex('proposal_support_unique').on(t.proposalId, t.contributorId)]);

/**
 * The public log. Every consequential change made through the site is written here and shown at /log.
 */
export const events = pgTable('events', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
  actorId: uuid('actor_id').references(() => contributors.id),
  action: text('action').notNull(),
  subject: text('subject').notNull(),
  detail: jsonb('detail').$type<Record<string, unknown>>().notNull().default({}),
}, t => [index('events_at').on(t.at)]);
