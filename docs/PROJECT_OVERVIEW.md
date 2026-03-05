# 🎯 Summi - Visão Geral do Projeto

**Versão Atual:** 1.2.3
**Atualizado:** 2026-03-02

---

## O que é Summi?

**Summi** é uma plataforma SaaS que integra **WhatsApp** com **IA** para análise inteligente e resumo de mensagens. Vendedores, gerentes e empresas usam Summi para:

- ✅ **Analisar** prioridade de mensagens (importante, urgente, etc)
- ✅ **Receber resumos** horários ("Summi da Hora")
- ✅ **Transcrever áudio** automaticamente
- ✅ **Contexto inteligente** de conversas
- ✅ **Múltiplas instâncias** WhatsApp por usuário

---

## 🎯 Fluxo Principal

```
WhatsApp (Evolution API)
    ↓
Summi Worker (Python FastAPI) → Recebe mensagens via webhook
    ↓
OpenAI GPT-4o → Análise e priorização
    ↓
Banco de Dados (Supabase PostgreSQL)
    ↓
Frontend (React) ← Usuário vê resultado
    ↓
Summi Job (Horário) → Envia resumo de volta via WhatsApp
```

---

## 📊 Arquitetura de Alto Nível

### 3 Camadas Principais

```
┌─────────────────────────────────────────────────────────┐
│               FRONTEND (React + TypeScript)              │
│  - Dashboard, Settings, Billing, Admin Panel             │
│  - Deployed: Nginx Docker Container                      │
└─────────────────────────────────────────────────────────┘
                          ↓↑
┌─────────────────────────────────────────────────────────┐
│          BACKEND (Supabase + Edge Functions)             │
│  - Auth, User Management, Billing (Stripe)              │
│  - 36 Edge Functions (Deno TypeScript)                  │
│  - PostgreSQL Database (51+ migrations)                 │
└─────────────────────────────────────────────────────────┘
                          ↓↑
┌─────────────────────────────────────────────────────────┐
│         WORKER (Python FastAPI on VPS)                   │
│  - Recebe webhooks WhatsApp                             │
│  - Análise com OpenAI                                   │
│  - Transcrição de áudio                                 │
│  - Scheduled Jobs (Summi da Hora)                       │
│  - Deployed: Docker Compose                             │
└─────────────────────────────────────────────────────────┘
```

---

## 🔑 Recursos Principais

### 1. **Integração WhatsApp (Evolution API)**
- Conecte múltiplas instâncias WhatsApp
- Receba mensagens, áudio, imagens em tempo real
- Envie mensagens e resumos de volta

### 2. **Análise de Mensagens com IA**
- GPT-4o analisa cada mensagem
- Priorização automática (importante, urgente, normal)
- Contexto da conversa (tema, cliente, etc)

### 3. **Transcrição de Áudio**
- Whisper API com fallback
- Suporta português com vocabulário custom
- Heurística de confiança para reprocessamento

### 4. **Resumo Horário ("Summi da Hora")**
- Job automático a cada hora
- Agrupa mensagens importantes
- Envia via WhatsApp como mensagem de texto/áudio

### 5. **Múltiplas Instâncias**
- Um usuário = múltiplas contas WhatsApp
- Configuração por instância
- Filtros e business hours customizados

### 6. **Billing & Subscription**
- Stripe integration
- Planos de preço (Starter, Professional, Enterprise)
- Gerenciamento de assinatura

### 7. **Admin Dashboard**
- Gerenciar usuários, instances, subscriptions
- Acessar logs e métricas
- Cleanup e manutenção

---

## 🏗️ Stack Tecnológico

