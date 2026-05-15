'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'swipe_tutorial_seen';

export default function SwipeTutorial() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (localStorage.getItem(STORAGE_KEY) === 'true') return;
    } catch {
      return;
    }
    const t = setTimeout(() => setVisible(true), 1000);
    return () => clearTimeout(t);
  }, []);

  function dismiss() {
    try { localStorage.setItem(STORAGE_KEY, 'true'); } catch {}
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tutorial de swipe"
      className="fixed inset-0 z-[100] grid place-items-center"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)' }}
      onClick={dismiss}
    >
      <div
        className="font-display flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-16">
          <div className="flex flex-col items-center" style={{ color: 'rgba(255,255,255,0.6)' }}>
            <span
              className="swipe-hint-left leading-none"
              style={{ fontSize: '48px', opacity: 0.5 }}
              aria-hidden="true"
            >
              👈
            </span>
            <span className="mt-3 text-base font-semibold uppercase tracking-[0.2em]">Próximo</span>
          </div>
          <div className="flex flex-col items-center" style={{ color: '#AAFF00' }}>
            <span
              className="swipe-hint-right leading-none"
              style={{ fontSize: '48px', opacity: 0.5 }}
              aria-hidden="true"
            >
              👉
            </span>
            <span className="mt-3 text-base font-semibold uppercase tracking-[0.2em]">Interessante</span>
          </div>
        </div>

        <button
          type="button"
          onClick={dismiss}
          className="font-display mt-16 text-sm font-bold uppercase tracking-[0.3em] text-white/80 transition active:scale-95 hover:text-white"
        >
          Entendi
        </button>
      </div>
    </div>
  );
}
