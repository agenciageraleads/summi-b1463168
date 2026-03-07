# Changelog Interno VPS

## 2026-03-07

### Deploy de Unificação e Fixes

- Release promovido para o commit `f04c5a25ba3156b47ccc8253ac77a64722a122ab`.
- Frontend pinado em `ghcr.io/agenciageraleads/summi-b1463168-frontend:f04c5a25ba3156b47ccc8253ac77a64722a122ab`.
- Worker/API, scheduler e filas pinados em `ghcr.io/agenciageraleads/summi-b1463168-worker:f04c5a25ba3156b47ccc8253ac77a64722a122ab`.
- Funcionalidades consolidadas:
  - Fix crítico: Resolvido o problema de carregamento infinito da landing page (adicionado `HelmetProvider`).
  - Funcionalidade restaurada: Rotas e menu de Blog (CMS) agora presentes na build oficial.
  - Correção na esteira CI/CD: Removida a compilação multi-arch (ARM64) temporariamente para contornar crash no simulador QEMU e estabilizar o tempo de build em ~1-3 minutos.

### Início da Integração de Custos e Crescimento

- Release promovido para o commit `534d18757c58c734baecf51d3124c6e61667683e`.
- Frontend pinado em `ghcr.io/agenciageraleads/summi-b1463168-frontend:534d18757c58c734baecf51d3124c6e61667683e`.
- Worker/API, scheduler e filas pinados em `ghcr.io/agenciageraleads/summi-b1463168-worker:534d18757c58c734baecf51d3124c6e61667683e`.
- Migrations `20260307120000_wave1_cost_controls.sql` e `20260307133000_add_growth_tracking.sql` aplicadas no projeto remoto via Management API do Supabase e registradas em `supabase_migrations.schema_migrations`.
- Edge Functions `admin-billing-costs`, `track-growth-event`, `create-checkout`, `handle-signup`, `customer-portal` e `stripe-webhook` redeployadas em producao.
- Runtime do worker alinhado manualmente apos a promocao para refletir a stack homologada:
  - `ENABLE_DAILY_JOB=false`
  - `ENABLE_ANALYSIS_QUEUE=false`
  - `ENABLE_SUMMARY_QUEUE=false`
  - `ENABLE_IMAGE_DESCRIPTION=false`
  - `ENABLE_SUMMI_AUDIO=false`
  - `REQUIRE_REDIS=true`
  - `UVICORN_WORKERS=1`
  - filas `analysis` e `summary` em `0/0`
- Observacao operacional: `scripts/promote_release.py` atualmente promove apenas imagem por `docker service update`; quando a release altera `env`, `args` ou `replicas`, a spec precisa ser sincronizada explicitamente na VPS.

## 2026-03-01

- Release promovido para o commit `7e42bfacd6b354d610d675b767c77644ffc574ed`.
- Frontend pinado em `ghcr.io/agenciageraleads/summi-b1463168-frontend:7e42bfacd6b354d610d675b767c77644ffc574ed`.
- Worker/API, scheduler e filas pinados em `ghcr.io/agenciageraleads/summi-b1463168-worker:7e42bfacd6b354d610d675b767c77644ffc574ed`.
- `Summi da Hora` blindado para nao usar LLM no fallback sem demandas, reduzindo risco de audio com conteudo inventado.
- Webhook passou a ignorar a conversa interna da propria Summi para evitar auto-eco e reprocessamento indevido.
- Resumo de audio do worker agora alterna entre resumo direto e estrutura por assunto/atividades, sem criar acoes quando elas nao existem.
- Edge Functions `analyze-messages`, `evolution-api-handler`, `evolution-generate-qr` e `promote-user-beta` foram redeployadas sem fallback para `WEBHOOK_N8N_*`, consolidando o corte total do n8n.

## 2026-02-28

- Producao fixada por SHA, sem uso de `latest`, para evitar drift entre o que foi validado e o que o GHCR publica depois.
- Frontend pinado em `ghcr.io/agenciageraleads/summi-b1463168-frontend:a06ab4ebe92f2135864a48bb4e1c8015d0ead9f4`.
- Worker/API, scheduler e filas pinados em `ghcr.io/agenciageraleads/summi-b1463168-worker:a06ab4ebe92f2135864a48bb4e1c8015d0ead9f4`.
- Hotpatches temporarias removidas da VPS depois da promocao para imagens oficiais.
- Validacoes de fechamento: `dashboard`, `settings?tab=config` e `releases` funcionando apos a promocao.
