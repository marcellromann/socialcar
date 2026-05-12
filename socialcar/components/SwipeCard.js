'use client';

import { useEffect, useRef, useState } from 'react';
import { formatKm, formatPrice } from '@/lib/format';
import { isOnline } from '@/lib/presence';

const THRESHOLD = 110;

export default function SwipeCard({ listing, onSwipe, depth = 0 }) {
  const ref = useRef(null);
  const start = useRef(null);
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [flying, setFlying] = useState(null); // 'left' | 'right' | null

  useEffect(() => {
    if (!flying) return;
    const t = setTimeout(() => onSwipe?.(flying, listing), 280);
    return () => clearTimeout(t);
  }, [flying, listing, onSwipe]);

  function onPointerDown(e) {
    if (depth !== 0 || flying) return;
    const p = pointer(e);
    start.current = { ...p, t: Date.now() };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e) {
    if (!start.current || flying) return;
    const p = pointer(e);
    setDrag({ x: p.x - start.current.x, y: p.y - start.current.y });
  }

  function onPointerUp() {
    if (!start.current || flying) return;
    const { x } = drag;
    const dur = Date.now() - start.current.t;
    const isQuickFlick = dur < 300 && Math.abs(x) > 60;
    if (x > THRESHOLD || (isQuickFlick && x > 0)) {
      setFlying('right');
    } else if (x < -THRESHOLD || (isQuickFlick && x < 0)) {
      setFlying('left');
    } else {
      setDrag({ x: 0, y: 0 });
    }
    start.current = null;
  }

  const rotation = drag.x / 18;
  const opacityRight = Math.min(Math.max(drag.x / 120, 0), 1);
  const opacityLeft = Math.min(Math.max(-drag.x / 120, 0), 1);

  const baseTransform =
    depth === 0
      ? `translate3d(${drag.x}px, ${drag.y * 0.4}px, 0) rotate(${rotation}deg)`
      : `translate3d(0, ${depth * 8}px, 0) scale(${1 - depth * 0.04})`;

  return (
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className={`absolute inset-0 select-none touch-none ${
        flying === 'right' ? 'flyout-right' : flying === 'left' ? 'flyout-left' : ''
      }`}
      style={{
        transform: baseTransform,
        transition: start.current ? 'none' : 'transform 220ms ease',
        zIndex: 10 - depth,
      }}
    >
      <div className="relative h-full w-full overflow-hidden rounded-3xl border border-outline bg-card">
        {listing.foto_principal_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.foto_principal_url}
            alt={`${listing.marca} ${listing.modelo}`}
            className="h-full w-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-elevated text-slate-500">
            sem foto
          </div>
        )}

        {/* Status do vendedor */}
        {listing.seller_last_seen_at && (() => {
          const sellerOnline = isOnline(listing.seller_last_seen_at);
          return (
            <div className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1 backdrop-blur">
              <span className={`h-2 w-2 rounded-full ${sellerOnline ? 'bg-emerald-400' : 'bg-slate-400'}`} />
              <span className="text-[10px] font-bold uppercase tracking-wider text-white">
                {sellerOnline ? 'Online' : 'Ausente'}
              </span>
            </div>
          );
        })()}

        {/* gradient + info */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-5 pt-24">
          <div className="flex items-center gap-2 mb-2">
            {listing.verificado && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m5 12 5 5L20 7" />
                </svg>
                Verificado
              </span>
            )}
            <span className="chip">{listing.ano}</span>
            <span className="chip">{formatKm(listing.km)}</span>
          </div>
          <h2 className="display-tight text-3xl font-extrabold text-white">
            {listing.marca} {listing.modelo}
          </h2>
          <div className="mt-1 flex items-baseline justify-between gap-2">
            <span className="font-display text-3xl font-black text-brand-500">
              {formatPrice(listing.preco)}
            </span>
            {listing.cidade && (
              <span className="text-sm text-slate-300">
                {listing.cidade}{listing.estado ? `/${listing.estado}` : ''}
              </span>
            )}
          </div>
        </div>

        {/* labels live durante o drag */}
        <div
          className="absolute left-5 top-5 rotate-[-12deg] rounded-md border-4 border-brand-500 px-3 py-1 font-display text-2xl font-black uppercase text-brand-500"
          style={{ opacity: opacityRight }}
        >
          interesse
        </div>
        <div
          className="absolute right-5 top-5 rotate-[12deg] rounded-md border-4 border-red-400 px-3 py-1 font-display text-2xl font-black uppercase text-red-400"
          style={{ opacity: opacityLeft }}
        >
          passar
        </div>
      </div>
    </div>
  );
}

function pointer(e) {
  if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  return { x: e.clientX, y: e.clientY };
}
