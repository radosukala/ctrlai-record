'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { track } from '@/lib/analytics';
import { youtubeEmbed, type Media } from '@/lib/media';

type Props = {
  media?: Media;
  url: string;
  title: string;
  /** Shown on a typographic card when there's no image. */
  label: string;
  minutes?: number;
  list: string;
  pickId: string;
  sizes: string;
};

/**
 * A pick's picture. Videos play here, in a dialog, and load nothing from YouTube or X until someone presses play.
 * Everything else is a picture that opens the source.
 */
export function MediaThumb({ media, url, title, label, minutes, list, pickId, sizes }: Props) {
  const [playing, setPlaying] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (playing && !element.open) element.showModal();
    const onClose = () => setPlaying(false);
    element.addEventListener('close', onClose);
    return () => element.removeEventListener('close', onClose);
  }, [playing]);

  const playable = media?.type === 'youtube' ? media.embeddable : media?.type === 'x' && Boolean(media.video);

  function play() {
    track('play_video', { list, pick: pickId });
    setPlaying(true);
  }

  if (media && playable) {
    const poster = media.image;
    const file = media.type === 'x' ? media.video : undefined;
    return (
      <>
        <button type="button" className="frame frame-play" onClick={play} aria-label={`Play here: ${title}`}>
          {poster ? <Image src={poster} alt="" fill sizes={sizes} /> : null}
          <span className="play-key" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor" /></svg></span>
          {minutes ? <span className="frame-badge">{minutes} min</span> : null}
        </button>
        {playing ? (
          <dialog ref={dialog} className="player" aria-label={title} onClick={event => { if (event.target === dialog.current) dialog.current?.close(); }}>
            <div className="player-bar">
              <span className="player-title">{title}</span>
              <a href={url} target="_blank" rel="noopener">Open on {file ? 'X' : 'YouTube'}</a>
              <button type="button" className="key key-sm" onClick={() => dialog.current?.close()} aria-label="Close">Close</button>
            </div>
            <div className="player-frame">
              {media.type === 'youtube' ? (
                <iframe
                  src={youtubeEmbed(media.videoId)}
                  title={title}
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              ) : (
                <video src={file} poster={poster} controls autoPlay playsInline />
              )}
            </div>
          </dialog>
        ) : null}
      </>
    );
  }

  if (media?.type === 'x') {
    return (
      <a href={url} target="_blank" rel="noopener" className="frame xcard" tabIndex={-1} aria-hidden="true" data-list={list} data-pick={pickId}>
        <span className="xcard-head">
          {media.avatar ? <Image src={media.avatar} alt="" width={36} height={36} className="xcard-avatar" /> : null}
          <span><b>{media.name}</b><span>@{media.handle}{media.article ? ' · Article' : ''}</span></span>
        </span>
        <span className="xcard-text">{media.text}</span>
      </a>
    );
  }

  if (media?.type === 'link' || (media?.type === 'youtube' && !media.embeddable)) {
    return (
      <a href={url} target="_blank" rel="noopener" className="frame" tabIndex={-1} aria-hidden="true" data-list={list} data-pick={pickId}>
        <Image src={media.image} alt="" fill sizes={sizes} />
        {media.type === 'youtube' && minutes ? <span className="frame-badge">{minutes} min · YouTube</span> : null}
      </a>
    );
  }

  return (
    <a href={url} target="_blank" rel="noopener" className="frame frame-type" tabIndex={-1} aria-hidden="true" data-list={list} data-pick={pickId}>
      <span>{label}</span>
    </a>
  );
}
