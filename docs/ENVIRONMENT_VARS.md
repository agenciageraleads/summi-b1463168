# 🔧 Variáveis de Ambiente

**Última atualização:** 2026-03-02
**Versão:** 1.2.3

---

## 📍 Onde configurar

| Camada | Arquivo | Acesso |
|--------|---------|--------|
| **Frontend** | `.env.local` | Público (VITE_*) |
| **Worker** | `vps/summi_worker/.env` | Privado |
| **Edge Functions** | Supabase Dashboard | Privado |

---

## 🎨 Frontend (.env.local)

**Arquivo:** `./.env.local` (na raiz)

**Variáveis VITE (públicas):**

```bash
# Supabase
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Stripe (pagamentos)
VITE_STRIPE_PUBLIC_KEY=pk_live_xxxxx

# Worker API (opcional, para dev local)
VITE_WORKER_API_URL=http://localhost:8080

# Feature flags (opcional)
VITE_ENABLE_BETA_FEATURES=false
VITE_DEBUG_MODE=false
```

### Exemplo completo (.env.local)

```bash
# ============ SUPABASE ============
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhtd3V6Z3ZjdmR6d3V0aGxmb2RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDMwMDAwMDAsImV4cCI6OTk5OTk5OTk5OX0.Jrv7-2R9B8VZ4cPxYqQ5FGH6JpK8LmN9OsT0UvW1XyZ

# ============ STRIPE ============
VITE_STRIPE_PUBLIC_KEY=pk_test_51234567890abcdefghijklmnopqrstuvwxyz

# ============ DEVELOPMENT ============
VITE_WORKER_API_URL=http://localhost:8080
VITE_DEBUG_MODE=true
```

---

## 🐍 Backend Worker (vps/summi_worker/.env)

**Arquivo:** `./vps/summi_worker/.env` (não commitar!)

### Supabase

```bash
# Database connection
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# RLS: service role tem acesso total, anon usa RLS policies
# Para worker: sempre use SUPABASE_SERVICE_ROLE_KEY
```

### OpenAI (Análise + Transcrição + TTS)

```bash
# API Key (obtenha em https://platform.openai.com/api-keys)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Modelos para análise
OPENAI_MODEL_ANALYSIS=gpt-4o-mini          # Análise de prioridade
OPENAI_MODEL_SUMMARY=gpt-4o-mini           # Resumo horário

# TTS (text-to-speech) para Summi da Hora em áudio
OPENAI_TTS_MODEL=gpt-4o-mini-tts
OPENAI_TTS_VOICE=alloy                     # Options: alloy, echo, fable, onyx, nova, shimmer
```

### Whisper (Transcrição de Áudio)

```bash
# Modelo padrão (barato)
OPENAI_TRANSCRIPTION_MODEL=whisper-1       # ou gpt-4o-mini-transcribe

# Fallback (melhor, para áudio ruim)
OPENAI_TRANSCRIPTION_FALLBACK_MODEL=whisper-1

# Idioma (fixar em português reduz erro)
OPENAI_TRANSCRIPTION_LANGUAGE=pt

# Vocabulário customizado (marcas, siglas)
OPENAI_TRANSCRIPTION_PROMPT_EXTRA=CNPJ, CPF, orcamento, pedido, nota fiscal, codigo do produto, prazo de entrega, DeWalt, Makita, Bosch, Stanley, Milwaukee

# Heurística: quando usar fallback?
OPENAI_TRANSCRIPTION_CONFIDENCE_THRESHOLD=0.55              # General threshold
OPENAI_TRANSCRIPTION_CRITICAL_CONFIDENCE_THRESHOLD=0.80     # For numbers/codes
OPENAI_TRANSCRIPTION_CHUNKING_MIN_SECONDS=20                # Auto-chunk if > 20s

# Enable fallback?
OPENAI_TRANSCRIPTION_ENABLE_FALLBACK=true
```

### Evolution API (WhatsApp)

```bash
# Evolution API cloud
EVOLUTION_API_URL=https://api.evolution.example.com
EVOLUTION_API_KEY=sk-evolution-xxxxxxxxxxxxx

# Instância que envia "Summi da Hora"
SUMMI_SENDER_INSTANCE=Summi

# Número para ignorar (ex: bot antigo)
IGNORE_REMOTE_JID=556293984600
```

