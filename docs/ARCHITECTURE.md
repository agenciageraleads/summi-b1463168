# 🏗️ Arquitetura do Summi

**Última atualização:** 2026-03-02
**Versão:** 1.2.3

---

## 📐 Diagrama Geral

```
┌──────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
│  Browser → Vite dev server (localhost:5173)                      │
│  • Dashboard, Settings, Billing, Admin                           │
│  • React Router v7, React Query, Tailwind CSS                    │
└──────────────┬───────────────────────────────────────────────────┘
               │
        (Fetch / HTTP)
               │
┌──────────────▼───────────────────────────────────────────────────┐
│               Backend (Supabase + Edge Functions)                │
│  • PostgreSQL Database (51+ migrations)                          │
│  • Auth (JWT + RLS)                                              │
│  • 36 Deno Edge Functions                                        │
│  • Storage (avatars, docs, etc)                                  │
└──────────────┬───────────────────────────────────────────────────┘
               │
    ┌──────────┴──────────────┐
    │                         │
    ▼                         ▼
┌──────────────────┐   ┌──────────────────────────────────┐
│ Webhook Handler  │   │  Admin / User Functions          │
│ (Evolution API)  │   │ (handle-signup, billing, etc)    │
│                  │   │                                  │
│ POST /functions  │   │ • check-subscription             │
│ /v1/handle-      │   │ • create-checkout (Stripe)       │
│ signup           │   │ • delete-user-account            │
│ /webhooks/...    │   │ • verify-admin-access            │
└────────┬─────────┘   └──────────────────────────────────┘
         │
         └────────────────┬──────────────────────────────┐
                          │                              │
                          ▼                              ▼
         ┌────────────────────────────┐   ┌──────────────────────────┐
         │   Python Worker (FastAPI)  │   │  Scheduled Jobs          │
         │   VPS Deployment            │   │  (Hourly "Summi")       │
         │                             │   │                         │
         │ • Ingest webhooks           │   │ • Aggregate messages    │
         │ • OpenAI analysis           │   │ • Generate summary      │
         │ • Audio transcription       │   │ • Send to WhatsApp      │
         │ • Redis dedupe              │   │                         │
         │                             │   │ Cron job (1h interval)  │
         └────────────┬────────────────┘   └──────────────────────────┘
                      │
              ┌───────┴───────┐
              │               │
              ▼               ▼
         ┌─────────┐     ┌───────────────┐
         │ OpenAI  │     │ Evolution API │
         │ (extern)│     │ WhatsApp      │
         │ • GPT4o │     │               │
         │ • Whisper     │ • Msg ingress │
         │ • TTS    │     │ • Send        │
         └─────────┘     └───────────────┘
```

---

## 🎯 Camadas de Aplicação

### 1️⃣ **Frontend Layer** (React + TypeScript)

**Localização:** `/src/`

**Stack:**
- React 18.3 + React Router v7
- TypeScript 5.5
- Vite (bundler)
- TailwindCSS + shadcn-ui
- React Query (data fetching)
- Supabase JS Client

**Estrutura:**
```
src/
├── pages/              # 15 páginas (rotas)
│   ├── Index.tsx      # Dashboard principal
│   ├── LoginPage.tsx
│   ├── SubscriptionPage.tsx
│   ├── SettingsPage.tsx
│   ├── AdminDashboardPage.tsx
│   └── ...
├── components/        # Componentes reutilizáveis (18+)
│   ├── Navbar.tsx
│   ├── MessageCard.tsx
│   ├── InstanceManager.tsx
│   ├── ChartCard.tsx
│   └── ...
├── hooks/            # Custom React hooks
│   ├── useAuth.ts
│   ├── useInstances.ts
│   └── ...
├── services/         # API clients
│   └── whatsappConnection.ts
├── contexts/         # React Context
│   └── AuthContext.tsx
├── lib/              # Utilities
│   ├── subscriptionPlans.ts
│   ├── securityUtils.ts
│   └── utils.ts
└── integrations/     # Supabase setup
    └── supabase/client.ts
```

**Key Services:**
- **Supabase Auth:** Login, registro, reset de senha
- **Evolution API:** Conectar instâncias WhatsApp
- **Stripe:** Upgrade de plano
- **Real-time Updates:** Socket.io ou Supabase Realtime

---

### 2️⃣ **Backend Layer** (Supabase)

**Localização:** `/supabase/`

**Stack:**
- PostgreSQL 15+ (Supabase managed)
- Deno Edge Functions (serverless)
- RLS (Row Level Security)
- Supabase Auth (JWT)

#### A. Database

**Arquivo:** `/supabase/migrations/`

**51+ Migrations covering:**

