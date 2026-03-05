# 📚 Summi - Documentação Completa

> SaaS de integração WhatsApp com IA para análise e resumo de mensagens

---

## 🚀 Quick Start

**Para new devs começarem:**
1. 📖 Leia [`PROJECT_OVERVIEW.md`](./PROJECT_OVERVIEW.md) (5 min)
2. 🛠️ Siga [`SETUP_LOCAL.md`](./SETUP_LOCAL.md) (10-15 min)
3. 🏗️ Entenda [`ARCHITECTURE.md`](./ARCHITECTURE.md) (15 min)

---

## 📑 Índice de Documentação

### 📘 Visão Geral
| Documento | Descrição | Público |
|-----------|-----------|---------|
| [`PROJECT_OVERVIEW.md`](./PROJECT_OVERVIEW.md) | O que é Summi, features, stack | Todos |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Arquitetura geral (frontend, backend, worker) | Devs, Architects |
| [`CHANGELOG.md`](./CHANGELOG.md) | Histórico de versões e features | Product, Devs |

### 🔧 Setup & Deployment
| Documento | Descrição | Para |
|-----------|-----------|------|
| [`SETUP_LOCAL.md`](./SETUP_LOCAL.md) | Instruções de setup local para desenvolvimento | Novos devs |
| [`DEPLOYMENT.md`](./DEPLOYMENT.md) | Deploy em produção, Docker, CI/CD | DevOps, Devs |
| [`ENVIRONMENT_VARS.md`](./ENVIRONMENT_VARS.md) | Todas as variáveis de ambiente | Devs, DevOps |

### 💾 Backend & Banco de Dados
| Documento | Descrição | Para |
|-----------|-----------|------|
| [`DATABASE.md`](./DATABASE.md) | Schema, migrations, relacionamentos | Backend Devs, DBAs |
| [`SUPABASE_EDGE_FUNCTIONS.md`](./SUPABASE_EDGE_FUNCTIONS.md) | Documentação das 36 Edge Functions | Backend Devs |
| [`VPS_WORKER.md`](./VPS_WORKER.md) | FastAPI worker (análise, transcription, jobs) | Backend Devs |

### 🎨 Frontend
| Documento | Descrição | Para |
|-----------|-----------|------|
| [`FRONTEND.md`](./FRONTEND.md) | React, páginas, componentes, hooks | Frontend Devs |

### 🔐 API & Integrações
| Documento | Descrição | Para |
|-----------|-----------|------|
| [`API_DESIGN.md`](./API_DESIGN.md) | Design de API, endpoints, payloads | Backend Devs |
| [`INTEGRATIONS.md`](./INTEGRATIONS.md) | Evolution API (WhatsApp), OpenAI, Stripe | Devs |

### 📋 Desenvolvimento
| Documento | Descrição | Para |
|-----------|-----------|------|
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | Guia de contribuição, PR process, conventions | Todos os devs |
| [`CODING_STANDARDS.md`](./CODING_STANDARDS.md) | Padrões de código, style guide | Devs |
| [`TESTING.md`](./TESTING.md) | Estratégia de testes, como rodar testes | QA, Devs |

### 🚨 Operações & Troubleshooting
| Documento | Descrição | Para |
|-----------|-----------|------|
| [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md) | Problemas comuns e soluções | Devs, Ops |
| [`MONITORING.md`](./MONITORING.md) | Logs, métricas, observabilidade | DevOps |

### 📱 Features & Workflows
| Documento | Descrição | Para |
|-----------|-----------|------|
| [`FEATURES.md`](./FEATURES.md) | Lista de features, como funcionam | Product, QA |
| [`WHATSAPP_INTEGRATION.md`](./WHATSAPP_INTEGRATION.md) | Fluxo WhatsApp: mensagens, análise, resumo | Backend Devs |
| [`AUDIO_TRANSCRIPTION.md`](./AUDIO_TRANSCRIPTION.md) | Audio pipeline, modelos, fallbacks | Backend Devs |

---

## 🗂️ Estrutura de Diretórios

