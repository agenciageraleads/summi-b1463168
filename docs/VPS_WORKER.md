# 🐍 Python Worker (VPS FastAPI)

**Localização:** `/vps/summi_worker/`
**Versão:** 1.2.3 | **Python:** 3.11+

---

## 🎯 O que faz

O worker é um servidor FastAPI rodando em VPS que:

1. **Recebe webhooks** do Evolution API (WhatsApp)
2. **Transcreve áudio** com OpenAI Whisper
3. **Analisa mensagens** com GPT-4o
4. **Gera resumos** horários ("Summi da Hora")
5. **Envia** resumos de volta via WhatsApp

---

## 🏗️ Estrutura

```
vps/summi_worker/
├── app.py                    # FastAPI principal (4.2k linhas)
├── config.py                # Env vars + validation
├── openai_client.py         # GPT-4o + Whisper
├── evolution_client.py      # Evolution API client
├── prompt_builders.py       # AI prompts
├── summi_jobs.py            # Scheduled jobs (hourly)
├── analysis.py              # Lógica de priorização
├── redis_dedupe.py          # Dedup webhook
├── redis_queue.py           # Fila de processamento
├── supabase_rest.py         # Direct REST calls
├── evolution_webhook.py     # Webhook processing
├── Dockerfile               # Container
├── requirements.txt         # Dependencies
├── .env.example             # Template
└── test_*.py               # Unit tests
```

---

## 🚀 Endpoints

### 1. **Ingestão de Webhook**

```bash
POST /webhooks/evolution
```

**Headers:**
```
Content-Type: application/json
X-Evolution-Signature: <hmac>  # (opcional, para validação)
```

**Body:**
```json
{
  "event": "messages.upsert",
  "data": {
    "key": {
      "id": "msg_uuid",
      "remoteJid": "5512345678@s.whatsapp.net",
      "fromMe": false
    },
    "message": {
      "conversation": "Olá, preciso de orçamento"
    },
    "messageTimestamp": 1708800000
  }
}
```

**Response:**
```json
{
  "success": true,
  "message_id": "uuid",
  "status": "ingested"
}
```

---

### 2. **Ingestão + Análise**

```bash
POST /webhooks/evolution-analyze
```

Mesmo body que acima, mas dispara análise imediatamente.

---

### 3. **Análise Manual**

```bash
POST /api/analyze-messages
Authorization: Bearer <JWT>
```

**Body:**
```json
{
  "limit": 10,
  "priority": null
}
```

**Response:**
```json
{
  "analyzed": 8,
  "skipped": 2,
  "errors": []
}
```

---

### 4. **Health Check**

```bash
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-03-02T14:30:00Z"
}
```

---

## 🔧 Configuração

**Arquivo:** `vps/summi_worker/.env`

Ver [`docs/ENVIRONMENT_VARS.md`](./ENVIRONMENT_VARS.md) para lista completa.

Key vars:
```bash
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
OPENAI_API_KEY=sk-proj-xxxxx
EVOLUTION_API_URL=https://evolution.example.com
EVOLUTION_API_KEY=sk-evolution-xxxxx
ENABLE_HOURLY_JOB=true
```

---

## 🏃 Rodar Local

```bash
cd vps/summi_worker

# Virtual env
python3 -m venv .venv
source .venv/bin/activate

# Instalar
pip install -r requirements.txt

# Criar .env
cp .env.example .env
# Edite com suas keys

# Rodar
uvicorn app:app --host 0.0.0.0 --port 8080 --reload

# Testar
curl http://localhost:8080/health
```

---

## 🐳 Docker

```bash
# Build
docker build -t summi-worker -f Dockerfile .

# Run
docker run -p 8080:8080 \
  -e SUPABASE_URL=https://xxx.supabase.co \
  -e SUPABASE_SERVICE_ROLE_KEY=eyJ... \
  -e OPENAI_API_KEY=sk-proj-xxx \
  summi-worker

# Com .env
docker run -p 8080:8080 --env-file .env summi-worker
```

