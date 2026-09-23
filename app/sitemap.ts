import type { MetadataRoute } from 'next';
import { TESTS } from '@/content/tests';
import { QUESTIONS } from '@/content/questions';
import { PRODUCTS } from '@/content/products';
import { EPISODES } from '@/content/tomorrows';
import { absoluteUrl } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ['/', '/tests', '/record', '/verify', '/questions', '/library', '/about', '/data', '/log'];
  return [
    ...pages.map(path => ({ url: absoluteUrl(path), changeFrequency: 'daily' as const, priority: path === '/' ? 1 : 0.7 })),
    ...TESTS.map(test => ({ url: absoluteUrl(`/tests/${test.id}`), changeFrequency: 'daily' as const, priority: 0.9 })),
    ...QUESTIONS.map(question => ({ url: absoluteUrl(`/questions/${question.id}`), changeFrequency: 'weekly' as const, priority: 0.8 })),
    ...EPISODES.map(episode => ({ url: absoluteUrl(`/tomorrows/${episode.slug}`), changeFrequency: 'monthly' as const, priority: 0.9 })),
    ...PRODUCTS.filter(product => product.id !== 'other').map(product => ({ url: absoluteUrl(`/ai/${product.id}`), changeFrequency: 'daily' as const, priority: 0.6 })),
  ];
}
