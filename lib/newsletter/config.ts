/**
 * The newsletter is switched on by two environment variables. Without them the site shows no signup anywhere,
 * so a missing key never leaves a broken form behind. Pages read this at build time; add the variables, then redeploy.
 */
export type NewsletterConfig = {
  apiKey: string;
  /** The Resend segment that holds confirmed subscribers. Broadcasts go to it. */
  segmentId: string;
  from: string;
  replyTo?: string;
  baseUrl: string;
};

type Env = Record<string, string | undefined>;

export function newsletterConfig(env: Env = process.env): NewsletterConfig | null {
  const apiKey = env.RESEND_API_KEY?.trim();
  const segmentId = env.RESEND_SEGMENT_ID?.trim();
  if (!apiKey || !segmentId) return null;
  return {
    apiKey,
    segmentId,
    from: env.NEWSLETTER_FROM?.trim() || 'Ctrl AI <hello@ctrlai.com>',
    replyTo: env.NEWSLETTER_REPLY_TO?.trim() || undefined,
    baseUrl: (env.RESEND_API_URL?.trim() || 'https://api.resend.com').replace(/\/$/, ''),
  };
}

export function newsletterEnabled(env: Env = process.env): boolean {
  return newsletterConfig(env) !== null;
}