| Tabela | Descrição | Última Atualização |
|--------|-----------|-------------------|
| `public.users` | Usuários Summi | 2026-01 |
| `public.instances` | Contas WhatsApp | 2026-02 |
| `public.chats` | Mensagens | 2026-02 (dedupe) |
| `public.profiles` | Configurações user | 2026-02 |
| `public.subscriptions` | Planos de preço | 2026-02 |
| `public.subscribers` | User-Instance relation | 2026-03 (NEW) |
| `public.metrics` | Análise/frequência | 2026-02 |
| `public.announcements` | Sistema de notificações | 2026-01 |
| `public.referrals` | Sistema de referência | 2026-02 |

**Último Migration (NEW):**
```sql
-- 20260302121500_dedupe_subscribers_by_user_id.sql
-- Deduplication: garante que cada user_id + instance_id é único
ALTER TABLE subscribers
ADD CONSTRAINT unique_user_instance UNIQUE (usuario_id, instancia_id);
```

**RLS Policies:**
- Usuário só vê seus próprios dados
- Admin vê todos os dados
- Service role key pode modificar tudo

#### B. Edge Functions

**Arquivo:** `/supabase/functions/`

**36 Functions (Deno + TypeScript):**

| Categoria | Functions | Descrição |
|-----------|-----------|-----------|
| **Auth** | `handle-signup`, `delete-user-account` | Onboarding, cleanup |
| **Subscription** | `check-subscription`, `create-checkout`, `customer-portal` | Billing com Stripe |
| **Stripe** | `stripe-webhook` | Webhook de pagamento |
| **Evolution** | `evolution-validate-connection`, `evolution-get-qr`, `evolution-auth`, `evolution-list-instances`, `evolution-subscribe-events` | Gerenciar instâncias WhatsApp |
| **Messages** | `evolution-api-handler`, `analyze-messages` | Ingestão e análise |
| **Admin** | `admin-verify`, `admin-cleanup-admins` | Gerenciamento admin |
| **Other** | `check-connection-status`, `create-announcement` | Helpers |

**Exemplo: `check-subscription`**
```typescript
// Verifica se usuário tem subscription ativa
// POST /functions/v1/check-subscription
// Retorna: { plan: "Professional", status: "active", ... }
```

---

### 3️⃣ **Worker Layer** (Python FastAPI on VPS)

**Localização:** `/vps/summi_worker/`

**Stack:**
- Python 3.11+
- FastAPI + Uvicorn
- OpenAI API (GPT-4o + Whisper)
- Evolution API (WhatsApp)
- Redis (dedupe + queue)
- PostgreSQL (Supabase)

**Estrutura:**
```
vps/summi_worker/
├── app.py                    # Servidor principal (46 KB, 4.2k linhas)
│   ├── FastAPI app
│   ├── Webhook handlers
│   ├── Análise de mensagens
│   ├── Scheduled jobs
│   └── Health checks
├── config.py                # Variáveis de ambiente
├── openai_client.py         # GPT-4o + Whisper integration
├── evolution_client.py      # Evolution API client
├── prompt_builders.py       # AI prompt engineering
├── summi_jobs.py            # Scheduled tasks (hourly job)
├── analysis.py              # Lógica de priorização
├── redis_dedupe.py          # Webhook deduplication
├── redis_queue.py           # Fila de processamento
├── supabase_rest.py         # REST API client
├── evolution_webhook.py     # Processamento de webhooks
├── test_app.py              # Unit tests (NEW)
├── test_*.py                # Testes específicos
├── Dockerfile               # Container definition
├── requirements.txt         # Dependencies
└── .env.example             # Template
```

**Key Endpoints:**

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/webhooks/evolution` | Ingestão de mensagens |
| `POST` | `/webhooks/evolution-analyze` | Alias legado de ingestão (sem análise por mensagem) |
| `POST` | `/api/analyze-messages` | Run-now do Summi da Hora (user autenticado) |
| `POST` | `/internal/run-hourly` | Trigger job manual |
| `GET` | `/health` | Health check |

**Fluxo de Processamento:**

```
1. Evolution Webhook → POST /webhooks/evolution
   ├─ Extract message data
   ├─ Redis dedupe check (WEBHOOK_DEDUPE_TTL_SECONDS)
   └─ Save to public.chats

2. (Optional) Analyze
   ├─ Check audio transcription
   ├─ OpenAI GPT-4o analysis
   ├─ Priorização (importante/urgente/normal)
   └─ Update public.chats.prioridade

3. Summi Scheduled Job (hourly)
   ├─ Aggregate messages (últimas 24h)
   ├─ Filter by prioridade
   ├─ OpenAI summarization
   └─ Send via Evolution API (WhatsApp)
