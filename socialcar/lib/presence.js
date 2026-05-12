import { supabase } from './supabase';

const ONLINE_WINDOW_MS = 5 * 60 * 1000;

function parseTs(value) {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : null;
}

export function isOnline(lastSeenAt) {
  const t = parseTs(lastSeenAt);
  if (t === null) return false;
  return Date.now() - t < ONLINE_WINDOW_MS;
}

export function presenceLabel(lastSeenAt) {
  const t = parseTs(lastSeenAt);
  if (t === null) return 'Sem atividade';
  const diff = Date.now() - t;
  if (diff < ONLINE_WINDOW_MS) return 'Online agora';
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `Visto há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Visto há ${hours} h`;
  const days = Math.floor(hours / 24);
  return `Visto há ${days} d`;
}

export async function touchLastSeen(userId) {
  if (!userId) return null;
  const nowIso = new Date().toISOString();
  try {
    await supabase.from('users').update({ last_seen_at: nowIso }).eq('id', userId);
  } catch {}
  return nowIso;
}
