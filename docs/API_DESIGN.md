# 🔌 API Design

---

## REST Endpoints (Worker)

### Webhooks
- `POST /webhooks/evolution` - Ingest mensagens
- `POST /webhooks/evolution-analyze` - Alias legado de ingestão (sem análise por mensagem)

### API
- `POST /api/analyze-messages` - Run-now do Summi da Hora (auth required)
- `GET /api/analyze-messages/status/{job_id}` - Status do run-now
- `POST /internal/run-hourly` - Trigger job

### Health
- `GET /health` - Health check

---

## Edge Functions (Supabase)

- `handle-signup` - Onboarding
- `check-subscription` - Verificar plano
- `create-checkout` - Stripe checkout
- `verify-admin` - Admin validation
- ... e mais 30+ functions

---

## Response Format

```json
{
  "success": true,
  "status": "completed",
  "summary_sent": true,
  "fallback_sent": false,
  "onboarding_sent": false,
  "analyzed_count": 4,
  "job_id": "optional-uuid",
  "reason": "optional_reason"
}
```

---

## Authentication

- **Frontend:** JWT token (via Supabase Auth)
- **Worker:** Service Role Key
- **Edge Functions:** RLS policies

---

**Ver também:** [`VPS_WORKER.md`](./VPS_WORKER.md) para endpoints detalhados.
