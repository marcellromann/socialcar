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
        <div className="flex flex-col items-center">
          <span
            className="swipe-hint-finger leading-none"
            style={{ fontSize: '52px' }}
            aria-hidden="true"
          >
            👆
          </span>
          <span
            className="mt-4 text-xs uppercase tracking-[0.3em]"
            style={{ color: 'rgba(255,255,255,0.3)' }}
          >
            deslize para navegar
          </span>
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
