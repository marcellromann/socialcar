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

// UUID inválido usado como sentinela para forçar um resultado vazio quando o
// estado selecionado não tem nenhum usuário associado.
const EMPTY_UUID = '00000000-0000-0000-0000-000000000000';

// Aplica o filtro de estado a uma query de page_views.
//   - Sem estado: mantém o comportamento atual (exclui admins, conta anônimos).
//   - Com estado: restringe a user_id ∈ stateUserIds (acessos anônimos
//     ficam de fora pois não temos como atribuir um estado a eles).
function applyViewsFilter(query, adminIds, stateUserIds) {
  if (stateUserIds === null) return excludeAdmins(query, adminIds);
  if (stateUserIds.length === 0) return query.eq('id', EMPTY_UUID);
  return query.in('user_id', stateUserIds);
}

export async function GET(request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  const supabase = getAdminClient();
  const { searchParams } = new URL(request.url);
  const estadoRaw = (searchParams.get('estado') || '').trim().toUpperCase();
  const estado = estadoRaw && estadoRaw.length === 2 ? estadoRaw : null;

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // IDs de todos os admins — usados para excluí-los das métricas de acesso.
  const { data: adminsRows } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'admin');
  const adminIds = (adminsRows || []).map((r) => r.id);
  const adminIdSet = new Set(adminIds);

  // Quando há filtro de estado, materializa o conjunto de user_ids daquele
  // estado (já sem admins). null = sem filtro.
  let stateUserIds = null;
  if (estado) {
    const { data: stateUsers } = await supabase
      .from('users')
      .select('id')
      .eq('estado_endereco', estado);
    stateUserIds = (stateUsers || [])
      .map((r) => r.id)
      .filter((id) => !adminIdSet.has(id));
  }

  // Query base de listings com filtro opcional de estado.
  const listingsBase = () => {
    const q = supabase.from('listings').select('*', { count: 'exact', head: true });
    return estado ? q.eq('estado', estado) : q;
  };

  // Query base de users (totalSellers/totalUsers) com filtro opcional.
  const usersBase = () => {
    const q = supabase.from('users').select('*', { count: 'exact', head: true });
    return estado ? q.eq('estado_endereco', estado) : q;
  };

  const [
    { count: viewsToday },
    { count: viewsMonth },
    { count: viewsTotal },
    { count: activeListings },
    { count: totalSellers },
    { count: totalUsers },
    uaResp,
  ] = await Promise.all([
    applyViewsFilter(
      supabase.from('page_views').select('*', { count: 'exact', head: true }).gte('created_at', startOfDay),
      adminIds,
      stateUserIds,
    ),
    applyViewsFilter(
      supabase.from('page_views').select('*', { count: 'exact', head: true }).gte('created_at', startOfMonth),
      adminIds,
      stateUserIds,
    ),
    applyViewsFilter(
      supabase.from('page_views').select('*', { count: 'exact', head: true }),
      adminIds,
      stateUserIds,
    ),
    listingsBase().eq('status', 'ativo'),
    usersBase().in('tipo', ['vendedor', 'ambos']),
    usersBase(),
    // Para % mobile vs desktop, pega só os últimos 5k user-agents — aplica o
    // mesmo filtro (admins ou estado) que os contadores acima.
    applyViewsFilter(
      supabase.from('page_views').select('user_agent').order('created_at', { ascending: false }).limit(5000),
      adminIds,
      stateUserIds,
    ),
  ]);

  // Visitantes únicos:
  //   - Sem filtro: RPC admin_unique_visitors (count distinct user_id, ignora null/admins).
  //   - Com filtro: faz inline buscando user_ids do conjunto do estado e
  //     conta distintos no JS — economiza criar uma segunda RPC.
  let uniqToday = 0, uniqMonth = 0, uniqTotal = 0;
  if (stateUserIds === null) {
    const [uniqTodayResp, uniqMonthResp, uniqTotalResp] = await Promise.all([
      supabase.rpc('admin_unique_visitors', { p_start: startOfDay }),
      supabase.rpc('admin_unique_visitors', { p_start: startOfMonth }),
      supabase.rpc('admin_unique_visitors', { p_start: null }),
    ]);
    uniqToday = Number(uniqTodayResp?.data) || 0;
    uniqMonth = Number(uniqMonthResp?.data) || 0;
    uniqTotal = Number(uniqTotalResp?.data) || 0;
  } else if (stateUserIds.length > 0) {
    const baseUniq = () =>
      supabase.from('page_views').select('user_id').in('user_id', stateUserIds).limit(20000);
    const [todayRows, monthRows, totalRows] = await Promise.all([
      baseUniq().gte('created_at', startOfDay),
      baseUniq().gte('created_at', startOfMonth),
      baseUniq(),
    ]);
    const distinct = (rows) => new Set((rows?.data || []).map((r) => r.user_id)).size;
    uniqToday = distinct(todayRows);
    uniqMonth = distinct(monthRows);
    uniqTotal = distinct(totalRows);
  }

  let mobile = 0, desktop = 0;
  for (const row of uaResp.data || []) {
    if (isMobileUA(row.user_agent)) mobile++;
    else desktop++;
  }
  const totalUA = mobile + desktop;
  const mobilePct = totalUA ? Math.round((mobile / totalUA) * 100) : 0;
  const desktopPct = totalUA ? 100 - mobilePct : 0;

  return NextResponse.json({
    estado,
    views: {
      hoje: viewsToday || 0,
      mes: viewsMonth || 0,
      total: viewsTotal || 0,
      mobile_pct: mobilePct,
      desktop_pct: desktopPct,
    },
    unicos: {
      hoje: uniqToday,
      mes: uniqMonth,
      total: uniqTotal,
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