```

---

## 🔄 Fluxos Principais

### Fluxo 1: Receber Mensagem WhatsApp

```
WhatsApp User
    ↓ envia mensagem
Evolution API (cloud)
    ↓ webhook HTTP POST
Summi Worker (Python) POST /webhooks/evolution
    ├─ Parse JSON
    ├─ Redis dedup check
    └─ INSERT public.chats
        ├─ id (UUID)
        ├─ instance_id (qual WhatsApp)
        ├─ usuario_id (qual usuário Summi)
        ├─ conversa (texto/media)
        ├─ criado_em (timestamp)
        └─ analisado_em (NULL, para depois)
    ↓
(Opcional) Triggar análise
    ├─ OpenAI: transcrever (se áudio)
    ├─ OpenAI: analisar prioridade
    └─ UPDATE public.chats.prioridade
    ↓
Frontend Dashboard (React)
    ├─ Supabase Realtime update
    └─ Exibe nova mensagem com badge
```

### Fluxo 2: Summi da Hora (Job Schedulado)

```
Clock: Hourly (ex: 14:00)
    ↓
Summi Worker summi_jobs.py (ou external cron)
    ├─ SELECT public.chats WHERE
    │   - criado_em > 1 hora atrás
    │   - usuario_id = <current user>
    │   - prioridade IN (IMPORTANTE, URGENTE)
    ├─ OpenAI GPT-4o:
    │   - Resume messages
    │   - Keep structure
    │   └─ Output: "📋 Resumo da última hora: ..."
    ├─ (Opcional) TTS (text-to-speech)
    │   └─ Output: audio.wav
    └─ Evolution API: envia via WhatsApp
        ├─ instance_id (qual conta)
        └─ message (texto ou áudio)
        ↓
WhatsApp User recebe resumo
```

### Fluxo 3: Autenticação & Permissões

```
Frontend Login Form
    ↓
POST /auth/v1/token (Supabase)
    ├─ Valida email/password
    └─ Retorna JWT + refresh token
    ↓
Frontend salva JWT no localStorage
    ↓
Requisições subsequentes
    ├─ Header: Authorization: Bearer <JWT>
    ├─ Supabase verifica JWT (public.auth.users)
    └─ RLS policies permitem/negam acesso
        ├─ `public.chats` → user vê só suas mensagens
        ├─ `public.subscriptions` → user vê só seu plano
        └─ `public.admin_role` → admin vê tudo (se role = 'admin')
```

---

## 🗄️ Modelo de Dados (Simplificado)

### Users & Auth
```
users (Supabase Auth)
├─ id (UUID, PK)
├─ email
├─ password_hash (Supabase encrypted)
├─ created_at

profiles
├─ id (UUID, FK → users.id)
├─ username
├─ avatar_url
├─ business_hours_start (default: 8)
├─ business_hours_end (default: 18)
├─ apenas_horario_comercial (bool)
├─ created_at
```

### WhatsApp & Messaging
```
instances
├─ id (UUID, PK)
├─ usuario_id (FK → users.id)
├─ instance_name (nome da instância no Evolution)
├─ phone_number
├─ is_connected (bool)
├─ last_webhook (timestamp)
├─ created_at

subscribers (NEW in 20260302)
├─ id (UUID, PK)
├─ usuario_id (FK → users.id)
├─ instancia_id (FK → instances.id)
├─ created_at
├─ UNIQUE(usuario_id, instancia_id) → dedupe by user_id

chats
├─ id (UUID, PK)
├─ instance_id (FK → instances.id)
├─ usuario_id (FK → users.id, denormalized)
├─ conversa (text, áudio transcrito, etc)
├─ prioridade (IMPORTANTE, URGENTE, NORMAL, NULL)
├─ contexto (texto, resultado OpenAI)
├─ analisado_em (timestamp, NULL se não analisado)
├─ audio_seconds (float, se áudio)
├─ audio_transcription_used_fallback (bool)
├─ created_at
```

### Billing
```
subscriptions
├─ id (UUID, PK)
├─ stripe_id (Stripe subscription ID)
├─ usuario_id (FK → users.id)
├─ plan (Starter, Professional, Enterprise)
├─ status (active, cancelled, past_due)
├─ current_period_start
├─ current_period_end
├─ created_at

