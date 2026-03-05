# 📊 Monitoring & Observability

---

## Logs

### Frontend
```bash
# Browser console (F12)
# Dev server logs:
npm run dev
```

### Backend (Worker)
```bash
# Docker logs
docker logs summi-worker -f

# Local logs
LOGS_FILE=/var/log/summi-worker.log
tail -f $LOGS_FILE

# Syslog (systemd)
journalctl -u summi-worker -f
```

### Supabase
```
Acesse: https://app.supabase.com → Logs
- Edge Functions logs
- Database activity
- Auth logs
```

---

## Métricas Importantes

| Métrica | Onde Monitorar |
|---------|---|
| **Audio transcription fallback rate** | Worker logs |
| **OpenAI API latency** | Worker logs |
| **Webhook dedupe hits** | Redis stats |
| **Scheduled job duration** | Worker logs |
| **Database query performance** | Supabase dashboard |

---

## Health Checks

```bash
# Worker
curl http://localhost:8080/health

# Supabase API
curl https://xxx.supabase.co/health

# Frontend
curl http://frontend-domain.com
```

---

## Alerting

Configure alertas para:
- Worker API down (health check fails)
- High error rate (logs > 5% errors)
- OpenAI quota exceeded
- Database slow queries

---

**Ver também:** [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md) para debug.
