# 📱 Summi - WhatsApp + IA SaaS

**Versão:** 1.2.3 | **Status:** Production ✅

> Plataforma SaaS que integra WhatsApp com IA para análise inteligente e resumo de mensagens.

---

## 🎯 O que é Summi?

Summi ajuda vendedores, gerentes e empresas a:
- ✅ **Analisar** automaticamente prioridade de mensagens
- ✅ **Receber resumos** horários inteligentes ("Summi da Hora")
- ✅ **Transcrever áudio** com IA
- ✅ **Gerenciar** múltiplas contas WhatsApp
- ✅ **Integrar** com workflows existentes

---

## 🚀 Quick Start

### Para Desenvolvimento

```bash
# 1. Clone
git clone <REPO_URL>
cd summi-b1463168

# 2. Install
npm install

# 3. Setup (veja docs/SETUP_LOCAL.md)
npx supabase start
cp .env.example .env.local

# 4. Dev server
npm run dev
# Acesse: http://localhost:5173
```

**Documentação completa:** [`docs/SETUP_LOCAL.md`](./docs/SETUP_LOCAL.md)

### Para Produção

Docker + Docker Compose via Portainer:
```bash
# Stack completa (frontend + worker + scheduler)
docker compose -f vps/portainer/stack.summi-complete.yml up -d
```

---

## 📚 Documentação

Navegue pela documentação completa em **[`docs/INDEX.md`](./docs/INDEX.md)**

### 🚀 Para Começar
1. [`PROJECT_OVERVIEW.md`](./docs/PROJECT_OVERVIEW.md) - O que é Summi
2. [`SETUP_LOCAL.md`](./docs/SETUP_LOCAL.md) - Setup para dev
3. [`ARCHITECTURE.md`](./docs/ARCHITECTURE.md) - Arquitetura geral

### 🔧 Para Desenvolvedores
- [`CONTRIBUTING.md`](./docs/CONTRIBUTING.md) - Como contribuir
- [`CODING_STANDARDS.md`](./docs/CODING_STANDARDS.md) - Padrões de código
- [`ENVIRONMENT_VARS.md`](./docs/ENVIRONMENT_VARS.md) - Variáveis de ambiente
- [`DATABASE.md`](./docs/DATABASE.md) - Schema e migrations
- [`VPS_WORKER.md`](./docs/VPS_WORKER.md) - Python FastAPI worker
- [`FRONTEND.md`](./docs/FRONTEND.md) - React components

### 🚀 Para Deployment
- [`DEPLOYMENT.md`](./docs/DEPLOYMENT.md) - Deploy em produção
- [`MONITORING.md`](./docs/MONITORING.md) - Logs e observabilidade
- [`TROUBLESHOOTING.md`](./docs/TROUBLESHOOTING.md) - Common issues

---

## 🏗️ Stack Tecnológico

| Layer | Tech |
|-------|------|
| **Frontend** | React 18 + TypeScript + Vite + Tailwind |
| **Backend** | Supabase (PostgreSQL) + Edge Functions (Deno) |
| **Worker** | Python 3.11+ FastAPI on VPS |
| **AI** | OpenAI GPT-4o + Whisper |
| **Messaging** | Evolution API (WhatsApp) |
| **Billing** | Stripe |
| **Infra** | Docker + Docker Compose + Portainer |

---

## 📋 Status Atual (2026-03-02)

**Versão:** 1.2.3 (Production)

**Recentes:**
- ✅ v1.2.3 - Pin audio dedupe floor
- ✅ v1.2.2 - Improve audio transcription quality
- 🔄 **Em desenvolvimento:** Deduplicação por user_id

**Mudanças não commitadas:**
```
M scripts/promote_release.py
M vps/summi_worker/app.py
M vps/summi_worker/Dockerfile
A vps/summi_worker/test_app.py
M supabase/functions/{check-subscription,handle-signup,stripe-webhook}/
A supabase/migrations/20260302121500_dedupe_subscribers_by_user_id.sql
```

---

## 🗂️ Estrutura do Projeto

```
summi-b1463168/
├── src/                          # Frontend React (15 pages, 18+ components)
├── supabase/                     # Database (51+ migrations) + Edge Functions (36)
├── vps/summi_worker/             # Python FastAPI worker (análise, transcription)
├── vps/portainer/                # Docker Compose (produção)
├── scripts/                       # Automation (release, deploy)
├── docs/                         # 📚 Documentação completa
│   ├── INDEX.md                 # Start here!
│   ├── PROJECT_OVERVIEW.md
│   ├── SETUP_LOCAL.md
│   ├── ARCHITECTURE.md
│   ├── CONTRIBUTING.md
│   ├── ENVIRONMENT_VARS.md
│   └── ... (15+ outros docs)
├── package.json                  # Node dependencies
├── tsconfig.json                 # TypeScript config
└── README.md                      # Este arquivo
```

---

## 🚀 Roadmap

- [ ] Integração com Telegram
- [ ] Custom AI models por conta
- [ ] Análise de sentimento avançada
- [ ] Dashboard de analytics
- [ ] API pública (v1.3)

---

## 🤝 Contribuindo

Veja [`CONTRIBUTING.md`](./docs/CONTRIBUTING.md) para:
- Como fazer fork e PR
- Padrões de código
- Processo de review
- Testes e linting

**Resumo:**
```bash
git checkout -b feature/sua-feature
# Faça mudanças
npm run test
git commit -m "feat: descrição clara"
git push origin feature/sua-feature
# Abra PR no GitHub
```

---

## 📞 Suporte

**Documentação:** [`docs/INDEX.md`](./docs/INDEX.md)
**Troubleshooting:** [`docs/TROUBLESHOOTING.md`](./docs/TROUBLESHOOTING.md)
**Segurança:** Envie para [security@summi.com]

---

## 📄 Licença

Proprietário. Todos os direitos reservados © 2026 Summi.

---

## 🔗 Links Úteis

- **Supabase Dashboard:** https://app.supabase.com
- **OpenAI API:** https://platform.openai.com
- **Evolution API Docs:** https://doc.evolution.bot/
- **GitHub:** [Este repositório]

---

**Pronto para começar?** 👉 [`docs/SETUP_LOCAL.md`](./docs/SETUP_LOCAL.md)
