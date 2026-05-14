import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAdminClient } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// ENDPOINT DE DIAGNÓSTICO TEMPORÁRIO — remover depois que o admin funcionar.
// Acesse com Authorization: Bearer <access_token> (o AdminDashboard manda).
export async function GET(request) {
  const out = {
    step: 'start',
    envOk: {
      SUPABASE_URL: !!supabaseUrl,
      ANON_KEY: !!anonKey,
      SERVICE_ROLE: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
  };

  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  out.token_present = !!token;
  out.token_len = token.length;

  if (!token) {
    out.step = 'no-token';
    return NextResponse.json(out, { status: 200 });
  }

  try {
    const auth = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userErr } = await auth.auth.getUser(token);
    out.getUser = {
      auth_id: userData?.user?.id || null,
      email: userData?.user?.email || null,
      error: userErr?.message || null,
    };

    if (!userData?.user) {
      out.step = 'invalid-token';
      return NextResponse.json(out, { status: 200 });
    }

    const admin = getAdminClient();

    // 1) Tenta SELECT com role + bloqueado (igual ao código real).
    const r1 = await admin
      .from('users')
      .select('id, email, nome, role, bloqueado, auth_id')
      .eq('auth_id', userData.user.id)
      .maybeSingle();
    out.users_select_with_role = {
      data: r1.data,
      error: r1.error ? { message: r1.error.message, code: r1.error.code, details: r1.error.details } : null,
    };

    // 2) SELECT minimalista (sem role) — pra ver se a linha existe mesmo.
    const r2 = await admin
      .from('users')
      .select('id, email, auth_id')
      .eq('auth_id', userData.user.id);
    out.users_select_basic = {
      rows: r2.data,
      count: r2.data?.length || 0,
      error: r2.error ? { message: r2.error.message } : null,
    };

    // 3) SELECT só do role usando id (caso schema cache esteja estranho).
    const r3 = await admin
      .from('users')
      .select('role')
      .eq('auth_id', userData.user.id);
    out.users_select_role_only = {
      rows: r3.data,
      error: r3.error ? { message: r3.error.message } : null,
    };

    out.step = 'done';
    return NextResponse.json(out, { status: 200 });
  } catch (e) {
    out.step = 'exception';
    out.exception = {
      name: e?.name || null,
      message: e?.message || String(e),
      code: e?.code || null,
      stack: e?.stack || null,
    };
    // Também imprime no terminal do `npm run dev` pra facilitar o diagnóstico.
    console.error('[api/admin/whoami] exception:', e);
    return NextResponse.json(out, { status: 500 });
  }
}
