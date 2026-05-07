# SocialCar

Marketplace automotivo construído com **Next.js 14 (App Router)**, **Supabase** e **Tailwind CSS**.

Identidade visual: tipografia **Barlow** + **Barlow Condensed**, cor de marca `#AAFF00` sobre fundo `#060801`.

Esta versão entrega:

- Listagem pública de anúncios na home com seções **Mais buscados**, **Anúncios recentes**, **Como funciona** e CTA.
- Página de detalhes do carro com galeria de fotos e bloco de contato.
- Formulário de cadastro de anúncio com upload de até 8 fotos para o Supabase Storage.

> Sem autenticação nesta versão — qualquer visitante pode criar anúncios. Endureça as policies do Supabase quando adicionar Auth.

---

## 1. Stack

- Next.js 14 (App Router) + React 18
- Tailwind CSS 3 + paleta de marca customizada
- Supabase (Postgres + Storage) via `@supabase/supabase-js`
- Google Fonts via `next/font` (Barlow / Barlow Condensed)

## 2. Pré-requisitos

- Node.js **18.18+** (recomendado 20+)
- Conta e projeto criados no [Supabase](https://supabase.com)

## 3. Instalar dependências

```bash
npm install
```

## 4. Configurar o Supabase

### 4.1 Criar tabela e policies

No painel do Supabase, abra **SQL Editor → New query**, cole o conteúdo de [`supabase/schema.sql`](./supabase/schema.sql) e clique em **Run**. O script é idempotente — pode ser rodado várias vezes.

Cria:

- Tabela `public.listings` (com coluna `views` para a seção de mais buscados).
- Índices úteis (`created_at`, `brand+model`, `views`).
- RLS habilitado com leitura e inserção liberadas para o role `anon`.
- Policies de Storage para o bucket `listing-photos`.

### 4.2 Criar o bucket de fotos

Em **Storage → New bucket**:

- **Name:** `listing-photos`
- **Public bucket:** **ativado**

### 4.3 Pegar as credenciais

Em **Project Settings → API**, copie:

- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Crie um `.env.local` na raiz a partir do `.env.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
```

## 5. Scripts

| Comando         | Descrição                           |
| --------------- | ----------------------------------- |
| `npm run dev`   | Servidor de desenvolvimento (3000)  |
| `npm run build` | Build de produção                   |
| `npm start`     | Servir o build gerado               |
| `npm run lint`  | Lint do Next.js                     |

Acesse [http://localhost:3000](http://localhost:3000) após `npm run dev`.

- `/` — home com hero, categorias e listagens
- `/anuncios/novo` — formulário de cadastro
- `/anuncios/[id]` — detalhes do anúncio
- `/entrar`, `/cadastro` — placeholders de auth

## 6. Deploy na Vercel

1. Suba o repositório no GitHub/GitLab/Bitbucket.
2. Em [vercel.com/new](https://vercel.com/new), importe o repositório. A Vercel detecta o framework Next.js automaticamente — não é necessário configurar build/output.
3. Em **Environment Variables**, adicione (para os ambientes Production, Preview e Development):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Clique em **Deploy**.

> Garanta que o schema (`supabase/schema.sql`) já foi aplicado e que o bucket `listing-photos` existe **antes** do primeiro deploy, senão a home aparecerá vazia.

### Domínio do Supabase em imagens

`next.config.mjs` já libera `*.supabase.co/storage/v1/object/public/**` em `images.remotePatterns`. Se trocar de projeto Supabase, não é preciso ajustar.

## 7. Estrutura

```
app/
  layout.js                  Layout global, fontes, Navbar + Footer
  globals.css                Tailwind + tokens de design
  page.js                    Home: hero, categorias, listagens, CTA
  anuncios/
    novo/page.js             Formulário de cadastro
    [id]/page.js             Detalhes do anúncio
    [id]/Gallery.js          Galeria client-side
  entrar/page.js             Placeholder
  cadastro/page.js           Placeholder
components/
  Navbar.js, Footer.js, Logo.js
  Hero.js, Categories.js
  CarCard.js                 Card com badge "Destaque"
  HowItWorks.js              4 passos
  CtaBanner.js               Banner verde-limão
  ListingForm.js             Formulário com upload Storage
lib/
  supabase.js                Cliente Supabase + nome do bucket
  format.js                  Helpers (moeda, km, data)
supabase/
  schema.sql                 Schema + RLS + Storage policies
tailwind.config.js           Paleta brand + fontes
```

## 8. Design tokens

| Token         | Valor       | Uso                              |
| ------------- | ----------- | -------------------------------- |
| `brand.500`   | `#AAFF00`   | Cor de marca / CTAs              |
| `page`        | `#060801`   | Fundo geral                      |
| `card`        | `#0E1108`   | Cards e blocos de conteúdo       |
| `elevated`    | `#161A0E`   | Estados hover                    |
| `outline`     | `#1F2415`   | Bordas sutis                     |
| `font-sans`   | Barlow      | Texto corrido                    |
| `font-display`| Barlow Cond.| Headlines / labels uppercase     |

Sobre fundos `bg-brand-500`, sempre use texto preto (`text-black`) para contraste.

## 9. Próximos passos sugeridos

- Adicionar Supabase Auth e vincular `listings` ao `auth.uid()`.
- Trocar policies anônimas por policies por usuário (`using (auth.uid() = user_id)`).
- Filtros e busca por marca, faixa de preço, ano e cidade.
- Edição/exclusão de anúncio pelo dono.
- Substituir `<img>` por `next/image`.
