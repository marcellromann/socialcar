import { getAdminClient } from './supabase-admin';

export async function logAdminAction({ admin, acao, entidade, entidade_id, detalhes }) {
  if (!admin?.id) return;
  const supabase = getAdminClient();
  await supabase.from('admin_logs').insert({
    admin_id: admin.id,
    admin_email: admin.email || null,
    acao,
    entidade: entidade || null,
    entidade_id: entidade_id || null,
    detalhes: detalhes || {},
  });
}
