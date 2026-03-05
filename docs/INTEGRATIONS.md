# 🔗 Integrações Externas

---

## Supabase

**Uso:** Database + Auth + Edge Functions

**Credenciais:**
```bash
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

**Docs:** https://supabase.com/docs

---

## OpenAI

**Uso:** Análise (GPT-4o), Transcrição (Whisper), TTS

**Credenciais:**
```bash
OPENAI_API_KEY=sk-proj-xxxxx
```

**Models:**
- `gpt-4o-mini` - Análise rápida
- `whisper-1` - Transcrição de áudio
- `tts-1-hd` - Text-to-speech

**Docs:** https://platform.openai.com/docs

---

## Evolution API

**Uso:** Integração com WhatsApp

**Credenciais:**
```bash
EVOLUTION_API_URL=https://api.evolution.example.com
EVOLUTION_API_KEY=sk-evolution-xxxxx
```

**Docs:** https://doc.evolution.bot/

---

## Stripe

**Uso:** Pagamentos e billing

**Credenciais:**
```bash
STRIPE_PUBLIC_KEY=pk_live_xxxxx
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

**Docs:** https://stripe.com/docs

---

## Redis

**Uso:** Webhook dedupe, queue (opcional)

**Credenciais:**
```bash
REDIS_URL=redis://localhost:6379
```

---

**Ver também:** [`ENVIRONMENT_VARS.md`](./ENVIRONMENT_VARS.md) para todas as vars.
