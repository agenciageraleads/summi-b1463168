# Rollout Producao - Correcao Summi da Hora e Resumo Diario

Data de referencia: 2026-03-05
Escopo: aplicacao global

## Objetivo

Aplicar em producao as correcoes para:
- nao enviar mensagem horaria quando nao houver prioridade 2/3;
- evitar reanalise em loop por efeito colateral de `modificado_em`;
- garantir resumo diario com trava anti-duplicacao;
- rodar resumo diario no horario esperado (19:00 America/Sao_Paulo).

## Estado confirmado antes do rollout

- Migrations pendentes no remoto:
  - `20260303120000_create_blog_posts.sql`
  - `20260304090000_add_cover_image_to_blog_posts.sql`
  - `20260304120000_add_daily_summary_tracking.sql`
  - `20260304130000_create_cost_tracking.sql`
  - `20260305113000_add_chats_ultimo_evento_em.sql`
- `public.blog_posts` ja existe com 6 seeds (slug existente), e `cover_image_url` ja existe.
- `profiles.ultimo_summi_diario_em` ainda nao existe.
- `chats.ultimo_evento_em` ainda nao existe.
- `user_costs` e `cost_logs` ainda nao existem.

## Risco principal

`20260303120000_create_blog_posts.sql` possui seed com `INSERT` sem `ON CONFLICT`.
Se rodar `supabase db push --linked` diretamente, a migration pode falhar por duplicidade de slug e bloquear as migrations que realmente precisamos.

## Plano de execucao (ordem obrigatoria)

## 1) Banco - regularizar historico e aplicar pendentes necessarias

Precondicao: ter a senha atual do Postgres remoto em `SUPABASE_DB_PASSWORD`.

```bash
export SUPABASE_DB_PASSWORD='***'
```

1. Conferir pendencias:

```bash
cd /Users/Lucas-Lenovo/Summi/summi-b1463168
supabase migration list --linked -p "$SUPABASE_DB_PASSWORD"
```

2. Marcar como aplicadas as migrations de blog que ja estao efetivamente no remoto:

```bash
supabase migration repair --linked -p "$SUPABASE_DB_PASSWORD" --status applied 20260303120000 20260304090000
```

3. Aplicar as restantes:

```bash
supabase db push --linked -p "$SUPABASE_DB_PASSWORD"
```

4. Validar objetos criados (exemplos):

```bash
# deve retornar 200
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  "${SUPABASE_URL}/rest/v1/profiles?select=ultimo_summi_diario_em&limit=1"

curl -s -o /dev/null -w "%{http_code}\n" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  "${SUPABASE_URL}/rest/v1/chats?select=ultimo_evento_em&limit=1"
```

## 2) Deploy - worker/scheduler por SHA

1. Garantir commit em `main` com estas alteracoes:
- `vps/summi_worker/summi_jobs.py`
- `vps/summi_worker/app.py`
- `vps/summi_worker/scheduler.py`
- `vps/summi_worker/config.py`
- `supabase/migrations/20260305113000_add_chats_ultimo_evento_em.sql`
- `vps/portainer/stack.summi-complete.yml`

2. Esperar workflows concluirem com sucesso para o SHA:
- `Build & Push Summi Worker`
- (se frontend mudou no mesmo SHA) `Build & Push Summi Frontend`

3. Promover o SHA:

```bash
cd /Users/Lucas-Lenovo/Summi/summi-b1463168
SUMMI_VPS_PASSWORD='***' python3 scripts/promote_release.py --sha <commit-sha> --deploy
```

## 3) Scheduler - horario diario

No ambiente do scheduler, manter:

```env
ENABLE_DAILY_JOB=true
DAILY_SUMMARY_HOUR_UTC=22
DAILY_SUMMARY_TIMEZONE=UTC
```

Observacao: com UTC, `22:00` equivale a `19:00` em `America/Sao_Paulo` em 2026-03-05.

## 4) Validacao funcional (aceite)

1. Cenário sem itens 2/3 no horario:
- esperado: nenhum envio horario;
- esperado: log de `skipped_no_priority_items`.

2. Nova mensagem relevante:
- esperado: chat reentra quando `ultimo_evento_em > analisado_em`.

3. Sem nova mensagem (apenas update interno):
- esperado: chat nao reentra no ciclo horario.

4. Diario em 19:00 Sao Paulo:
- esperado: 1 resumo diario;
- esperado: sem duplicacao no mesmo dia (`ultimo_summi_diario_em`).

## 5) Observabilidade (primeiras 24h)

Acompanhar logs do scheduler e worker para:
- `Hourly summary done:` com `skipped_no_priority_items`;
- `Daily summary done:` com `sent`/`skipped_already_sent_today`;
- ausencia de mensagens fallback "Voce nao tem nenhuma demanda importante...".

## Rollback

- Banco: mudancas sao aditivas (colunas/tabelas novas), sem necessidade de rollback imediato.
- Aplicacao: rollback por SHA anterior homologado:

```bash
SUMMI_VPS_PASSWORD='***' python3 scripts/promote_release.py --sha <sha-anterior> --deploy
```

- Reexecutar smoke test apos rollback.
