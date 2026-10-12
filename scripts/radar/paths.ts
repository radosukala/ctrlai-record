import { existsSync } from 'node:fs';

/**
 * Where the Radar keeps its private working files (other people's text, raw feeds, drafts). Git-excluded. In a linked
 * worktree they live in the main checkout, so look there too, or set RADAR_DOCS.
 */
export const RADAR_DOCS = [process.env.RADAR_DOCS, '../ctrlai-com/docs-internal/radar', 'docs-internal/radar'].find(d => d && existsSync(d)) ?? 'docs-internal/radar';
export const radarDir = (run: string) => `${RADAR_DOCS}/${run}`;
