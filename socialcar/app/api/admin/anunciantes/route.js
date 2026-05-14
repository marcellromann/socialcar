import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getAdminClient } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

export async function GET(request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  const supabase = getAdminClient();

  const { data: users, error } = await supabase
    .from('users')
    .select('id, nome, email, tipo, role, bloqueado, created_at')
    .in('tipo', ['vendedor', 'ambos'])
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = (users || []).map((u) => u.id);
  const countByUser = new Map();
  const viewsByUser = new Map();
  const listingToUser = new Map();

  if (ids.length) {
    const { data: listings } = await supabase
      .from('listings')
      .select('id, user_id')
      .in('user_id', ids);
    for (const l of listings || []) {
      countByUser.set(l.user_id, (countByUser.get(l.user_id) || 0) + 1);
      listingToUser.set(l.id, l.user_id);
    }

    // Acessos por anunciante: somatório de page_views em /anuncio/{id} dos seus anúncios.
    // page pode vir como "/anuncio/<id>" ou "/anuncio/<id>?foo=bar".
    // Exclui acessos cujo user_id seja de admin (mantém NULL = anônimo).
    const { data: adminsRows } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin');
    const adminIds = (adminsRows || []).map((r) => r.id);

    let viewsQuery = supabase
      .from('page_views')
      .select('page')
      .like('page', '/anuncio/%')
      .limit(100000);
    if (adminIds.length) {
      viewsQuery = viewsQuery.or(`user_id.is.null,user_id.not.in.(${adminIds.join(',')})`);
    }
    const { data: views } = await viewsQuery;

    for (const v of views || []) {
      const m = typeof v.page === 'string' ? v.page.match(/^\/anuncio\/([^/?#]+)/) : null;
      if (!m) continue;
      const userId = listingToUser.get(m[1]);
      if (!userId) continue;
      viewsByUser.set(userId, (viewsByUser.get(userId) || 0) + 1);
    }
  }

  const items = (users || []).map((u) => ({
    id: u.id,
    nome: u.nome,
    email: u.email,
    role: u.role,
    bloqueado: u.bloqueado,
    qtd_anuncios: countByUser.get(u.id) || 0,
    qtd_acessos: viewsByUser.get(u.id) || 0,
    created_at: u.created_at,
  }));

  return NextResponse.json({ items });
}
