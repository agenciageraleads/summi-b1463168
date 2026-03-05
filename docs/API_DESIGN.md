# 🔌 API Design

---

## REST Endpoints (Worker)

### Webhooks
- `POST /webhooks/evolution` - Ingest mensagens
- `POST /webhooks/evolution-analyze` - Ingest + analyze

### API
- `POST /api/analyze-messages` - Análise manual (auth required)
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
  "data": { ... },
  "error": null
}
```

---

## Authentication

- **Frontend:** JWT token (via Supabase Auth)
- **Worker:** Service Role Key
- **Edge Functions:** RLS policies

---

**Ver também:** [`VPS_WORKER.md`](./VPS_WORKER.md) para endpoints detalhados.
