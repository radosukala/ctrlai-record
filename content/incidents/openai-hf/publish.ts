import MANIFEST from './voices.manifest.json';

/**
 * Whether the film may be shown to the public: linked from the homepage, indexed, in the sitemap.
 *
 * The film has voices made with ElevenLabs. Its free plan has no commercial licence, so a film whose voices were made on it must not be published; the same
 * commands run with `--paid` on a paid plan record `paid: true` on each line (docs/FILM-VOICES.md). While the voices are not licensed, the film is shown
 * in development (so that it can be seen and reviewed) and nowhere else: a production build leaves the hero off the homepage and the pages out of search.
 * The music is ours (synthesized in code) and needs no licence.
 */
export const INCIDENT_PATH = '/incident/openai-hugging-face';
export const FILM_PATH = `${INCIDENT_PATH}/film`;
/** The short address (a redirect in next.config.ts) that the videos print: ctrlai.com/film. */
export const FILM_SHORT_PATH = '/film';

type Section = { provider?: string | null; draft?: boolean; lines?: Record<string, { paid?: boolean }> } | undefined;

/** True when every recorded voice (the agents' and the narrator's) was made on a paid ElevenLabs plan; also true when there are no recorded voices at all. */
export function voicesLicensed(m: { provider?: string | null; draft?: boolean; lines?: Record<string, { paid?: boolean }>; narration?: Section }): boolean {
  for (const sec of [{ provider: m.provider, draft: m.draft, lines: m.lines }, m.narration]) {
    if (!sec?.lines || Object.keys(sec.lines).length === 0) continue;
    if (sec.draft || sec.provider !== 'elevenlabs') return false;
    if (!Object.values(sec.lines).every(l => l.paid === true)) return false;
  }
  return true;
}

export const VOICES_LICENSED = voicesLicensed(MANIFEST as unknown as Parameters<typeof voicesLicensed>[0]);
/**
 * `FILM_FORCE_PUBLIC=1` in the environment (for example on a Vercel preview, to show someone the page) makes the film public in a production build whatever the
 * voices are. That is a decision about the voices' licence, so it is made on purpose, in the environment, and never in the code.
 */
export const FILM_PUBLIC = process.env.NODE_ENV !== 'production' || VOICES_LICENSED || process.env.FILM_FORCE_PUBLIC === '1';
