import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAdminClient } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const APP_USER_COLS =
  'id, email, nome, tipo, role, bloqueado, auth_id, telefone, avatar_url, created_at, cep, rua, numero, complemento, bairro, cidade, estado_endereco, status, last_seen_at';

// Recebe o JWT do usuário no header Authorization e devolve a linha em
// public.users vinculada a ele. Usa service-role para contornar RLS no lookup,
// e auto-vincula linhas pré-existentes (mesmo email mas auth_id NULL/diferente)
// preenchendo o auth_id correto, evitando duplicação.
export async function GET(request) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  if (!token) {
    return NextResponse.json({ error: 'no-token' }, { status: 401 });
  }

  const auth = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userErr } = await auth.auth.getUser(token);

  if (userErr || !userData?.user) {
    console.log('[api/me] token inválido:', userErr?.message);
    return NextResponse.json({ error: 'invalid-token' }, { status: 401 });
  }

  const authUser = userData.user;
  const admin = getAdminClient();

  // 1) Tentativa primária: lookup por auth_id (caminho feliz).
  const { data: byAuthId, error: byAuthIdErr } = await admin
    .from('users')
    .select(APP_USER_COLS)
    .eq('auth_id', authUser.id)
    .maybeSingle();

  if (byAuthIdErr) {
    console.error('[api/me] erro no lookup por auth_id:', byAuthIdErr);
    return NextResponse.json({ error: 'lookup-failed', detail: byAuthIdErr.message }, { status: 500 });
  }

  if (byAuthId) {
    return NextResponse.json({ appUser: byAuthId, source: 'auth_id' });
  }

  // 2) Auto-link: existe linha com o mesmo email mas auth_id divergente?
  //    Acontece quando a linha foi criada antes do Supabase Auth, ou quando o
  //    usuário recriou a conta. Em vez de inserir um duplicado (que apagaria
  //    role='admin'), atualizamos o auth_id da linha existente.
  if (authUser.email) {
    const { data: byEmail, error: byEmailErr } = await admin
      .from('users')
      .select(APP_USER_COLS)
      .eq('email', authUser.email)
      .maybeSingle();

    if (byEmailErr) {
      console.error('[api/me] erro no lookup por email:', byEmailErr);
      return NextResponse.json({ error: 'lookup-failed', detail: byEmailErr.message }, { status: 500 });
    }

    if (byEmail) {
      console.log('[api/me] auto-link: vinculando auth_id', authUser.id, 'à linha existente', byEmail.id);
      const { data: linked, error: linkErr } = await admin
        .from('users')
        .update({ auth_id: authUser.id })
        .eq('id', byEmail.id)
        .select(APP_USER_COLS)
        .single();

      if (linkErr) {
        console.error('[api/me] falha ao vincular auth_id:', linkErr);
        return NextResponse.json({ error: 'link-failed', detail: linkErr.message }, { status: 500 });
      }
      return NextResponse.json({ appUser: linked, source: 'auto-link' });
    }
  }

  // 3) Primeiro acesso de verdade: insere a linha.
  const meta = authUser.user_metadata || {};
  const insertPayload = {
    auth_id: authUser.id,
    email: authUser.email,
    nome: meta.nome || meta.full_name || meta.name || null,
    tipo: meta.tipo || 'comprador',
  };

  const { data: inserted, error: insertErr } = await admin
    .from('users')
    .insert(insertPayload)
    .select(APP_USER_COLS)
    .single();

  if (insertErr) {
    console.error('[api/me] falha ao inserir public.users:', insertErr);
    return NextResponse.json({ error: 'insert-failed', detail: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ appUser: inserted, source: 'insert' });
}
