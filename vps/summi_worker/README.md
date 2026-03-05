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
OPENAI_TRANSCRIPTION_MODEL="gpt-4o-mini-transcribe"
OPENAI_TRANSCRIPTION_FALLBACK_MODEL="gpt-4o-transcribe"
OPENAI_TRANSCRIPTION_LANGUAGE="pt"
OPENAI_TRANSCRIPTION_PROMPT_EXTRA="CNPJ, CPF, orcamento, pedido, nota fiscal, codigo do produto, prazo de entrega, DeWalt, Makita, Bosch, Stanley, Milwaukee"
OPENAI_TRANSCRIPTION_ENABLE_FALLBACK="true"
OPENAI_TRANSCRIPTION_CONFIDENCE_THRESHOLD="0.55"
OPENAI_TRANSCRIPTION_CRITICAL_CONFIDENCE_THRESHOLD="0.80"
OPENAI_TRANSCRIPTION_CHUNKING_MIN_SECONDS="20"

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
ENABLE_DAILY_JOB="true"
DAILY_SUMMARY_HOUR_UTC="22"     # 19:00 America/Sao_Paulo quando timezone=UTC
DAILY_SUMMARY_TIMEZONE="UTC"

# Cleanup (opcional)
LOW_PRIORITY_CLEANUP_DAYS="0"

# Idempotencia do webhook (recomendado >= 24h para cobrir replays da Evolution)
WEBHOOK_DEDUPE_TTL_SECONDS="86400"
```

### Transcricao de audio

- `OPENAI_TRANSCRIPTION_MODEL`: modelo padrao barato. Recomendado `gpt-4o-mini-transcribe`.
- `OPENAI_TRANSCRIPTION_FALLBACK_MODEL`: usado apenas quando a heuristica detectar transcricao vazia, baixa confianca, repeticao suspeita ou conteudo critico com confianca borderline.
- `OPENAI_TRANSCRIPTION_LANGUAGE`: fixe em `pt` para reduzir erro e latencia.
- `OPENAI_TRANSCRIPTION_PROMPT_EXTRA`: vocabulario global do negocio. Ajuste com marcas, siglas e termos recorrentes.
- `OPENAI_TRANSCRIPTION_CONFIDENCE_THRESHOLD`: fallback geral. Comece em `0.55`.
- `OPENAI_TRANSCRIPTION_CRITICAL_CONFIDENCE_THRESHOLD`: fallback para audios com numeros, CNPJ, codigos e marcas. Comece em `0.80`.
- `OPENAI_TRANSCRIPTION_CHUNKING_MIN_SECONDS`: ativa `chunking_strategy=auto` em audios maiores.

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
- `POST /webhooks/evolution-analyze` (Evolution -> Summi): ingestao + analise (ideal para "beta")
- `POST /api/analyze-messages` (frontend/supabase -> Summi): inicia analise do usuario autenticado
- `POST /internal/run-hourly` (manual/admin): executa o job horario uma vez

## Migracao (n8n -> VPS)
No Supabase (env vars das Edge Functions):
- `SUMMI_WORKER_ANALYZE_URL`: aponte para `https://<sua-vps>/api/analyze-messages`
- `WEBHOOK_RECEBE_MENSAGEM`: aponte para `https://<sua-vps>/webhooks/evolution`
- `WEBHOOK_ANALISA_MENSAGENS`: aponte para `https://<sua-vps>/webhooks/evolution-analyze`

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

## Observabilidade rapida

Depois do deploy, acompanhe nos logs do worker:
- `openai.transcription_fallback_triggered`
- `evolution_webhook.audio_transcribed`
- `evolution_webhook.reaction_audio_transcribed`

O que observar:
- se `audio_transcription_used_fallback=true` estiver alto demais, o threshold esta agressivo ou o audio de entrada esta ruim
- se houver muito `critical_content_low_confidence`, o prompt extra ainda nao cobre bem o dominio
- se o fallback quase nunca acontecer, mas o usuario ainda reclamar de erro em marcas/CNPJ, suba o threshold critico com cautela
