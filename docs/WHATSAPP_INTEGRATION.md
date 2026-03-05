# 💬 WhatsApp Integration (Evolution API)

---

## Fluxo

### 1. Conectar Instância

```
Frontend → Supabase Edge Function
         → Evolution API
         → Gera QR Code
         → Usuário escaneia com WhatsApp
         → Instância conectada
```

### 2. Receber Mensagens

```
WhatsApp User → Evolution API (cloud)
             → Webhook HTTP POST → Summi Worker
             → Salva em public.chats
             → Frontend exibe
```

### 3. Enviar Resposta

```
Summi Job (hourário)
  → Agrega mensagens importantes
  → Gera resumo com GPT-4o
  → Envia via Evolution API
  → Chega no WhatsApp do usuário
```

---

## Webhook Format

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
      "conversation": "Olá, tudo bem?",
      "mediaMessage": {
        "mediaKey": "...",
        "mediaUrl": "https://..."
      }
    },
    "messageTimestamp": 1708800000
  }
}
```

---

## Configuration

**Env Vars:**
```bash
EVOLUTION_API_URL=https://api.evolution.example.com
EVOLUTION_API_KEY=sk-evolution-xxxxx
SUMMI_SENDER_INSTANCE=Summi  # Instância que envia resumos
IGNORE_REMOTE_JID=556293984600  # Números para ignorar
```

---

## Common Issues

### "Instância não conecta"
- Verifique EVOLUTION_API_KEY
- Teste health: `curl $EVOLUTION_API_URL/health`

### "Webhook não chega"
- Firewall bloqueando?
- URL correta no Evolution?
- Server rodando?

---

**Ver também:** [`VPS_WORKER.md`](./VPS_WORKER.md) para webhook handling.