```
summi-b1463168/
├── src/                    → Frontend React
├── supabase/              → Edge Functions + Migrations
├── vps/summi_worker/      → FastAPI worker (análise, jobs)
├── scripts/               → Automação de release/deploy
├── docs/                  → ESTA DOCUMENTAÇÃO
│   ├── INDEX.md          (você está aqui)
│   ├── PROJECT_OVERVIEW.md
│   ├── ARCHITECTURE.md
│   ├── SETUP_LOCAL.md
│   ├── DEPLOYMENT.md
│   ├── DATABASE.md
│   ├── SUPABASE_EDGE_FUNCTIONS.md
│   ├── VPS_WORKER.md
│   ├── FRONTEND.md
│   ├── API_DESIGN.md
│   ├── INTEGRATIONS.md
│   ├── CONTRIBUTING.md
│   ├── CODING_STANDARDS.md
│   ├── TESTING.md
│   ├── TROUBLESHOOTING.md
│   ├── MONITORING.md
│   ├── FEATURES.md
│   ├── WHATSAPP_INTEGRATION.md
│   ├── AUDIO_TRANSCRIPTION.md
│   ├── ENVIRONMENT_VARS.md
│   └── CHANGELOG.md
└── ...
```

---

## 🎯 Por onde começar?

### Sou Frontend Dev
1. [`PROJECT_OVERVIEW.md`](./PROJECT_OVERVIEW.md)
2. [`SETUP_LOCAL.md`](./SETUP_LOCAL.md)
3. [`FRONTEND.md`](./FRONTEND.md)
4. [`CONTRIBUTING.md`](./CONTRIBUTING.md)

### Sou Backend Dev
1. [`PROJECT_OVERVIEW.md`](./PROJECT_OVERVIEW.md)
2. [`SETUP_LOCAL.md`](./SETUP_LOCAL.md)
3. [`ARCHITECTURE.md`](./ARCHITECTURE.md)
4. [`DATABASE.md`](./DATABASE.md)
5. [`VPS_WORKER.md`](./VPS_WORKER.md)
6. [`SUPABASE_EDGE_FUNCTIONS.md`](./SUPABASE_EDGE_FUNCTIONS.md)
7. [`CONTRIBUTING.md`](./CONTRIBUTING.md)

### Sou DevOps / Infra
1. [`PROJECT_OVERVIEW.md`](./PROJECT_OVERVIEW.md)
2. [`DEPLOYMENT.md`](./DEPLOYMENT.md)
3. [`ENVIRONMENT_VARS.md`](./ENVIRONMENT_VARS.md)
4. [`MONITORING.md`](./MONITORING.md)
5. [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md)

### Sou Product / QA
1. [`PROJECT_OVERVIEW.md`](./PROJECT_OVERVIEW.md)
2. [`FEATURES.md`](./FEATURES.md)
3. [`TESTING.md`](./TESTING.md)
4. [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md)

---

## 📞 Contatos & Recursos

**Git Repository:** `main` branch (production-ready)

**Tech Stack:**
- Frontend: React 18 + TypeScript + Tailwind CSS
- Backend: Supabase (PostgreSQL) + Edge Functions (Deno)
- Worker: Python 3.11+ FastAPI
- Messaging: Evolution API (WhatsApp)
- AI: OpenAI GPT-4o, Whisper

**Serviços Externos:**
- Stripe (pagamentos)
- Supabase (banco + auth)
- OpenAI (análise + transcription)
- Evolution API (WhatsApp)

---

## ✅ Checklist para Onboarding

- [ ] Ler [`PROJECT_OVERVIEW.md`](./PROJECT_OVERVIEW.md)
- [ ] Seguir [`SETUP_LOCAL.md`](./SETUP_LOCAL.md)
- [ ] Executar `npm run dev` com sucesso
- [ ] Ler [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- [ ] Ler [`CONTRIBUTING.md`](./CONTRIBUTING.md)
- [ ] Clonar um ticket/issue e familiarizar-se com o fluxo
- [ ] Fazer primeiro commit seguindo conventions
- [ ] Passar código em code review

---

## 🔄 Atualizando Documentação

**Regra de Ouro:** Se você mudou código/processo, atualize a docs!

1. Edite o arquivo `.md` relevante em `/docs/`
2. Mantenha linguagem clara e com exemplos práticos
3. Atualize [`CHANGELOG.md`](./CHANGELOG.md) se apropriado
4. Inclua PR na seção de "Documentação" se for release

**Maintainers:** Revisar docs a cada release (v1.2.3, etc).

---

**Última atualização:** 2026-03-02
**Versão do Projeto:** 1.2.3