---

## 📊 Fluxo Principal

```
1. Evolution Webhook → POST /webhooks/evolution
   ├─ Parse JSON
   ├─ Redis dedupe check
   └─ INSERT public.chats

2. (Optional) Analysis
   ├─ Check if audio → Whisper transcription
   ├─ OpenAI GPT-4o analysis
   ├─ Determine priority
   └─ UPDATE public.chats

3. Hourly Job (summi_jobs.py)
   ├─ SELECT chats (last 24h, priority=IMPORTANTE/URGENTE)
   ├─ GPT-4o summarization
   ├─ (Optional) TTS to audio
   └─ Evolution API send to WhatsApp
```

---

## 🔍 Key Modules

### `app.py` (4.2k lines)

Main FastAPI server. Rotas, middleware, error handling.

**Key functions:**
- `handle_evolution_webhook()` - Recebe mensagens
- `analyze_messages()` - Análise manual
- `run_hourly_job()` - Job manual

### `openai_client.py`

Wrapper para OpenAI.

**Key functions:**
- `analyze_message()` - GPT-4o
- `transcribe_audio()` - Whisper
- `generate_summary()` - Summarização
- `text_to_speech()` - TTS

### `evolution_client.py`

Wrapper para Evolution API.

**Key functions:**
- `send_message()` - Envia via WhatsApp
- `get_instance_status()` - Status da conexão

### `summi_jobs.py`

Scheduled jobs.

**Key functions:**
- `run_hourly_summary_job()` - Job principal

### `analysis.py`

Lógica de análise.

**Key functions:**
- `determine_priority()` - IMPORTANTE/URGENTE/NORMAL
- `extract_context()` - Contexto da mensagem

---

## 🧪 Testes

```bash
# Rodar testes
pytest test_app.py -v

# Com coverage
pytest test_*.py --cov=.

# Teste específico
pytest test_app.py::test_handle_webhook -v
```

**Exemplo test:**
```python
@pytest.mark.asyncio
async def test_analyze_message():
    result = await analyze_message(
        "Olá, preciso de orçamento",
        "user-123"
    )
    assert result["priority"] in ["IMPORTANTE", "URGENTE", "NORMAL"]
```

---

## 📈 Performance Tuning

### Otimizações

1. **Redis Dedupe** - Evita processamento duplicado
   ```python
   WEBHOOK_DEDUPE_TTL_SECONDS=86400  # 24h
   ```

2. **Async/Await** - Não bloqueia thread
   ```python
   async def handle_webhook(data):
       await save_to_db()
       await analyze_with_openai()
   ```

3. **Connection Pooling** - Supabase auto-pools

4. **Batch Processing** - Para jobs pesados
   ```python
   messages = get_batch(limit=50)
   for msg in messages:
       await analyze(msg)
   ```

---

## 🆘 Troubleshooting

### "OpenAI API error"
```
Verifique OPENAI_API_KEY está correto
Cheque rate limits: https://platform.openai.com/account/rate-limits
```

### "Supabase connection failed"
```
Verifique SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
Teste: curl https://xxx.supabase.co/rest/v1
```

### "Evolution webhook não chega"
```
Verifique:
- EVOLUTION_API_KEY está correto
- Webhook URL aponta para VPS IP correto
- Firewall não está bloqueando
```

### "Áudio não transcreve"
```
Verifique logs:
- OPENAI_TRANSCRIPTION_MODEL existe
- Audio é válido (não corrompido)
- Fallback está ativado
```

---

## 📚 Recursos

- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [Uvicorn](https://www.uvicorn.org/)
- [OpenAI API](https://platform.openai.com/docs)
- [Evolution API](https://doc.evolution.bot/)

---

**Ver também:**
- [`ENVIRONMENT_VARS.md`](./ENVIRONMENT_VARS.md) - Configuração detalhada
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) - Fluxo geral
- [`AUDIO_TRANSCRIPTION.md`](./AUDIO_TRANSCRIPTION.md) - Detalhes de transcrição

