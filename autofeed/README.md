# SocialCar

Marketplace mobile-first de carros usados — feed estilo Tinder/TikTok com swipe,
perfil inteligente do comprador e área do vendedor com validação de placa.

Stack: **Next.js 14 (App Router) · Tailwind · Supabase**.

---

## Identidade visual

- Fundo `#060801`, cor de marca `#AAFF00` (verde limão), textos brancos.
- Fontes: **Barlow Condensed** (títulos) e **Barlow** (corpo).
- Layout 100% mobile-first, container central de até **480px**.

---

## Estrutura de rotas

| Rota                | O que faz                                                      |
|---------------------|----------------------------------------------------------------|
| `/`                 | Feed de cards com swipe (passar / chat / interesse / salvar). |
| `/entrar`           | Login com e-mail/senha + Google OAuth (Supabase Auth).         |
| `/cadastro`         | Criação de conta (nome, e-mail, senha, tipo).                  |
| `/onboarding`       | Questionário do comprador (após cadastro). 🔒                  |
| `/buscar`           | Listagem em grid pesquisável.                                  |
| `/anunciar`         | Formulário do vendedor com validação de placa + FIPE. 🔒       |
| `/anuncio/[id]`     | Detalhes completos: galeria, preço, simulação, relatório.      |
| `/meus-anuncios`    | Painel do vendedor com status (rascunho / análise / ativo / pausado). 🔒 |
| `/chats`            | Lista de conversas. 🔒                                         |
| `/chats/[id]`       | Conversa individual. 🔒                                        |
| `/chats/novo`       | Cria/abre chat a partir de um anúncio. 🔒                      |
| `/perfil`           | Dados e preferências do usuário. 🔒                            |

🔒 = exige autenticação (redireciona para `/entrar`).

---

## Setup

### 1. Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha:

```
NEXT_PUBLIC_SUPABASE_URL=https://<seu-projeto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

### 2. Banco de dados

No Supabase Dashboard → **SQL Editor → New Query**, cole o conteúdo de
`supabase/schema.sql` e clique em **Run**. O script é idempotente e cria:

- `users`, `buyer_profiles`
- `listings` (com `placa_hash` único), `listing_photos`
- `interests`, `chats`, `messages`
- View pública `listings_public` (nunca expõe a placa)
- RPC `create_listing_safe` com checagem de placa duplicada e
  rate limit (10 anúncios por usuário)
- Policies de RLS

### 3. Auth providers

No Supabase Dashboard: **Authentication → Providers**:

- **Email**: habilite e (opcionalmente) desligue "Confirm email" para login
  imediato durante o desenvolvimento.
- **Google**: habilite, configure o OAuth Client e adicione `http://localhost:3000`
  e o domínio de produção em "Redirect URLs".

### 4. Storage

Crie um bucket público chamado **`listing-photos`**:
**Storage → New bucket → nome `listing-photos` → marque "Public bucket"**.
As policies do schema cuidam de leitura/inserção.

### 5. Rodar

```bash
npm install
npm run dev
```

App em `http://localhost:3000`.

---

## Onboarding do comprador

No primeiro acesso, o usuário responde 7 perguntas:

1. Você já tem um carro?
2. Qual é o seu carro atual? (marca, modelo, ano)
3. O que está buscando? (Hatch, Sedã, SUV, Caminhonete, Elétrico, Moto)
4. Faixa de preço (cinco faixas, de até R$50k a acima de R$200k).
5. Combustível preferido (Flex, Diesel, Elétrico, Híbrido, Tanto faz).
6. Estado (UF).
7. Pretende financiar? (Sim, à vista, ainda não sei).

As respostas são salvas em `buyer_profiles` e exibidas ao vendedor como
**resumo agregado** (`Comprador tem carro atual, busca SUV, faixa R$100k-150k…`)
sem revelar dados pessoais.

---

## Segurança da placa

- A placa **nunca** é gravada em texto puro: salvamos apenas o
  SHA-256 (`placa_hash`) com prefixo de domínio (ver `lib/plate.js`).
- A view `listings_public` exclui `placa_hash` por padrão, então nenhuma
  consulta de leitura via SDK expõe a placa.
- Validação de formato Mercosul (`ABC1D23`) e antiga (`ABC1234`) tanto no
  frontend (`lib/plate.js`) quanto no banco (constraint `unique` em
  `placa_hash`).
- A RPC `create_listing_safe` faz a checagem anti-duplicata e o rate limit
  no servidor — não dá para burlar pelo cliente.

---

## FIPE / Placa

`lib/fipe.js` consulta a [BrasilAPI](https://brasilapi.com.br):

- `GET /vehicles/v1/{placa}` — tenta buscar marca/modelo/ano pela placa.
- `GET /fipe/marcas/v1/carros` — lista de marcas (fallback quando a placa
  não retorna dados).
- `GET /fipe/tabela/v1` — tabelas FIPE de referência.
- `GET /fipe/preco/v1/{codigoFipe}` — preço por código FIPE.

Quando a consulta por placa falha, o formulário passa para o modo manual
(campos editáveis) e o anúncio é gravado como **não verificado** (sem o
selo "Verificado" no feed).

## Limites

- Fotos por anúncio: mínimo **3**, máximo **15** (`MAX_PHOTOS` em
  `components/ListingForm.js`).
- Anúncios por usuário: máximo **10** (rate limit aplicado pela RPC
  `create_listing_safe` no banco).

---

## Pastas

```
app/
  page.js                  # feed com swipe
  onboarding/page.js
  anunciar/page.js
  anuncio/[id]/page.js
  meus-anuncios/page.js
  chats/page.js
  chats/[id]/page.js
  chats/novo/page.js
  perfil/page.js
  buscar/page.js
components/
  BottomNav.js  TopBar.js
  Feed.js  SwipeCard.js  Gallery.js
  ListingForm.js  OnboardingGate.js
lib/
  format.js  plate.js  fipe.js  session.js  supabase.js
supabase/
  schema.sql
```

---

## Próximos passos sugeridos

- Plugar **Supabase Auth** (magic link / OAuth) e remover o "guest id" local.
- Realtime subscriptions em `messages` para chat ao vivo.
- Match score do feed usando `buyer_profiles` × `listings`.
- Integração FIPE/placas real e captação automática de fotos por VIN.
