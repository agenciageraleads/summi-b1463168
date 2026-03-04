# Teste: Audio Transcription Config Fix

## Cenários de Teste

### Teste 1: Usuário com `transcreve_audio_recebido = False`
**Setup:**
1. Ir em DB/Supabase → `profiles`
2. Encontrar usuário de teste
3. Definir `transcreve_audio_recebido = false`
4. Manter `transcreve_audio_enviado = true` (ou default)

**Ação:**
- Usuário recebe um áudio de outra pessoa

**Esperado:**
- ❌ Nenhuma resposta com transcrição
- ✅ Log: `evolution_webhook.audio_transcription_skipped reason=config_disabled`
- ✅ Nenhuma chamada de API ao OpenAI (economiza tokens)

**Verificar:**
```bash
# Ver logs
docker logs summi-worker | grep "audio_transcription_skipped"
```

---

### Teste 2: Usuário com `transcreve_audio_enviado = False`
**Setup:**
1. Ir em DB → `profiles`
2. Definir `transcreve_audio_enviado = false`
3. Manter `transcreve_audio_recebido = true` (ou default)

**Ação:**
- Usuário ENVIA um áudio

**Esperado:**
- ❌ Nenhuma resposta com transcrição
- ✅ Log: `evolution_webhook.audio_transcription_skipped reason=config_disabled`
- ✅ Nenhuma chamada de API ao OpenAI

---

### Teste 3: Usuário com ambos ENABLED (comportamento normal)
**Setup:**
1. Ir em DB → `profiles`
2. Definir `transcreve_audio_enviado = true`
3. Definir `transcreve_audio_recebido = true`

**Ação:**
- Usuário recebe/envia áudio

**Esperado:**
- ✅ Resposta com transcrição (comportamento anterior funciona)
- ✅ Log: `evolution_webhook.audio_transcribed ...`
- ✅ Chamada de API ao OpenAI acontece

---

### Teste 4: Audio Longo (>45s) com config desabilitada
**Setup:**
1. `transcreve_audio_recebido = false`
2. `resume_audio = true`

**Ação:**
- Usuário recebe áudio com >45 segundos

**Esperado:**
- ❌ NÃO transcreve (config é respeitado, sem exceções)
- ✅ Log: `audio_transcription_skipped reason=config_disabled`
- ✅ Nenhuma resposta

---

### Teste 5: Lightning Reaction (⚡) - ainda funciona
**Setup:**
1. `send_on_reaction = true` (habilitado)
2. `transcreve_audio_recebido = false` (desabilitado)

**Ação:**
- Usuário reage com ⚡ a um áudio

**Esperado:**
- ✅ Transcrição é enviada (reação ⚡ ignora config, é ação explícita)
- ✅ Log: `evolution_webhook.reaction_audio_transcribed ...`

---

### Teste 6: Dedup - não retranscreve
**Setup:**
1. Audio foi recebido e transcrito anteriormente
2. Webhook é reenviado (duplicado)

**Ação:**
- Mesmo audio é processado novamente

**Esperado:**
- ✅ Não transcreve novamente
- ✅ Log: `evolution_webhook.audio_skipped reason=already_transcribed`
- ✅ Reutiliza transcrição anterior

---

## Como Executar Testes

### Opção 1: Staging
```bash
# Deploy para staging
docker build -t summi-worker:test vps/summi_worker/
docker run ... summi-worker:test

# Enviar webhooks via curl ou Postman
curl -X POST http://localhost:8000/webhooks/evolution \
  -H "Content-Type: application/json" \
  -d @test-payload.json
```

### Opção 2: Logs em Produção
```bash
# Monitorar logs
docker logs -f summi-worker | grep "audio_transcription"

# Filtrar por user
docker logs -f summi-worker | grep "lucasborges_5286"
```

### Opção 3: Query DB
```sql
-- Verificar config do usuário
SELECT id, instance_name, transcreve_audio_enviado, transcreve_audio_recebido
FROM profiles
WHERE id = 'user-id-here';

-- Ver últimas conversas
SELECT id, id_usuario, conversa
FROM chats
WHERE id_usuario = 'user-id-here'
ORDER BY modificado_em DESC
LIMIT 5;
```

---

## Métricas de Sucesso

✅ **Config agora é respeitada:**
- Users com transcription desabilitada não recebem respostas automáticas

✅ **Economia de API:**
- Menos chamadas ao OpenAI
- Logs mostram skips

✅ **Sem regressões:**
- Users com config ENABLED funcionam como antes
- Reação ⚡ funciona
- Dedup ainda funciona
- Audio longo com resume_audio ainda é processado... ❌ ESPERA

⚠️ **NOTA IMPORTANTE:**
Audio longo NÃO é mais uma exceção. Se config está desabilitada, o áudio NÃO é transcrito/resumido, mesmo que seja longo. Isso é intencional conforme decisão do usuário.

---

## Rollback se necessário

```bash
git revert 70cde05
git push origin main
```
