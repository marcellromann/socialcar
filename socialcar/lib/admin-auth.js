import { createClient } from '@supabase/supabase-js';
import { getAdminClient } from './supabase-admin';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function jsonError(status, message) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

// Resultado: { error: Response } (devolva esse Response) ou { appUser: {...} }.
export async function requireAdmin(request) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  console.log('[admin-auth] ▶ request', request.url);
  console.log('[admin-auth] token presente?', !!token, 'tamanho:', token.length);

  if (!token) {
    console.log('[admin-auth] ✖ sem token → 401');
    return { error: jsonError(401, 'Token de acesso ausente.') };
  }

  // Valida o token com o cliente anon (mesmo endpoint /auth/v1/user).
  const auth = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userErr } = await auth.auth.getUser(token);

  console.log('[admin-auth] getUser →', {
    auth_id: userData?.user?.id || null,
    email: userData?.user?.email || null,
    error: userErr?.message || null,
  });

  if (userErr || !userData?.user) {
    console.log('[admin-auth] ✖ token inválido → 401');
    return { error: jsonError(401, 'Sessão inválida ou expirada.') };
  }

  // Busca o appUser correspondente e checa role.
  const admin = getAdminClient();
  const { data: appUser, error: appErr } = await admin
    .from('users')
    .select('id, email, nome, role, bloqueado')
    .eq('auth_id', userData.user.id)
    .maybeSingle();

  console.log('[admin-auth] lookup users.role →', {
    appUser,
    error: appErr?.message || null,
    errorDetails: appErr?.details || null,
    errorCode: appErr?.code || null,
  });

  if (appErr || !appUser) {
    console.log('[admin-auth] ✖ appUser não encontrado → 403');
    return { error: jsonError(403, 'Usuário não encontrado no app.') };
  }
  if (appUser.role !== 'admin') {
    console.log('[admin-auth] ✖ role !==  admin (role:', appUser.role, ') → 403');
    return { error: jsonError(403, 'Acesso restrito a administradores.') };
  }

  console.log('[admin-auth] ✓ admin autorizado:', appUser.email);
  return { appUser };
}
