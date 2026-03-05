# 🎙️ Audio Transcription Pipeline

---

## Overview

```
Audio (WAV/MP3/OGG)
    ↓
Whisper-1 (fast, cheap)
    ↓
Quality Check
  └─ High confidence? → Use result
  └─ Low confidence? → Fallback to GPT-4o
    ↓
Save to public.chats.conversa
```

---

## Configuration

**Env Vars:**
```bash
# Primary model
OPENAI_TRANSCRIPTION_MODEL=whisper-1

# Fallback (melhor qualidade, mais caro)
OPENAI_TRANSCRIPTION_FALLBACK_MODEL=whisper-1

# Language (português)
OPENAI_TRANSCRIPTION_LANGUAGE=pt

# Custom vocabulary (marcas, siglas)
OPENAI_TRANSCRIPTION_PROMPT_EXTRA=CNPJ, CPF, orcamento, DeWalt, Bosch

# Thresholds
OPENAI_TRANSCRIPTION_CONFIDENCE_THRESHOLD=0.55        # General
OPENAI_TRANSCRIPTION_CRITICAL_CONFIDENCE_THRESHOLD=0.80  # Numbers/codes

# Auto-chunking para áudios longos
OPENAI_TRANSCRIPTION_CHUNKING_MIN_SECONDS=20

# Enable fallback?
OPENAI_TRANSCRIPTION_ENABLE_FALLBACK=true
```

---

## Fallback Strategy

Usa fallback quando:
1. **Confiança baixa** (`< CONFIDENCE_THRESHOLD`)
2. **Transcrição vazia** (Whisper retornou "")
3. **Repetição suspeita** (mesmo texto várias vezes)
4. **Conteúdo crítico** (números, CNPJ, etc com confiança `< CRITICAL_THRESHOLD`)

---

## Quality Metrics

**Logged:**
- `audio_transcription_used_fallback` (true/false)
- `audio_seconds` (duração em segundos)
- Confidence score

**Monitorar:**
```
SELECT
  COUNT(*) as total,
  SUM(CASE WHEN audio_transcription_used_fallback THEN 1 ELSE 0 END) as fallbacks,
  100.0 * SUM(CASE WHEN audio_transcription_used_fallback THEN 1 ELSE 0 END) / COUNT(*) as pct
FROM chats
WHERE criado_em > now() - interval '7 days'
```

---

## Troubleshooting

### "Áudio não transcreve"
- Verifique formato (WAV, MP3, OGG)
- Cheque OPENAI_API_KEY
- Aumente `OPENAI_REQUEST_TIMEOUT`

### "Fallback acontecendo demais"
- Áudio de entrada ruim?
- Threshold muito agressivo? Aumente em 0.05
- Vocabulário custom insuficiente?

### "Fallback nunca acontece"
- Aumente threshold (mais sensível)
- Cheque se `ENABLE_FALLBACK=true`

---

**Ver também:** [`INTEGRATIONS.md`](./INTEGRATIONS.md) para OpenAI setup.
