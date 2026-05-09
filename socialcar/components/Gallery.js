'use client';

import { useState } from 'react';

export default function Gallery({ photos = [], main }) {
  const all = main && !photos.includes(main) ? [main, ...photos] : photos;
  const [idx, setIdx] = useState(0);
  const [touchX, setTouchX] = useState(null);

  if (all.length === 0) {
    return (
      <div className="aspect-[4/3] w-full grid place-items-center rounded-2xl border border-outline bg-elevated text-slate-500">
        sem fotos
      </div>
    );
  }

  function onTouchStart(e) { setTouchX(e.touches[0].clientX); }
  function onTouchEnd(e) {
    if (touchX == null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (dx > 50)  setIdx((i) => Math.max(0, i - 1));
    if (dx < -50) setIdx((i) => Math.min(all.length - 1, i + 1));
    setTouchX(null);
  }

  return (
    <div className="space-y-2">
      <div
        className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-outline bg-card"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={all[idx]} alt={`Foto ${idx + 1}`} className="h-full w-full object-cover" />
        <div className="absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white">
          {idx + 1}/{all.length}
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {all.map((url, i) => (
          <button
            key={url + i}
            type="button"
            onClick={() => setIdx(i)}
            className={`h-16 w-20 flex-shrink-0 overflow-hidden rounded-lg border ${
              i === idx ? 'border-brand-500' : 'border-outline'
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}
