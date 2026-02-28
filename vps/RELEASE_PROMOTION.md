# Promocao de Release

## Objetivo

Promover um commit validado para a VPS sem editar servicos manualmente no Portainer.

## Pre-requisitos

- `gh` autenticado
- acesso SSH para a VPS
- se usar senha em vez de chave SSH, exporte `SUMMI_VPS_PASSWORD`

Opcionalmente:

- `SUMMI_VPS_HOST` para sobrescrever o host da VPS
- `SUMMI_VPS_USER` para sobrescrever o usuario SSH
- `GH_TOKEN` para sobrescrever o token obtido via `gh auth token`

## Fluxo recomendado

1. Garantir que o commit desejado ja esta em `main`.
2. Esperar os workflows abaixo concluirem com sucesso para esse SHA:
   - `Build & Push Summi Frontend`
   - `Build & Push Summi Worker`
3. Rodar a promocao:

```bash
python3 scripts/promote_release.py --sha <commit-sha> --deploy
```

4. Executar smoke test:
   - `dashboard`
   - `settings?tab=config`
   - `releases`
   - health do worker
5. Commitar e fazer push da stack atualizada, para manter o repo como fonte de verdade.

## O que o script faz

- verifica os workflows de build/push para o SHA informado
- atualiza `vps/portainer/stack.summi-complete.yml` com as imagens pinadas por SHA
- promove frontend e worker na VPS via `docker service update --with-registry-auth`
- imprime o estado final das imagens configuradas nos servicos principais

## Modo sem deploy

Se voce quiser apenas preparar a stack local:

```bash
python3 scripts/promote_release.py --sha <commit-sha>
```

## Observacao operacional

Nao usar `latest` como referencia de producao. O GHCR pode mover `latest` depois que um release ja foi validado, e isso quebra a rastreabilidade do deploy.
