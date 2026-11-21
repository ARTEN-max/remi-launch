"use client";

import { useState } from "react";

const VIDEO_ID = "4C_XYeDMT8A";
const TITLE = "my AI remembered my sister's exam 3 months later";

/**
 * Click-to-load facade. The thumbnail is a lazy image; the YouTube player
 * is not requested until someone presses play, so first paint stays local.
 * hqdefault is a 4:3 frame with the vertical short in the center, so a
 * 9:16 crop shows the video and drops the blurred side bars.
 */
export function InterviewShort() {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="relative aspect-[9/16] w-36 shrink-0 overflow-hidden rounded-3xl border border-border bg-muted shadow-[0_16px_40px_-28px_rgba(80,40,10,0.55)] sm:w-40">
      {playing ? (
        <iframe
          className="absolute inset-0 size-full"
          src={`https://www.youtube-nocookie.com/embed/${VIDEO_ID}?autoplay=1&playsinline=1&rel=0`}
          title={TITLE}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="absolute inset-0 cursor-pointer outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-inset"
          aria-label={`Play the short: ${TITLE}`}
        >
          {/* Plain img, not the image optimizer: nothing should call YouTube before this is near the screen. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://i.ytimg.com/vi/${VIDEO_ID}/hqdefault.jpg`}
            alt=""
            width={480}
            height={360}
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            className="size-full object-cover object-center"
          />
          <span className="absolute inset-0 bg-foreground/10" />
          <span className="absolute top-1/2 left-1/2 grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-card text-primary shadow-[0_8px_20px_-8px_rgba(80,40,10,0.6)]">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="ml-0.5 size-5 fill-current">
              <path d="M8 5.14v13.72a1 1 0 0 0 1.54.84l10.14-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14Z" />
            </svg>
          </span>
        </button>
      )}
    </div>
  );
}
