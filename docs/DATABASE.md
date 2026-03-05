# 💾 Database Schema

**Última atualização:** 2026-03-02
**Arquivo:** `/supabase/migrations/`

---

## 📊 Tabelas Principais

### 1. `users` (Supabase Auth)

Usuários Summi autenticados.

```sql
id (UUID, PK)
email (text)
password_hash (encrypted by Supabase)
role (user, admin)
created_at (timestamp)
```

**Notas:**
- Gerenciado automaticamente por Supabase Auth
- RLS policies baseadas em `auth.uid()`

---

### 2. `profiles`

Dados e configurações do usuário.

```sql
id (UUID, FK → users.id)
username (text)
avatar_url (text)
business_hours_start (int, default: 8)
business_hours_end (int, default: 18)
apenas_horario_comercial (bool, default: false)
updated_at (timestamp)
created_at (timestamp)
```

**Índices:** `username` (unique)

---

### 3. `instances`

Contas WhatsApp conectadas.

```sql
id (UUID, PK)
usuario_id (UUID, FK → users.id)
instance_name (text)                  # Nome no Evolution API
phone_number (text)
is_connected (bool)
last_webhook (timestamp)
config (jsonb)                        # Custom settings
created_at (timestamp)
```

**Índices:** `usuario_id`, `instance_name` (unique per user)

---

### 4. `subscribers` (NEW)

Relação usuário-instância (deduplicado por user_id).

```sql
id (UUID, PK)
usuario_id (UUID, FK → users.id)
instancia_id (UUID, FK → instances.id)
created_at (timestamp)

UNIQUE(usuario_id, instancia_id)
```

**Uso:** Evita subscribers duplicados por user_id.

---

### 5. `chats`

Mensagens do WhatsApp.

```sql
id (UUID, PK)
instance_id (UUID, FK → instances.id)
usuario_id (UUID, denormalized)
conversa (text)                       # Mensagem ou transcrição
prioridade (enum: IMPORTANTE, URGENTE, NORMAL, NULL)
contexto (text)                       # Análise OpenAI
analisado_em (timestamp)              # NULL se não analisado
audio_seconds (float)
audio_transcription_used_fallback (bool)
criado_em (timestamp)
```

**Índices:**
- `usuario_id`
- `instance_id`
- `created_at` (DESC para queries recentes)
- `prioridade` (para filtros)

**RLS:** Usuário vê só suas mensagens (via usuario_id)

---

### 6. `subscriptions`

Planos de preço e billing.

```sql
id (UUID, PK)
usuario_id (UUID, FK → users.id, unique)
stripe_subscription_id (text)
plan (enum: Starter, Professional, Enterprise)
status (enum: active, cancelled, past_due)
current_period_start (timestamp)
current_period_end (timestamp)
created_at (timestamp)
```

**RLS:** Usuário vê só sua subscription

---

### 7. `referrals`

Sistema de referência.

```sql
id (UUID, PK)
referred_by (UUID, FK → users.id)
referred_to (UUID, FK → users.id)
status (enum: active, inactive)
reward_amount (decimal)
claimed_at (timestamp)
created_at (timestamp)
```

---

### 8. `announcements`

Sistema de notificações.

```sql
id (UUID, PK)
titulo (text)
conteudo (text)
tipo (enum: info, warning, alert)
ativo (bool)
criado_em (timestamp)
```

---

## 📈 Relacionamentos

```
users (1) ──── (N) profiles
users (1) ──── (N) instances
users (1) ──── (N) subscribers ──── (N) instances
users (1) ──── (N) chats

instances (1) ──── (N) chats
instances (1) ──── (N) subscribers

users (1) ──── (1) subscriptions
users (1) ──── (N) referrals (referred_by)
users (1) ──── (N) referrals (referred_to)
```

---

## 🔒 Row Level Security (RLS)

### Exemplo: `chats`

```sql
-- Usuário vê só suas mensagens
CREATE POLICY "users_can_see_their_own_chats" ON chats
FOR SELECT USING (usuario_id = auth.uid());

-- Admin vê tudo
CREATE POLICY "admin_can_see_all_chats" ON chats
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Usuário não pode inserir (worker faz isso)
-- Apenas worker com service role pode INSERT
```

---

## 🗂️ Migrations (51+)

**Localização:** `/supabase/migrations/`

**Padrão de naming:**
```
YYYYMMDDHHMMSS_description.sql
```

**Exemplos:**
- `20260302121500_dedupe_subscribers_by_user_id.sql` (NEW)
- `20260228143000_backfill_audio_seconds.sql`
- `20260227075000_add_metrics_and_frequency.sql`

**Rodar migrations local:**
```bash
supabase db reset  # Reseta e roda todas as migrations
```

---

## 🔄 Fluxo de Dados

### Quando mensagem chega:

```
1. Evolution API → Webhook HTTP POST
2. Worker Python → INSERT chats (conversa, audio_seconds, etc)
3. OpenAI → Analyze (prioridade, contexto)
4. Worker → UPDATE chats (prioridade, contexto, analisado_em)
5. Supabase Realtime → Notifica frontend
6. Frontend React → Exibe no dashboard
```

### Quando é hora do "Summi da Hora":

```
1. Cron job (hourly)
2. SELECT chats WHERE usuario_id=X AND prioridade IN (IMPORTANTE, URGENTE) AND criado_em > 1h
3. OpenAI summarize
4. Evolution API → Send via WhatsApp
```

---

## 📊 Queries Comuns

### Mensagens de um usuário (últimas 24h)

```sql
SELECT id, conversa, prioridade, analisado_em, criado_em
FROM chats
WHERE usuario_id = $1
  AND criado_em > now() - interval '24 hours'
ORDER BY criado_em DESC;
```

### Mensagens não analisadas

```sql
SELECT id, conversa
FROM chats
WHERE usuario_id = $1
  AND analisado_em IS NULL
LIMIT 10;
```

### Estatísticas por prioridade

```sql
SELECT prioridade, COUNT(*) as count
FROM chats
WHERE usuario_id = $1
  AND criado_em > now() - interval '7 days'
GROUP BY prioridade;
```

---

## 🔐 Performance

### Índices Críticos

```sql
CREATE INDEX idx_chats_usuario_id ON chats(usuario_id);
CREATE INDEX idx_chats_instance_id ON chats(instance_id);
CREATE INDEX idx_chats_criado_em_desc ON chats(criado_em DESC);
CREATE INDEX idx_chats_prioridade ON chats(prioridade);

CREATE INDEX idx_instances_usuario_id ON instances(usuario_id);
CREATE INDEX idx_subscribers_usuario_id ON subscribers(usuario_id);
```

---

## 🛠️ Administração

### Backup

```bash
supabase db dump > backup.sql
```

### Resetar dados (dev only)

```bash
supabase db reset  # Roda todas as migrations do zero
```

---

## 📚 Referências

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Migrations Best Practices](https://supabase.com/docs/guides/cli/managing-db/migrations)

---

**Ver também:** [`ARCHITECTURE.md`](./ARCHITECTURE.md) para diagrama de dados geral.
