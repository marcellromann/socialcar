'use client';

import { useCallback, useEffect, useState } from 'react';

export default function Gallery({ photos = [], main }) {
  const all = main && !photos.includes(main) ? [main, ...photos] : photos;
  const [idx, setIdx] = useState(0);
  const [touchX, setTouchX] = useState(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxTouchX, setLightboxTouchX] = useState(null);

  const closeLightbox = useCallback(() => {
    setLightboxVisible(false);
    setTimeout(() => setLightboxOpen(false), 200);
  }, []);

  const prevPhoto = useCallback(() => {
    setLightboxIdx((i) => (i - 1 + all.length) % all.length);
  }, [all.length]);

  const nextPhoto = useCallback(() => {
    setLightboxIdx((i) => (i + 1) % all.length);
  }, [all.length]);

  useEffect(() => {
    if (!lightboxOpen) return;
    function onKey(e) {
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowLeft') prevPhoto();
      else if (e.key === 'ArrowRight') nextPhoto();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxOpen, closeLightbox, prevPhoto, nextPhoto]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => setLightboxVisible(true), 10);
    return () => {
      document.body.style.overflow = original;
      clearTimeout(t);
    };
  }, [lightboxOpen]);

  function openLightbox(i) {
    setLightboxIdx(i);
    setLightboxOpen(true);
  }

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

  function onLightboxTouchStart(e) { setLightboxTouchX(e.touches[0].clientX); }
  function onLightboxTouchEnd(e) {
    if (lightboxTouchX == null) return;
    const dx = e.changedTouches[0].clientX - lightboxTouchX;
    if (dx > 50) prevPhoto();
    if (dx < -50) nextPhoto();
    setLightboxTouchX(null);
  }

  return (
    <div className="space-y-2">
      <div
        className="group relative aspect-[4/3] w-full cursor-zoom-in overflow-hidden rounded-2xl border border-outline bg-card"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onClick={() => openLightbox(idx)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={all[idx]} alt={`Foto ${idx + 1}`} className="h-full w-full object-cover" />
        <div className="absolute inset-0 grid place-items-center bg-black/0 transition-colors group-hover:bg-black/20">
          <span className="opacity-0 transition-opacity group-hover:opacity-100">
            <ZoomIcon />
          </span>
        </div>
        <div className="absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white">
          {idx + 1}/{all.length}
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {all.map((url, i) => (
          <button
            key={url + i}
            type="button"
            onClick={() => { setIdx(i); openLightbox(i); }}
            className={`h-16 w-20 flex-shrink-0 cursor-zoom-in overflow-hidden rounded-lg border ${
              i === idx ? 'border-brand-500' : 'border-outline'
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>

      {lightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={closeLightbox}
          onTouchStart={onLightboxTouchStart}
          onTouchEnd={onLightboxTouchEnd}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.95)',
            opacity: lightboxVisible ? 1 : 0,
            transition: 'opacity 200ms ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); closeLightbox(); }}
            aria-label="Fechar"
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              width: 44,
              height: 44,
              borderRadius: 9999,
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.2)',
              fontSize: 22,
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center',
              zIndex: 2,
            }}
          >
            ×
          </button>

          {all.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
                aria-label="Foto anterior"
                style={{
                  position: 'absolute',
                  left: 16,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 48,
                  height: 48,
                  borderRadius: 9999,
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.2)',
                  fontSize: 24,
                  cursor: 'pointer',
                  display: 'grid',
                  placeItems: 'center',
                  zIndex: 2,
                }}
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
                aria-label="Próxima foto"
                style={{
                  position: 'absolute',
                  right: 16,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 48,
                  height: 48,
                  borderRadius: 9999,
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.2)',
                  fontSize: 24,
                  cursor: 'pointer',
                  display: 'grid',
                  placeItems: 'center',
                  zIndex: 2,
                }}
              >
                ›
              </button>
            </>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={all[lightboxIdx]}
            alt={`Foto ${lightboxIdx + 1}`}
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '95vw',
              maxHeight: '90vh',
              width: '100%',
              height: '100%',
              objectFit: 'contain',
            }}
          />

          <div
            style={{
              position: 'absolute',
              bottom: 24,
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '6px 14px',
              borderRadius: 9999,
              background: 'rgba(0,0,0,0.6)',
              color: 'white',
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: '0.02em',
              border: '1px solid rgba(255,255,255,0.15)',
            }}
          >
            {lightboxIdx + 1} de {all.length}
          </div>
        </div>
      )}
    </div>
  );
}

function ZoomIcon() {
  return (
    <svg
      width="44"
      height="44"
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        background: 'rgba(0,0,0,0.5)',
        borderRadius: '9999px',
        padding: 10,
      }}
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="11" y1="8" x2="11" y2="14" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  );
}
