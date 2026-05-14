import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getAdminClient } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

export async function GET(request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  const supabase = getAdminClient();

  const { data: listings, error } = await supabase
    .from('listings')
    .select('id, user_id, marca, modelo, ano, preco, status, created_at')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const sellerIds = [...new Set((listings || []).map((l) => l.user_id).filter(Boolean))];
  let sellersById = new Map();
  if (sellerIds.length) {
    const { data: sellers } = await supabase
      .from('users')
      .select('id, nome, email')
      .in('id', sellerIds);
    sellersById = new Map((sellers || []).map((s) => [s.id, s]));
  }

  const items = (listings || []).map((l) => {
    const seller = sellersById.get(l.user_id);
    return {
      id: l.id,
      titulo: `${l.marca} ${l.modelo} ${l.ano}`,
      anunciante_nome: seller?.nome || seller?.email || '—',
      anunciante_email: seller?.email || null,
      preco: l.preco,
      status: l.status,
      created_at: l.created_at,
    };
  });

  return NextResponse.json({ items });
}
