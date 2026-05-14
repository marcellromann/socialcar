import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAdminClient } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const page = String(body?.page || '').slice(0, 500);
    const userAgent = String(body?.user_agent || '').slice(0, 500);

    if (!page) return NextResponse.json({ ok: false }, { status: 400 });

    // Resolução opcional do usuário via Bearer token. Falhas silenciosas
    // → registra como anônimo (user_id = null).
    let userId = null;
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (token) {
      const auth = createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: userData } = await auth.auth.getUser(token);
      const authId = userData?.user?.id;
      if (authId) {
        try {
          const admin = getAdminClient();
          const { data: appUser } = await admin
            .from('users')
            .select('id, role')
            .eq('auth_id', authId)
            .maybeSingle();
          // Defesa em profundidade: nunca grava view de admin, mesmo que o
          // cliente burle a checagem do PageViewTracker.
          if (appUser?.role === 'admin') {
            return NextResponse.json({ ok: true, skipped: 'admin' });
          }
          userId = appUser?.id || null;
        } catch {
          /* sem service-role: registra anônimo */
        }
      }
    }

    // INSERT via service-role (page_views.user_id é nullable e tem FK).
    const admin = getAdminClient();
    await admin.from('page_views').insert({
      page,
      user_agent: userAgent || null,
      user_id: userId,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
