import { PRODUCTS, getProduct } from '@/content/products';

export type ReceiptKind = 'provider' | 'other' | 'none';

export interface ReceiptCheck {
  ok: boolean;
  kind: ReceiptKind;
  url: string | null;
  error?: string;
}

/**
 * Classifies a receipt link. Only a share link hosted by the product's own maker can make a run
 * "verified"; any other public link (a post with a screenshot, say) is kept but counted separately.
 * The server never fetches these links. Verifiers open them in their own browsers.
 */
export function checkReceipt(raw: string, productId: string): ReceiptCheck {
  const value = raw.trim();
  if (!value) return { ok: true, kind: 'none', url: null };
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { ok: false, kind: 'none', url: null, error: 'That receipt link is not a valid web address.' };
  }
  if (url.protocol !== 'https:') return { ok: false, kind: 'none', url: null, error: 'Receipt links must start with https://.' };
  if (url.username || url.password) return { ok: false, kind: 'none', url: null, error: 'Receipt links cannot contain a username or password.' };
  if (isPrivateHost(url.hostname)) return { ok: false, kind: 'none', url: null, error: 'Receipt links must be public.' };
  if (value.length > 600) return { ok: false, kind: 'none', url: null, error: 'That receipt link is too long.' };

  const location = hostAndPath(url);
  const owner = PRODUCTS.find(product => product.shareLinks.some(prefix => matches(location, prefix)));
  const product = getProduct(productId);
  if (owner && product && owner.id !== product.id && product.id !== 'other') {
    return { ok: false, kind: 'none', url: null, error: `That looks like a ${owner.name} link, but you chose ${product.name}.` };
  }
  if (owner && (owner.id === productId || productId === 'other')) {
    return { ok: true, kind: 'provider', url: url.toString() };
  }
  return { ok: true, kind: 'other', url: url.toString() };
}

function hostAndPath(url: URL): string {
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  return `${host}${url.pathname}`;
}

function matches(location: string, prefix: string): boolean {
  if (!location.startsWith(prefix)) return false;
  // Require something after the prefix: the conversation's own identifier.
  return location.length > prefix.length + 3;
}

function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal') || !host.includes('.')) return true;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return true; // raw IP addresses are never share links
  if (host.startsWith('[')) return true;
  return false;
}
