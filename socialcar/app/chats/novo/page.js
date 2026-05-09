'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import RequireAuth from '@/components/RequireAuth';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default function NovoChatPage() {
  return (
    <RequireAuth>
      <Suspense fallback={<Loading />}>
        <Runner />
      </Suspense>
    </RequireAuth>
  );
}

function Loading() {
  return (
    <div className="grid min-h-[60dvh] place-items-center text-sm text-slate-400">
      Iniciando conversa…
    </div>
  );
}

function Runner() {
  const router = useRouter();
  const params = useSearchParams();
  const { appUser } = useAuth();

  useEffect(() => {
    (async () => {
      if (!appUser?.id) return;
      const listingId = params.get('listing');
      const buyerParam = params.get('buyer');
      if (!listingId) { router.replace('/chats'); return; }

      const me = appUser.id;

      const { data: l } = await supabase
        .from('listings').select('user_id').eq('id', listingId).maybeSingle();
      if (!l) { router.replace('/chats'); return; }

      let buyerId, sellerId;
      if (l.user_id === me) {
        // Vendedor inicia: comprador vem na query.
        if (!buyerParam || buyerParam === me) { router.replace('/meus-anuncios'); return; }
        buyerId = buyerParam;
        sellerId = me;
      } else {
        buyerId = me;
        sellerId = l.user_id;
      }

      const { data: existingChat } = await supabase
        .from('chats').select('id')
        .eq('buyer_id', buyerId).eq('seller_id', sellerId).eq('listing_id', listingId)
        .maybeSingle();

      let chatId = existingChat?.id;
      if (!chatId) {
        const { data: c } = await supabase
          .from('chats')
          .insert({ buyer_id: buyerId, seller_id: sellerId, listing_id: listingId })
          .select('id').single();
        chatId = c?.id;
      }
      if (chatId) router.replace(`/chats/${chatId}`);
      else router.replace('/chats');
    })();
  }, [params, router, appUser?.id]);

  return <Loading />;
}
