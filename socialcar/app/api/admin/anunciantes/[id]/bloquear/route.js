import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getAdminClient } from '@/lib/supabase-admin';
import { logAdminAction } from '@/lib/admin-log';

export const runtime = 'nodejs';

export async function PATCH(request, { params }) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  const { id } = params;
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  // Default = bloquear. Permite { bloqueado: false } para desbloquear.
  const novoStatus = body?.bloqueado === false ? false : true;

  if (id === auth.appUser.id && novoStatus === true) {
    return NextResponse.json({ error: 'Você não pode bloquear a si mesmo.' }, { status: 400 });
  }

  const supabase = getAdminClient();

  const { data: target } = await supabase
    .from('users')
    .select('id, email, nome, bloqueado')
    .eq('id', id)
    .maybeSingle();

  if (!target) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });

  const { error: updErr } = await supabase
    .from('users')
    .update({ bloqueado: novoStatus })
    .eq('id', id);

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  await logAdminAction({
    admin: auth.appUser,
    acao: novoStatus ? 'block_user' : 'unblock_user',
    entidade: 'user',
    entidade_id: id,
    detalhes: { email: target.email, nome: target.nome },
  });

  return NextResponse.json({ ok: true, bloqueado: novoStatus });
}