| Camada | Tecnologia | Versão | Notas |
|--------|-----------|--------|-------|
| **Frontend** | React | 18.3 | + TypeScript 5.5, Vite, Tailwind CSS |
| **Frontend** | UI Components | shadcn-ui | Radix UI primitives |
| **Frontend** | Routing | React Router | v7 |
| **Frontend** | State** | React Query + Context | API caching + Auth |
| **Backend DB** | Supabase | Cloud | PostgreSQL + Auth + Storage |
| **Backend Functions** | Deno | 1.x | Edge Functions no Supabase |
| **Worker** | Python | 3.11+ | FastAPI + Uvicorn |
| **Worker** | AI | OpenAI | GPT-4o (análise), Whisper (transcrição), TTS |
| **Worker** | Mensaging** | Evolution API | WhatsApp integration |
| **Worker** | Queueing** | Redis | Deduplicação, filas de processamento |
| **Containers** | Docker | 20+ | Nginx (frontend), Python (worker) |
| **Orchestration** | Docker Compose | 3.8+ | Local dev + Portainer (prod) |
| **CI/CD** | GitHub Actions | - | Automated workflows |
| **VCS** | Git | - | main branch = production |

---

## 📁 Estrutura de Código

```
summi-b1463168/
├── src/                           # React Frontend
│   ├── pages/                    # 15 páginas (Dashboard, Settings, etc)
│   ├── components/               # 18+ componentes reutilizáveis
│   ├── hooks/                    # Custom React hooks
│   ├── services/                 # API client (Evolution, WhatsApp)
│   ├── contexts/                 # Auth context
│   ├── integrations/             # Supabase client
│   └── lib/                      # Utilities (auth, subscriptions, etc)
│
├── supabase/                      # Supabase Config
│   ├── functions/                # 36 Edge Functions (Deno)
│   ├── migrations/               # 51+ SQL migrations
│   └── migrations_legacy/        # Histórico antigo
│
├── vps/summi_worker/             # Python FastAPI Worker
│   ├── app.py                   # Servidor principal (~4.2k linhas)
│   ├── config.py                # Configuração e env vars
│   ├── openai_client.py         # GPT-4o + Whisper
│   ├── evolution_client.py      # Evolution API client
│   ├── prompt_builders.py       # AI prompt engineering
│   ├── summi_jobs.py            # Scheduled tasks
│   ├── analysis.py              # Lógica de análise
│   ├── redis_*.py               # Redis (dedupe, queue)
│   ├── test_*.py                # Unit tests
│   ├── Dockerfile               # Container
│   └── requirements.txt          # Python dependencies
│
├── vps/portainer/                # Docker Compose Production
│   └── stack.summi-complete.yml # Full stack definition
│
├── frontend/                      # Static Frontend Deployment
│   ├── Dockerfile               # Nginx container
│   └── nginx.conf               # Web server config
│
├── scripts/                       # Automation
│   └── promote_release.py        # Version bumping + release
│
├── docs/                          # Documentação
│   ├── INDEX.md                 # Este arquivo
│   ├── SETUP_LOCAL.md           # Setup para devs
│   ├── ARCHITECTURE.md          # Arquitetura detalhada
│   └── ... (outros docs)
│
├── package.json                   # Node dependencies
├── tsconfig.json                  # TypeScript config
├── vite.config.ts                 # Vite bundler
├── tailwind.config.ts             # Tailwind CSS
├── eslint.config.js               # Linting
└── ...
```

---

## 🚀 Status Atual do Projeto

**Versão:** 1.2.3 (Production)

**Releases Recentes:**
- **1.2.3** - Pin audio dedupe floor
- **1.2.2** - Improve audio transcription quality
- **1.2.1** - Fix private audio quoting

**Estado Atual (2026-03-02):**
- ✅ Webhook de mensagens funcionando
- ✅ Transcrição de áudio com fallback
- ✅ Análise de mensagens com GPT-4o
- ✅ Resumo horário ("Summi da Hora")
- ✅ Billing com Stripe
- ✅ Admin dashboard
- 🔄 **Em desenvolvimento:** Deduplicação por user_id (nova migration)

