'use client';

import { useState } from 'react';

export default function Gallery({ photos, title }) {
  const [active, setActive] = useState(0);

  if (!photos || photos.length === 0) {
    return (
      <div className="flex aspect-[16/10] w-full items-center justify-center rounded-xl border border-outline bg-card text-slate-500">
        Sem fotos
      </div>
    );
  }

  return (
    <div>
      <div className="aspect-[16/10] w-full overflow-hidden rounded-xl border border-outline bg-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photos[active]}
          alt={title}
          className="h-full w-full object-cover"
        />
      </div>
      {photos.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {photos.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => setActive(i)}
              className={`h-16 w-24 flex-shrink-0 overflow-hidden rounded-lg border-2 transition ${
                i === active
                  ? 'border-brand-500'
                  : 'border-outline opacity-70 hover:opacity-100'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
