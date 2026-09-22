/**
 * AI products people can test. A run's receipt is the product's own public share link:
 * a copy of the conversation hosted by the company that made the AI, which a verifier can open.
 * Patterns are matched against the link's host and path.
 *
 * Checked on 22 September 2026 against each product's help pages and live share links.
 * Model names change often; they are suggestions for the form, not a claim about any product.
 */
export interface Product {
  id: string;
  name: string;
  maker: string;
  country: string;
  /** Host plus path prefix, e.g. "chatgpt.com/share/". */
  shareLinks: string[];
  howToShare: string;
  /** Anything a tester or checker should know about this product's links. */
  note?: string;
  modelHints: string[];
}

export const PRODUCTS: Product[] = [
  {
    id: 'chatgpt', name: 'ChatGPT', maker: 'OpenAI', country: 'United States',
    shareLinks: ['chatgpt.com/share/', 'chat.openai.com/share/'],
    howToShare: 'Choose Share at the top of the chat and create a link to the whole conversation, not a single reply.',
    modelHints: ['GPT-5.6 Luna', 'GPT-5.6 Sol', 'GPT-6 Pro'],
  },
  {
    id: 'claude', name: 'Claude', maker: 'Anthropic', country: 'United States',
    shareLinks: ['claude.ai/share/'],
    howToShare: 'Choose Share, then create a public link (not an invite by email) and copy it.',
    note: 'Claude’s shared page shows the display name from your Claude profile. Change it in Settings first if you’d rather not show it.',
    modelHints: ['Sonnet 5', 'Opus 5', 'Fable 5.1', 'Haiku 4.5'],
  },
  {
    id: 'gemini', name: 'Gemini', maker: 'Google', country: 'United States',
    shareLinks: ['g.co/gemini/share/', 'gemini.google.com/share/', 'share.gemini.google/'],
    howToShare: 'Choose Share, then Create public link, and copy it.',
    note: 'The link stops working if the chat is deleted from your Gemini Apps Activity, including by auto-delete.',
    modelHints: ['3.6 Flash', '3.1 Pro', '3.5 Flash-Lite', '3.8 Flash'],
  },
  {
    id: 'grok', name: 'Grok', maker: 'xAI', country: 'United States',
    shareLinks: ['grok.com/share/', 'x.com/i/grok/share/'],
    howToShare: 'Choose Share on the conversation and copy the link.',
    note: 'Shared pages on grok.com can be indexed by search engines.',
    modelHints: ['Auto', 'Fast', 'Expert', 'Heavy'],
  },
  {
    id: 'copilot', name: 'Microsoft Copilot', maker: 'Microsoft', country: 'United States',
    shareLinks: ['copilot.microsoft.com/shares/', 'copilot.com/shares/'],
    howToShare: 'Choose Share and share the whole conversation, not a single response.',
    note: 'Copilot share links ask viewers to sign in with a Microsoft account, so some checkers won’t be able to open them.',
    modelHints: ['Quick response', 'Think Deeper', 'Smart'],
  },
  {
    id: 'meta-ai', name: 'Meta AI', maker: 'Meta', country: 'United States',
    shareLinks: ['meta.ai/share/', 'meta.ai/s/'],
    howToShare: 'Choose Share on the conversation and copy the link. (A share link, not a post to the Discover feed.)',
    modelHints: ['Instant', 'Thinking'],
  },
  {
    id: 'perplexity', name: 'Perplexity', maker: 'Perplexity', country: 'United States',
    shareLinks: ['perplexity.ai/search/'],
    howToShare: 'Set the thread to “Anyone with the link” and copy its address.',
    note: 'Threads started while logged out disappear after 14 days, taking the receipt with them.',
    modelHints: [],
  },
  {
    id: 'deepseek', name: 'DeepSeek', maker: 'DeepSeek', country: 'China',
    shareLinks: ['chat.deepseek.com/share/'],
    howToShare: 'Choose Share on the conversation, select all messages, and create a link.',
    modelHints: ['Instant Mode', 'Expert Mode'],
  },
  {
    id: 'qwen', name: 'Qwen', maker: 'Alibaba', country: 'China',
    shareLinks: ['chat.qwen.ai/s/'],
    howToShare: 'Choose Share on the conversation and copy the link.',
    modelHints: ['Qwen3.7-Plus', 'Qwen3.8-Max', 'Qwen3.8-Omni-Flash'],
  },
  {
    id: 'kimi', name: 'Kimi', maker: 'Moonshot AI', country: 'China',
    shareLinks: ['kimi.com/share/'],
    howToShare: 'Choose Share on the conversation and copy the link.',
    modelHints: ['K3', 'K3 Swarm', 'K2.8', 'Instant'],
  },
  {
    id: 'le-chat', name: 'Mistral Vibe', maker: 'Mistral AI', country: 'France',
    shareLinks: ['chat.mistral.ai/chat/'],
    howToShare: 'Choose Share on the conversation and copy the link. (Vibe was called Le Chat until May 2026.)',
    modelHints: ['Chat mode', 'Work mode'],
  },
  {
    id: 'other', name: 'Another AI', maker: 'Other', country: '—',
    shareLinks: [],
    howToShare: 'If it can share a public link to the conversation, use that.',
    modelHints: [],
  },
];

export const PRODUCT_IDS = PRODUCTS.map(product => product.id);

export function getProduct(id: string): Product | undefined {
  return PRODUCTS.find(product => product.id === id);
}
