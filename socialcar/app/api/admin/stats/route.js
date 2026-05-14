import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getAdminClient } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

function isMobileUA(ua) {
  if (!ua) return false;
  return /Mobi|Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile/i.test(ua);
}

// Adiciona o filtro "user_id is null OR user_id not in (adminIds)" a uma
// query do page_views. Mantém NULL (visitas anônimas) e exclui qualquer
// linha cujo user_id corresponda a um admin.
function excludeAdmins(query, adminIds) {
  if (!adminIds.length) return query;
  return query.or(`user_id.is.null,user_id.not.in.(${adminIds.join(',')})`);
}

export async function GET(request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  const supabase = getAdminClient();

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // IDs de todos os admins — usados para excluí-los das métricas de acesso.
  const { data: adminsRows } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'admin');
  const adminIds = (adminsRows || []).map((r) => r.id);

  const [
    { count: viewsToday },
    { count: viewsMonth },
    { count: viewsTotal },
    { count: activeListings },
    { count: totalSellers },
    { count: totalUsers },
    uaResp,
    uniqTodayResp,
    uniqMonthResp,
    uniqTotalResp,
  ] = await Promise.all([
    excludeAdmins(
      supabase.from('page_views').select('*', { count: 'exact', head: true }).gte('created_at', startOfDay),
      adminIds,
    ),
    excludeAdmins(
      supabase.from('page_views').select('*', { count: 'exact', head: true }).gte('created_at', startOfMonth),
      adminIds,
    ),
    excludeAdmins(
      supabase.from('page_views').select('*', { count: 'exact', head: true }),
      adminIds,
    ),
    supabase.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'ativo'),
    supabase.from('users').select('*', { count: 'exact', head: true }).in('tipo', ['vendedor', 'ambos']),
    supabase.from('users').select('*', { count: 'exact', head: true }),
    // Para % mobile vs desktop, pega só os últimos 5k user-agents — também sem admins.
    excludeAdmins(
      supabase.from('page_views').select('user_agent').order('created_at', { ascending: false }).limit(5000),
      adminIds,
    ),
    // Visitantes únicos (count distinct user_id) — RPC porque o SDK não expõe
    // distinct count nativo. A função já ignora user_id null e admins.
    supabase.rpc('admin_unique_visitors', { p_start: startOfDay }),
    supabase.rpc('admin_unique_visitors', { p_start: startOfMonth }),
    supabase.rpc('admin_unique_visitors', { p_start: null }),
  ]);

  let mobile = 0, desktop = 0;
  for (const row of uaResp.data || []) {
    if (isMobileUA(row.user_agent)) mobile++;
    else desktop++;
  }
  const totalUA = mobile + desktop;
  const mobilePct = totalUA ? Math.round((mobile / totalUA) * 100) : 0;
  const desktopPct = totalUA ? 100 - mobilePct : 0;

  return NextResponse.json({
    views: {
      hoje: viewsToday || 0,
      mes: viewsMonth || 0,
      total: viewsTotal || 0,
      mobile_pct: mobilePct,
      desktop_pct: desktopPct,
    },
    unicos: {
      hoje: Number(uniqTodayResp?.data) || 0,
      mes: Number(uniqMonthResp?.data) || 0,
      total: Number(uniqTotalResp?.data) || 0,
    },
    anuncios: {
      ativos: activeListings || 0,
    },
    anunciantes: {
      total: totalSellers || 0,
    },
    usuarios: {
      total: totalUsers || 0,
    },
  });
}
