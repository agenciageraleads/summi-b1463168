# Changelog Interno VPS

## 2026-02-28

- Producao fixada por SHA, sem uso de `latest`, para evitar drift entre o que foi validado e o que o GHCR publica depois.
- Frontend pinado em `ghcr.io/agenciageraleads/summi-b1463168-frontend:a06ab4ebe92f2135864a48bb4e1c8015d0ead9f4`.
- Worker/API, scheduler e filas pinados em `ghcr.io/agenciageraleads/summi-b1463168-worker:a06ab4ebe92f2135864a48bb4e1c8015d0ead9f4`.
- Hotpatches temporarias removidas da VPS depois da promocao para imagens oficiais.
- Validacoes de fechamento: `dashboard`, `settings?tab=config` e `releases` funcionando apos a promocao.
