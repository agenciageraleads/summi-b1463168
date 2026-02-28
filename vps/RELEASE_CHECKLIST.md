# Release Checklist

## 1. Preparacao

- Confirmar que o commit da release esta em `main`.
- Confirmar que o diff da release foi revisado.
- Confirmar que o build local relevante foi validado.

## 2. Artefatos

- Esperar os workflows abaixo concluirem com sucesso para o SHA da release:
  - `Build & Push Summi Frontend`
  - `Build & Push Summi Worker`

## 3. Banco

- Se a release tiver migration, executar:

```bash
cd /Users/Lucas-Lenovo/Summi/summi-b1463168
supabase db push --linked
```

- Se `supabase db push --linked` nao vier limpo, parar e inspecionar:

```bash
supabase migration list
```

## 4. Promocao

- Promover a release por SHA:

```bash
cd /Users/Lucas-Lenovo/Summi/summi-b1463168
SUMMI_VPS_PASSWORD='...' python3 scripts/promote_release.py --sha <commit-sha> --deploy
```

- Nao promover `latest` manualmente.

## 5. Smoke Test

- Validar:
  - `/dashboard`
  - `/settings?tab=config`
  - `/releases`
  - health do worker
  - fluxo critico alterado na release

## 6. Verificacao Operacional

- Confirmar no Swarm que os servicos ficaram pinados no SHA correto:
  - `summi_summi-frontend`
  - `summi_summi-worker-api`
  - `summi_summi-worker-scheduler`

- Confirmar que nao houve erro novo relevante nos logs.

## 7. Rollback

- Se houver erro critico, voltar para o SHA anterior homologado:

```bash
cd /Users/Lucas-Lenovo/Summi/summi-b1463168
SUMMI_VPS_PASSWORD='...' python3 scripts/promote_release.py --sha <sha-anterior> --deploy
```

- Repetir o smoke test depois do rollback.

## 8. Registro

- Atualizar `vps/CHANGELOG_INTERNAL.md` se houver decisao operacional relevante.
- Manter `vps/portainer/stack.summi-complete.yml` como fonte de verdade da promocao homologada.
