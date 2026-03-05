# 🚀 Deployment

**Ambientes:** Development | Staging | Production

---

## Produção (Docker Compose)

**Arquivo:** `/vps/portainer/stack.summi-complete.yml`

```bash
# Deploy com Portainer
# 1. Abra Portainer UI
# 2. Stacks → Add Stack
# 3. Upload stack.summi-complete.yml
# 4. Set env vars
# 5. Deploy

# Ou CLI:
docker compose -f vps/portainer/stack.summi-complete.yml up -d
```

---

## Services

1. **Frontend** - Nginx (static)
2. **Worker API** - FastAPI (análise)
3. **Scheduler** - Python (jobs horários)
4. **Supabase** - Cloud (database + auth)

---

## Env Vars

```bash
SUMMI_FRONTEND_HOST=summi.com
SUMMI_WORKER_HOST=api.summi.com
SUPABASE_URL=https://xxxxx.supabase.co
OPENAI_API_KEY=sk-proj-xxxxx
```

---

## Versioning

```bash
python scripts/promote_release.py  # Auto-bump version
```

---

**Ver também:** [`ENVIRONMENT_VARS.md`](./ENVIRONMENT_VARS.md) para configs detalhadas.
