'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import RequireAuth from '@/components/RequireAuth';
import TopBar from '@/components/TopBar';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { buyerAlias, computeMatch } from '@/lib/anon';
import { formatPrice, summarizeBuyer } from '@/lib/format';
import { isOnline, presenceLabel } from '@/lib/presence';

export default function ChatPage() {
  return (
    <RequireAuth>
      <Inner />
    </RequireAuth>
  );
}

function Inner() {
  const { id } = useParams();
  const { appUser } = useAuth();
  const me = appUser?.id || null;

  const [chat, setChat] = useState(null);
  const [listing, setListing] = useState(null);
  const [buyerProfile, setBuyerProfile] = useState(null);
  const [otherPresence, setOtherPresence] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data: c } = await supabase.from('chats').select('*').eq('id', id).maybeSingle();
      if (cancel) return;
      setChat(c);

      if (c?.listing_id) {
        const { data: l } = await supabase.from('listings_public')
          .select('id, marca, modelo, ano, preco, foto_principal_url, combustivel, estado')
          .eq('id', c.listing_id).maybeSingle();
        setListing(l);
      }

      if (c?.buyer_id) {
        const { data: bp } = await supabase
          .from('buyer_profiles').select('*').eq('user_id', c.buyer_id).maybeSingle();
        setBuyerProfile(bp);
      }

      if (c && me) {
        const otherId = me === c.buyer_id ? c.seller_id : c.buyer_id;
        if (otherId) {
          const { data: peer } = await supabase
            .from('users')
            .select('last_seen_at')
            .eq('id', otherId)
            .maybeSingle();
          if (!cancel) setOtherPresence(peer?.last_seen_at || null);
        }
      }

      const { data: msgs } = await supabase
        .from('messages').select('*')
        .eq('chat_id', id).order('created_at', { ascending: true });
      if (!cancel) setMessages(msgs || []);

      // Marca como lido para o lado certo
      if (c && me) {
        const updates = me === c.buyer_id
          ? { last_read_buyer_at: new Date().toISOString() }
          : me === c.seller_id
          ? { last_read_seller_at: new Date().toISOString() }
          : null;
        if (updates) await supabase.from('chats').update(updates).eq('id', id);
      }
    })();
    return () => { cancel = true; };
  }, [id, me]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send(e) {
    e.preventDefault();
    if (!text.trim() || !me) return;
    setSending(true);
    const txt = text.trim();
    setText('');
    const { data } = await supabase
      .from('messages')
      .insert({ chat_id: id, sender_id: me, texto: txt })
      .select('*').single();
    if (data) setMessages((m) => [...m, data]);
    setSending(false);
  }

  const isSeller = chat && me && me === chat.seller_id;
  const match = listing && buyerProfile ? computeMatch(listing, buyerProfile) : null;

  return (
    <>
      <TopBar
        title={isSeller ? buyerAlias(chat?.buyer_id) : (listing ? `${listing.marca} ${listing.modelo}` : 'Conversa')}
        back
      />
      <div className="page-pad flex flex-col gap-3">
        {otherPresence !== null && (
          <div className="flex items-center justify-end gap-2 text-[11px]">
            <span
              className={`h-2 w-2 rounded-full ${
                isOnline(otherPresence) ? 'bg-emerald-400' : 'bg-slate-500'
              }`}
            />
            <span className={isOnline(otherPresence) ? 'text-emerald-300' : 'text-slate-400'}>
              {presenceLabel(otherPresence)}
            </span>
          </div>
        )}
        {listing && (
          <Link
            href={`/anuncio/${listing.id}`}
            className="flex items-center gap-3 rounded-2xl border border-outline bg-card p-3 active:bg-elevated"
          >
            <div className="h-14 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-elevated">
              {listing.foto_principal_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={listing.foto_principal_url} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">{listing.marca} {listing.modelo}</p>
              <p className="text-xs text-slate-400">{listing.ano}</p>
              <p className="font-display text-sm font-black text-brand-500">{formatPrice(listing.preco)}</p>
            </div>
          </Link>
        )}

        {isSeller && buyerProfile && (
          <div className="rounded-xl border border-brand-500/30 bg-brand-500/10 p-3 text-xs text-brand-100">
            <div className="flex items-center justify-between">
              <strong className="font-display uppercase tracking-wide text-brand-500">
                {buyerAlias(chat.buyer_id)}
              </strong>
              {match != null && (
                <span className="rounded-full bg-brand-500/20 px-2 py-0.5 text-[10px] font-bold text-brand-500">
                  {match}% match
                </span>
              )}
            </div>
            <p className="mt-1 text-slate-200">
              {summarizeBuyer(buyerProfile) || 'comprador interessado'}
            </p>
            <p className="mt-1 text-[10px] text-slate-400">Dados pessoais permanecem privados.</p>
          </div>
        )}

        <ul className="flex flex-col gap-3 pb-2">
          {messages.length === 0 && (
            <p className="text-center text-xs text-slate-500">
              Nenhuma mensagem ainda. Mande a primeira!
            </p>
          )}
          {messages.map((m) => {
            const mine = m.sender_id === me;
            const role = chat && m.sender_id === chat.seller_id ? 'Vendedor' : 'Comprador';
            return (
              <li key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                <span className={`mb-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  mine ? 'text-brand-500' : 'text-slate-500'
                }`}>
                  {role}
                </span>
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                  mine ? 'bg-brand-500 text-black' : 'bg-elevated text-white'
                }`}>
                  {m.texto}
                </div>
                <span className="mt-0.5 text-[10px] text-slate-500">
                  {new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </li>
            );
          })}
          <div ref={endRef} />
        </ul>

        <form onSubmit={send} className="sticky bottom-[calc(var(--bottom-nav-h)+8px)] flex gap-2">
          <input
            className="input"
            placeholder="Mensagem"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button type="submit" className="btn-primary px-4" disabled={sending || !text.trim()}>
            Enviar
          </button>
        </form>
      </div>
    </>
  );
}
