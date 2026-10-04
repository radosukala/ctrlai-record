'use client';

import { useEffect } from 'react';
import { track } from '@/lib/analytics';

/** Counts which picks people open. Like everything in lib/analytics, it does nothing without consent. */
export function TrackOutbound() {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const link = (event.target as Element | null)?.closest?.('a[data-pick]');
      if (!link) return;
      track('open_pick', { list: link.getAttribute('data-list') ?? '', pick: link.getAttribute('data-pick') ?? '' });
    }
    document.addEventListener('click', onClick);
    document.addEventListener('auxclick', onClick);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('auxclick', onClick);
    };
  }, []);
  return null;
}
