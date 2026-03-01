# Changelog Interno VPS

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