referrals
├─ id (UUID, PK)
├─ referred_by (FK → users.id)
├─ referred_to (FK → users.id)
├─ status (active, inactive)
├─ reward_amount
├─ created_at
```

---

## 🔐 Segurança

### Auth Flow
1. **Frontend:** Email + Password → POST /auth/v1/token
2. **Supabase:** Valida credenciais → Retorna JWT
3. **Frontend:** Salva JWT em localStorage
4. **Requisições:** Header `Authorization: Bearer <JWT>`
5. **Backend:** Valida JWT → RLS policies aplicam-se

### Row Level Security (RLS)
```sql
-- Exemplo: usuário só vê suas próprias mensagens
CREATE POLICY "users_can_only_see_their_own_chats" ON chats
FOR SELECT USING (usuario_id = auth.uid());

-- Admin vê tudo
CREATE POLICY "admin_can_see_all_chats" ON chats
FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');
```

### API Key Separation
- **VITE_SUPABASE_ANON_KEY:** Frontend (limited scope)
- **SUPABASE_SERVICE_ROLE_KEY:** Backend/Worker (full access)
- **OPENAI_API_KEY:** Worker only (não exponha no frontend)

---

## 🚀 Deployment Architecture

### Desenvolvimento
```
Localhost
├─ Frontend: npm run dev (http://localhost:5173)
├─ Supabase: supabase start (http://localhost:54321)
├─ Worker: (optional) uvicorn (http://localhost:8080)
```

### Produção
```
Supabase Cloud
├─ PostgreSQL Database
├─ Auth (JWT)
└─ Edge Functions (Deno runtime)

Docker + Portainer (VPS)
├─ Frontend Container (Nginx)
│   └─ Traefik host: ${SUMMI_FRONTEND_HOST}
├─ Worker API Container (Python FastAPI)
│   └─ Traefik host: ${SUMMI_WORKER_HOST}
└─ Scheduler Container (Python, cron jobs)

External Services
├─ OpenAI API (GPT-4o, Whisper, TTS)
├─ Evolution API (WhatsApp)
└─ Stripe (Billing)
```

**Deploy YAML:** `/vps/portainer/stack.summi-complete.yml`

---

## 📊 Data Flow (High-Level)

```
┌─────────────┐
│ WhatsApp    │
│ (user sends)│
└──────┬──────┘
       │ webhook (Evolution)
       ▼
┌──────────────────────┐
│ Summi Worker         │
│ (Python FastAPI)     │
│ • Parse webhook      │
│ • Dedupe (Redis)     │
│ • Save msg (PostgreSQL)
└──────────┬───────────┘
           │
           ├─→ OpenAI (transcribe if audio)
           ├─→ OpenAI (analyze + priority)
           └─→ Update DB
           │
           ▼
┌──────────────────────┐
│ PostgreSQL           │
│ public.chats         │
│ public.instances     │
│ public.profiles      │
│ public.subscriptions │
└──────────┬───────────┘
           │
           ├─→ Supabase Realtime
           ├─→ Frontend React (Dashboard)
           │
           ▼
┌──────────────────────┐
│ Frontend (React)     │
│ • Display msgs       │
│ • Show priority      │
│ • Charts & stats     │
└──────────────────────┘

HOURLY JOB:
1. Aggregate messages (last 24h)
2. Filter by priority
3. OpenAI summarization
4. Send via WhatsApp (Evolution API)
```

---

## 🔌 Integrações Externas

| Serviço | Uso | Método |
|---------|-----|--------|
| **Supabase** | DB + Auth | REST API + WebSockets |
| **OpenAI** | GPT-4o + Whisper + TTS | HTTP API |
| **Evolution API** | WhatsApp | Webhook + REST API |
| **Stripe** | Pagamentos | Webhook + REST API |

---

## 📈 Performance & Scalability

### Otimizações
- ✅ **Redis Dedupe:** Previne processamento duplicado (86400s TTL)
- ✅ **Indexed Queries:** `usuario_id`, `instance_id`, `created_at` indexados
- ✅ **Connection Pooling:** Supabase auto-pooling
- ✅ **Edge Functions:** Serverless, auto-scaling
- ✅ **Frontend CDN:** Nginx static assets

### Bottlenecks Potenciais
- OpenAI API latency (mitigado com async + queue)
- Evolution API webhook rate limits (mitigado com dedupe + retry)
- PostgreSQL connection limits (mitigado com pooling)

---

## 🎓 Próximos Passos

1. ✅ Entendeu arquitetura? Leia [`VPS_WORKER.md`](./VPS_WORKER.md)
2. 📖 Quer entender banco? Leia [`DATABASE.md`](./DATABASE.md)
3. 🎨 Quer trabalhar no frontend? Leia [`FRONTEND.md`](./FRONTEND.md)
4. 🔌 Quer entender integrações? Leia [`INTEGRATIONS.md`](./INTEGRATIONS.md)

---

**Dúvidas?** Cheque [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md) ou abra uma issue.
