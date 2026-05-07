# Summi Worker (VPS)

Este servico substitui os workflows do n8n, rodando na sua VPS.

O que ele cobre:
- Ingestao de webhook da Evolution API (mensagens) -> grava em `public.chats.conversa`
- Analise/priorizacao (Gemini por padrao) -> atualiza `public.chats.prioridade`, `contexto`, `analisado_em`
- "Summi da Hora" (job horario) -> envia resumo em texto via Evolution API

## Requisitos
- Python 3.11+
- Um Postgres/Supabase com as tabelas/migrations do projeto
- Evolution API acessivel pela VPS
- Google Gemini API key

## Configuracao (env)
Crie um `.env` ao lado do `app.py` (ou injete via systemd/docker):

```bash
SUPABASE_URL="https://<ref>.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="..."
SUPABASE_ANON_KEY="..."  # usado apenas para validar JWT do usuario (opcional)

LLM_PROVIDER="google"
GOOGLE_TRANSCRIPTION_MODEL="gemini-2.5-flash-lite"
GOOGLE_MODEL_ANALYSIS="gemini-2.5-flash-lite"
GOOGLE_MODEL_SUMMARY="gemini-2.5-flash-lite"
GOOGLE_MODEL_VISION="gemini-2.5-flash-lite"
GOOGLE_API_KEY="..."

TRANSCRIPTION_PROVIDER="google"
TRANSCRIPTION_LANGUAGE="pt"
TRANSCRIPTION_PROMPT_EXTRA="CNPJ, CPF, orcamento, pedido, nota fiscal, codigo do produto, prazo de entrega, DeWalt, Makita, Bosch, Stanley, Milwaukee"
TTS_PROVIDER="none"

EVOLUTION_API_URL="https://evolution.seu-dominio.com"
EVOLUTION_API_KEY="..."

# Instancia central que envia o "Summi da Hora" para o cliente (igual ao n8n: instanceName "Summi")
SUMMI_SENDER_INSTANCE="Summi"

# Horario comercial (fallback global; por usuario respeita profiles.apenas_horario_comercial)
BUSINESS_HOURS_START="8"
BUSINESS_HOURS_END="18"
BUSINESS_HOURS_TIMEZONE="America/Sao_Paulo"

# Numero/remote_jid para ignorar (no n8n: 556293984600)
IGNORE_REMOTE_JID="556293984600"

# Job
ENABLE_HOURLY_JOB="true"
ENABLE_DAILY_JOB="false"
DAILY_SUMMARY_HOUR_UTC="22"     # 19:00 America/Sao_Paulo quando timezone=UTC
DAILY_SUMMARY_TIMEZONE="UTC"
RUN_NOW_WAIT_SECONDS="12"
RUN_NOW_RESULT_TTL_SECONDS="600"

# Cleanup (opcional)
LOW_PRIORITY_CLEANUP_DAYS="0"

# Redis / dedupe
REDIS_URL="redis://localhost:6379/0"
REQUIRE_REDIS="false"

# Idempotencia do webhook (recomendado >= 24h para cobrir replays da Evolution)
WEBHOOK_DEDUPE_TTL_SECONDS="86400"

# Wave 1 cost controls
ENABLE_IMAGE_DESCRIPTION="false"
ENABLE_SUMMI_AUDIO="false"
DEFAULT_SECONDS_TO_SUMMARIZE="90"
PAID_AI_SOFT_CAP_BRL="4.0"
PAID_AI_HARD_CAP_BRL="5.0"
TRIAL_AI_SOFT_CAP_BRL="1.0"
TRIAL_AI_HARD_CAP_BRL="1.5"
USD_BRL_EXCHANGE_RATE="5.8"
```

### Transcricao de audio

- `TRANSCRIPTION_PROVIDER`: `google` por padrao; use `openai` apenas se quiser fallback manual.
- `GOOGLE_API_KEY`: obrigatoria quando `LLM_PROVIDER=google` ou `TRANSCRIPTION_PROVIDER=google`.
- `GOOGLE_TRANSCRIPTION_MODEL`: recomendado `gemini-2.5-flash-lite` para menor custo.
- `TRANSCRIPTION_LANGUAGE`: fixe em `pt` para reduzir erro e latencia.
- `TRANSCRIPTION_PROMPT_EXTRA`: vocabulario global do negocio. Ajuste com marcas, siglas e termos recorrentes.
- `OPENAI_TRANSCRIPTION_*`: legado opcional, usado somente se `TRANSCRIPTION_PROVIDER=openai`.

Sugestao de calibracao inicial:
- negocio de ferramentas e vendas: `CNPJ, CPF, orcamento, pedido, nota fiscal, codigo do produto, prazo de entrega, DeWalt, Makita, Bosch, Stanley, Milwaukee`
- se houver marcas ou siglas proprias, coloque aqui antes de subir para producao

## Rodar local (exemplo)
```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8080
```

## Endpoints
- `POST /webhooks/evolution` (Evolution -> Summi): ingestao
- `POST /webhooks/evolution-analyze` (Evolution -> Summi): alias legado de ingestao (sem analise por mensagem)
- `POST /api/analyze-messages` (frontend/supabase -> Summi): executa Summi da Hora run-now do usuario autenticado
- `GET /api/analyze-messages/status/{job_id}`: consulta status do run-now
- `POST /internal/run-hourly` (manual/admin): executa o job horario uma vez

## Migracao (n8n -> VPS)
No Supabase (env vars das Edge Functions):
- `SUMMI_WORKER_ANALYZE_URL`: aponte para `https://<sua-vps>/api/analyze-messages`
- `WEBHOOK_RECEBE_MENSAGEM`: aponte para `https://<sua-vps>/webhooks/evolution`
- `WEBHOOK_ANALISA_MENSAGENS`: legado (opcional), endpoint sem analise por mensagem

## Dedupe do webhook
- `WEBHOOK_DEDUPE_TTL_SECONDS`: mantenha pelo menos `86400` segundos.
- Motivo: a Evolution pode reenfileirar `messages.upsert` antigos minutos depois em reconnect/sync; com janela curta, o mesmo `message_id` volta a disparar transcricao/resumo.

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

Defaults da onda 1:
- `ENABLE_DAILY_JOB=false`
- `ENABLE_IMAGE_DESCRIPTION=false`
- `ENABLE_SUMMI_AUDIO=false`
- `DEFAULT_SECONDS_TO_SUMMARIZE=90`

## Observabilidade rapida

Depois do deploy, acompanhe nos logs do worker:
- `evolution_webhook.audio_transcribed`
- `evolution_webhook.reaction_audio_transcribed`
- `summi_hourly` com `analyze_error_reasons` e `summary_error_reasons`

O que observar:
- se `audio_transcription_error` aparecer, valide `GOOGLE_API_KEY` e quota do Gemini
- se `analyze_error_reasons` ou `summary_error_reasons` vierem preenchidos, o scheduler agora mostra a causa real
