import { NextResponse } from 'next/server';

// O tracking de page_views foi movido para o client (components/PageViewTracker.js)
// porque o middleware roda no Edge e não enxerga a sessão Supabase (localStorage),
// portanto não conseguia distinguir o admin para excluí-lo das métricas.
// Mantido aqui como passthrough — matcher vazio garante que não roda em nenhuma rota.
export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
