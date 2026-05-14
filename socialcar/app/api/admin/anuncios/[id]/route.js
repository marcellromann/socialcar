import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getAdminClient } from '@/lib/supabase-admin';
import { logAdminAction } from '@/lib/admin-log';

export const runtime = 'nodejs';

export async function DELETE(request, { params }) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  const { id } = params;
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });

  const supabase = getAdminClient();

  const { data: listing } = await supabase
    .from('listings')
    .select('id, marca, modelo, ano, user_id')
    .eq('id', id)
    .maybeSingle();

  if (!listing) return NextResponse.json({ error: 'Anúncio não encontrado' }, { status: 404 });

  const { error: delErr } = await supabase.from('listings').delete().eq('id', id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  await logAdminAction({
    admin: auth.appUser,
    acao: 'delete_listing',
    entidade: 'listing',
    entidade_id: id,
    detalhes: {
      titulo: `${listing.marca} ${listing.modelo} ${listing.ano}`,
      anunciante_id: listing.user_id,
    },
  });

  return NextResponse.json({ ok: true });
}