**Mudanças Não Commitadas (staging):**
```
M scripts/promote_release.py
M vps/summi_worker/app.py
M vps/summi_worker/Dockerfile
A vps/summi_worker/test_app.py
M supabase/functions/{check-subscription,handle-signup,stripe-webhook}/
A supabase/migrations/20260302121500_dedupe_subscribers_by_user_id.sql
```

---

## 🔄 Fluxo de Mensagem (exemplo real)

### Quando um cliente envia mensagem via WhatsApp:

```
1. WhatsApp Client
   └─> "Olá, tudo bem? Preciso de orçamento para 50 parafusos DeWalt"

2. Evolution API
   └─> Webhook POST /webhooks/evolution

3. Summi Worker (Python)
   └─> app.py (handle_evolution_webhook)
   └─> Redis dedup check (evita duplicata)
   └─> Grava em: public.chats.conversa

4. OpenAI GPT-4o
   └─> Análise: prioridade=IMPORTANTE
   └─> Contexto: vendas, cliente novo
   └─> Atualiza: public.chats.prioridade, contexto, analisado_em

5. Frontend (React)
   └─> Dashboard mostra nova mensagem
   └─> Badge "IMPORTANTE" em destaque

6. Summi Job (Horário)
   └─> A cada 1h, agrupa mensagens IMPORTANTES do dia
   └─> Gera resumo com GPT-4o
   └─> Envia via WhatsApp: "📋 Resumo da última hora: ..."
```

---

## 📊 Modelo de Dados Simplificado

**Tabelas Principais:**

| Tabela | Descrição |
|--------|-----------|
| `public.users` | Usuários Summi |
| `public.instances` | Contas WhatsApp por usuário |
| `public.chats` | Mensagens do WhatsApp |
| `public.profiles` | Configurações por usuário (business hours, etc) |
| `public.subscriptions` | Planos de preço e billing |
| `public.subscribers` | Relação usuário-instância (deduplicado por user_id) |

**Exemplo: Uma mensagem é armazenada assim:**

```json
{
  "id": "uuid",
  "instance_id": "uuid-da-instancia",
  "usuario_id": "uuid-do-usuario",
  "conversa": "Olá, tudo bem? Preciso de orçamento",
  "prioridade": "IMPORTANTE",
  "contexto": "vendas, cliente novo",
  "analisado_em": "2026-03-02T14:30:00Z",
  "criado_em": "2026-03-02T14:29:00Z"
}
```

---

## 🔐 Segurança & Compliance

- ✅ **JWT Auth** - Supabase autenticação
- ✅ **LGPD/GDPR** - Data deletion, privacy policy
- ✅ **Encryption** - Dados em trânsito (HTTPS)
- ✅ **API Keys** - Separação entre service role e anon
- ✅ **RLS (Row Level Security)** - Supabase RLS policies

---

## 📞 Recursos Úteis

| Recurso | Link |
|---------|------|
| **GitHub Repo** | (Local: `/Users/Lucas-Lenovo/Summi/summi-b1463168`) |
| **Supabase Dashboard** | `https://<ref>.supabase.co` |
| **Evolution API Docs** | https://doc.evolution.bot/ |
| **OpenAI API Docs** | https://platform.openai.com/docs |

---

## 🎓 Próximos Passos

1. ✅ **Leia este documento** (você está aqui!)
2. 📖 Abra [`SETUP_LOCAL.md`](./SETUP_LOCAL.md) para configurar ambiente
3. 🏗️ Leia [`ARCHITECTURE.md`](./ARCHITECTURE.md) para entender fluxos
4. 👥 Veja [`CONTRIBUTING.md`](./CONTRIBUTING.md) para contribuir

---

**Dúvidas?** Cheque [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md) ou abra uma issue no GitHub.

**Quer contribuir?** Veja [`CONTRIBUTING.md`](./CONTRIBUTING.md) e [`CODING_STANDARDS.md`](./CODING_STANDARDS.md).
