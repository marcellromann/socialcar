import { createClient } from '@supabase/supabase-js';

// SERVER-ONLY. Nunca importe esse arquivo em código que roda no navegador.
// A service-role key contorna RLS e tem permissões totais no banco.

console.log('[supabase-admin] SERVICE_ROLE presente:', !!process.env.SUPABASE_SERVICE_ROLE_KEY, '| URL presente:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

let _client = null;

export function getAdminClient() {
  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY ausente. Preencha .env.local com a chave service_role do Supabase.'
    );
  }
  if (!_client) {
    _client = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _client;
}