### Business Hours (Global Fallback)

```bash
# Horário comercial (fallback; usuário pode customizar em profiles)
BUSINESS_HOURS_START=8        # 8:00 AM
BUSINESS_HOURS_END=18         # 6:00 PM
```

### Jobs Agendados

```bash
# Habilitar job horário?
ENABLE_HOURLY_JOB=true

# Habilitar job diário?
ENABLE_DAILY_JOB=true

# Horário do resumo diário (interpretado no timezone abaixo)
DAILY_SUMMARY_HOUR_UTC=22

# Timezone do resumo diário (opcional; padrão UTC)
DAILY_SUMMARY_TIMEZONE=UTC

# Cleanup de mensagens antigas (dias)
LOW_PRIORITY_CLEANUP_DAYS=30   # Delete normal messages > 30 days
```

### Deduplicação (Redis)

```bash
# TTL para webhook dedupe (recomendado: 86400 = 24h)
WEBHOOK_DEDUPE_TTL_SECONDS=86400

# Redis (se usar cache distribuído)
REDIS_URL=redis://localhost:6379
REDIS_DB=0
```

### Logging

```bash
# Log level
LOG_LEVEL=INFO              # Options: DEBUG, INFO, WARNING, ERROR

# Loggers específicos
OPENAI_LOG_LEVEL=DEBUG
EVOLUTION_LOG_LEVEL=INFO
```

### Servidor FastAPI

```bash
# Host/Port
WORKER_HOST=0.0.0.0
WORKER_PORT=8080

# Timeout para requisições externas
OPENAI_REQUEST_TIMEOUT=60       # segundos
EVOLUTION_REQUEST_TIMEOUT=30
```

### Exemplo completo (.env)

```bash
# ============ SUPABASE ============
SUPABASE_URL=https://xmwuzgvcvdzwuthlfodo.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ============ OPENAI ============
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_MODEL_ANALYSIS=gpt-4o-mini
OPENAI_MODEL_SUMMARY=gpt-4o-mini
OPENAI_TTS_MODEL=gpt-4o-mini-tts
OPENAI_TTS_VOICE=alloy

# ============ WHISPER/TRANSCRIPTION ============
OPENAI_TRANSCRIPTION_MODEL=whisper-1
OPENAI_TRANSCRIPTION_FALLBACK_MODEL=whisper-1
OPENAI_TRANSCRIPTION_LANGUAGE=pt
OPENAI_TRANSCRIPTION_PROMPT_EXTRA=CNPJ, CPF, orcamento, pedido
OPENAI_TRANSCRIPTION_CONFIDENCE_THRESHOLD=0.55
OPENAI_TRANSCRIPTION_CRITICAL_CONFIDENCE_THRESHOLD=0.80
OPENAI_TRANSCRIPTION_CHUNKING_MIN_SECONDS=20
OPENAI_TRANSCRIPTION_ENABLE_FALLBACK=true

# ============ EVOLUTION API ============
EVOLUTION_API_URL=https://evolution.example.com
EVOLUTION_API_KEY=sk-evolution-xxxxx
SUMMI_SENDER_INSTANCE=Summi
IGNORE_REMOTE_JID=556293984600

# ============ BUSINESS HOURS ============
BUSINESS_HOURS_START=8
BUSINESS_HOURS_END=18

# ============ JOBS ============
ENABLE_HOURLY_JOB=true
ENABLE_DAILY_JOB=true
DAILY_SUMMARY_HOUR_UTC=22
DAILY_SUMMARY_TIMEZONE=UTC
LOW_PRIORITY_CLEANUP_DAYS=30

# ============ REDIS/DEDUPE ============
WEBHOOK_DEDUPE_TTL_SECONDS=86400
REDIS_URL=redis://localhost:6379
REDIS_DB=0
RUN_NOW_WAIT_SECONDS=12
RUN_NOW_RESULT_TTL_SECONDS=600

# ============ LOGGING ============
LOG_LEVEL=INFO
OPENAI_LOG_LEVEL=DEBUG

# ============ SERVER ============
WORKER_HOST=0.0.0.0
WORKER_PORT=8080
OPENAI_REQUEST_TIMEOUT=60
EVOLUTION_REQUEST_TIMEOUT=30
```

