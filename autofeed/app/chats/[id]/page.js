'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import RequireAuth from '@/components/RequireAuth';
import TopBar from '@/components/TopBar';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { summarizeBuyer } from '@/lib/format';

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
          .select('id, marca, modelo, foto_principal_url')
          .eq('id', c.listing_id).maybeSingle();
        setListing(l);
      }

      if (c?.buyer_id) {
        const { data: bp } = await supabase
          .from('buyer_profiles').select('*').eq('user_id', c.buyer_id).maybeSingle();
        setBuyerProfile(bp);
      }

      const { data: msgs } = await supabase
        .from('messages').select('*')
        .eq('chat_id', id).order('created_at', { ascending: true });
      if (!cancel) setMessages(msgs || []);
    })();
    return () => { cancel = true; };
  }, [id]);

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

  return (
    <>
      <TopBar
        title={listing ? `${listing.marca} ${listing.modelo}` : 'Conversa'}
        back
      />
      <div className="page-pad flex flex-col gap-3">
        {isSeller && buyerProfile && (
          <div className="rounded-xl border border-brand-500/30 bg-brand-500/10 p-3 text-xs text-brand-100">
            <strong className="font-display uppercase tracking-wide text-brand-500">Lead</strong>
            <p className="mt-1 text-slate-200">
              {summarizeBuyer(buyerProfile) || 'comprador interessado'}
            </p>
            <p className="mt-1 text-[10px] text-slate-400">Dados pessoais permanecem privados.</p>
          </div>
        )}

        <ul className="flex flex-col gap-2 pb-2">
          {messages.map((m) => {
            const mine = m.sender_id === me;
            return (
              <li key={m.id} className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                mine ? 'self-end bg-brand-500 text-black' : 'self-start bg-elevated text-white'
              }`}>
                {m.texto}
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
