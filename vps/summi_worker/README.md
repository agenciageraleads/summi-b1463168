# Summi Worker (VPS)

Este servico substitui os workflows do n8n, rodando na sua VPS.

O que ele cobre:
- Ingestao de webhook da Evolution API (mensagens) -> grava em `public.chats.conversa`
- Analise/priorizacao (OpenAI) -> atualiza `public.chats.prioridade`, `contexto`, `analisado_em`
- "Summi da Hora" (job horario) -> envia resumo (texto e opcionalmente audio) via Evolution API

## Requisitos
- Python 3.11+
- Um Postgres/Supabase com as tabelas/migrations do projeto
- Evolution API acessivel pela VPS
- OpenAI API key

## Configuracao (env)
Crie um `.env` ao lado do `app.py` (ou injete via systemd/docker):

```bash
SUPABASE_URL="https://<ref>.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="..."
SUPABASE_ANON_KEY="..."  # usado apenas para validar JWT do usuario (opcional)

OPENAI_API_KEY="..."
OPENAI_MODEL_ANALYSIS="gpt-4o-mini"
OPENAI_MODEL_SUMMARY="gpt-4o-mini"
OPENAI_TTS_MODEL="gpt-4o-mini-tts"
OPENAI_TTS_VOICE="alloy"

EVOLUTION_API_URL="https://evolution.seu-dominio.com"
EVOLUTION_API_KEY="..."

# Instancia central que envia o "Summi da Hora" para o cliente (igual ao n8n: instanceName "Summi")
SUMMI_SENDER_INSTANCE="Summi"

# Horario comercial (fallback global; por usuario respeita profiles.apenas_horario_comercial)
BUSINESS_HOURS_START="8"
BUSINESS_HOURS_END="18"

# Numero/remote_jid para ignorar (no n8n: 556293984600)
IGNORE_REMOTE_JID="556293984600"

# Job
ENABLE_HOURLY_JOB="true"

# Cleanup (opcional)
LOW_PRIORITY_CLEANUP_DAYS="0"
```

## Rodar local (exemplo)
```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8080
```

## Endpoints
- `POST /webhooks/evolution` (Evolution -> Summi): ingestao
- `POST /webhooks/evolution-analyze` (Evolution -> Summi): ingestao + analise (ideal para "beta")
- `POST /api/analyze-messages` (frontend/supabase -> Summi): inicia analise do usuario autenticado
- `POST /internal/run-hourly` (manual/admin): executa o job horario uma vez

## Migracao (n8n -> VPS)
No Supabase (env vars das Edge Functions):
- `SUMMI_WORKER_ANALYZE_URL`: aponte para `https://<sua-vps>/api/analyze-messages`
- `WEBHOOK_RECEBE_MENSAGEM`: aponte para `https://<sua-vps>/webhooks/evolution`
- `WEBHOOK_ANALISA_MENSAGENS`: aponte para `https://<sua-vps>/webhooks/evolution-analyze`

Mantive fallback para as envs antigas (`WEBHOOK_N8N_*`) para nao quebrar deploy.

## Portainer (stack unica)
Use a stack completa em:
- `/app/vps/portainer/stack.summi-complete.yml` (no repo: `vps/portainer/stack.summi-complete.yml`)
- Historico operacional interno: `vps/CHANGELOG_INTERNAL.md`
- Procedimento de promocao: `vps/RELEASE_PROMOTION.md`
- Checklist de release: `vps/RELEASE_CHECKLIST.md`

Ela sobe:
- frontend (Traefik host `${SUMMI_FRONTEND_HOST}`)
- worker API (Traefik host `${SUMMI_WORKER_HOST}`)
- worker scheduler (sem exposicao publica)