---

## 🔓 Edge Functions (Supabase)

**Arquivo:** Supabase Dashboard → Edge Functions → Environment Variables

**Variáveis recomendadas:**

```bash
# Webhook URLs (aponta para VPS worker)
WEBHOOK_RECEBE_MENSAGEM=https://api.summi.com/webhooks/evolution
# LEGADO: manter apenas para compatibilidade; endpoint não executa análise por mensagem
WEBHOOK_ANALISA_MENSAGENS=https://api.summi.com/webhooks/evolution-analyze
SUMMI_WORKER_ANALYZE_URL=https://api.summi.com/api/analyze-messages

# Stripe (para billing)
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Evolution API (para conectar instâncias)
EVOLUTION_API_URL=https://api.evolution.example.com
EVOLUTION_API_KEY=sk-evolution-xxxxx

# JWT secret (opcional, já vem do Supabase)
JWT_SECRET=your-super-secret-key
```

---

## 🔐 Segurança: Chaves Públicas vs Privadas

| Chave | Tipo | Onde Usar | Segurança |
|-------|------|-----------|-----------|
| **VITE_SUPABASE_ANON_KEY** | Pública | Frontend `.env.local` | ✅ OK, RLS protege |
| **SUPABASE_SERVICE_ROLE_KEY** | Privada | Backend + Worker | 🔒 **NUNCA** em frontend |
| **OPENAI_API_KEY** | Privada | Backend + Worker | 🔒 **NUNCA** em frontend |
| **VITE_STRIPE_PUBLIC_KEY** | Pública | Frontend | ✅ OK, design de API |
| **STRIPE_SECRET_KEY** | Privada | Edge Functions | 🔒 **NUNCA** em frontend |

---

## 🔄 Migrations Entre Ambientes

### Dev → Staging

```bash
# Copy do .env.local
VITE_SUPABASE_URL=https://staging-xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...  # staging key

# Copy do worker .env
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...  # staging key
OPENAI_API_KEY=sk-proj-xxxxx  # (mesma, ou separada)
```

### Staging → Production

```bash
# Usar production keys
VITE_SUPABASE_URL=https://prod-xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...  # prod key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...  # prod key
```

---

## ✅ Checklist antes de Deploy

- [ ] `.env.local` **não** commitado
- [ ] `.env` (worker) **não** commitado
- [ ] Todas as keys estão em `.gitignore`
- [ ] Variáveis de produção não têm valores de desenvolvimento
- [ ] RLS policies estão habilitadas no Supabase
- [ ] CORS está configurado corretamente
- [ ] API keys não são logadas em console
- [ ] Webhooks apontam para URLs corretas

---

## 🆘 Troubleshooting

### "VITE_SUPABASE_URL não definida"
```bash
# Verifique .env.local
cat .env.local | grep VITE_SUPABASE_URL

# Restart dev server após editar .env
npm run dev
```

### "Supabase auth falha"
```bash
# Verifique ANON_KEY
curl -X GET http://localhost:54321/health

# Verifique JWT
curl -X POST http://localhost:54321/auth/v1/token \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456"}'
```

### "OpenAI API error"
```bash
# Verifique key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Cheque balance/quota em https://platform.openai.com/account/billing
```

### "Evolution API não conecta"
```bash
# Teste connectivity
curl -X GET $EVOLUTION_API_URL/health \
  -H "Authorization: $EVOLUTION_API_KEY"
```

---

## 📚 Recursos

| Recurso | Link |
|---------|------|
| **Supabase Docs** | https://supabase.com/docs |
| **OpenAI API Keys** | https://platform.openai.com/api-keys |
| **Stripe Keys** | https://dashboard.stripe.com/apikeys |
| **Evolution API Docs** | https://doc.evolution.bot/ |

---

**Dúvidas?** Cheque [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md) ou [`SETUP_LOCAL.md`](./SETUP_LOCAL.md).
