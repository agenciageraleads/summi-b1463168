# Migracao n8n -> Worker (Summi)

## Objetivo
Migrar o Summi para stack propria (frontend + worker + Supabase + Evolution), mantendo o n8n em operacao ate o worker atingir paridade funcional (ou melhor) no fluxo principal.

## Dependencias Entre Workflows (n8n)

### Workflows analisados via MCP
- `CPLI2sYHIgQJqA5i` `[Summi] Transcreve Audio + Guarda no Banco de Dados - [1.4]`
- `XNPzajdDCyrcBpy9` `[Summi][BETA] Transcreve Audio + Guarda no Banco de Dados`
- `jmdPlc6U9RbwkLTh` `[Summi][Beta] Summi da Hora`
- `QXZ9xcw6joKKfPMZ` `[Summi][Subworkflow] Analise de Conversas e Priorizacao [1.2] SUPABASE`
- `zYomlQJ2uhw7qy76` `[Summi][Subworkflow] Analise de Conversas e Priorizacao - BETA`
- `ixDrnQN8dlvPMtV1` `[Summi] Summi da Hora [1.2]`
- `g9axRbcJiXF9tgvb` `[Summi] Apaga Mensagens`

### Referencias a outros workflows (fora da lista inicial)
- `5G93ntjXP0yhzxoU` (fornecido via JSON; nao listado no MCP):
  - Tipo: `errorWorkflow` compartilhado
  - Funcao:
    - `Error Trigger` -> envia WhatsApp via Evolution para alertar erro de fluxo
    - destino configurado: instance `lucasborges_5286`, numero `5562982435286`
  - Impacto na migracao:
    - nao bloqueia paridade funcional do Summi
    - util como referencia para observabilidade/alertas no worker

- `Uu4THVpPZQ86NzpY` (fornecido via JSON; nao listado no MCP):
  - Tipo: subworkflow de limpeza por prioridade
  - Referenciado em:
    - `jmdPlc6U9RbwkLTh` (`Apagar Mensagens com Prioridade Baixa1`)
    - `ixDrnQN8dlvPMtV1` (`Apagar Mensagens com Prioridade Baixa1`)
  - Funcao (intencao aparente):
    - recebe `id_usuario`
    - consulta perfil
    - se "Apaga Mensagens Não Importantes Automaticamente?" = `sim`
    - apaga chats de baixa prioridade (`prioridade < 2`)
  - Achado importante (JSON fornecido):
    - o `If1` aponta ambos os ramos para `getConversas`
    - `getConversas` filtra apenas `prioridade < 2` (sem `id_usuario`)
    - comportamento efetivo observado no desenho: risco de apagar conversas de baixa prioridade de todos os usuarios
  - Acao na migracao:
    - portar a intencao (segura) no worker: limpeza por `id_usuario` + `prioridade < 2`

### Dependencias internas (disponiveis)
- `jmdPlc6U9RbwkLTh` -> `QXZ9xcw6joKKfPMZ` (analise de conversas)
- `ixDrnQN8dlvPMtV1` -> `QXZ9xcw6joKKfPMZ` (analise de conversas)

## Inventario Funcional (n8n)

### 1) Fluxos principais de webhook (ingestao/transcricao)

#### `XNPzajdDCyrcBpy9` `[Summi][BETA] Transcreve Audio + Guarda no Banco de Dados`
Trigger:
- Webhook `POST /webhook/whatsapp-beta`

Integracoes:
- Evolution API (media base64, send text, send audio, connect instance)
- OpenAI (transcricao audio, resumo audio, analise imagem, analise reacao)
- Supabase (`profiles`, `chats`, `monitored_whatsapp_groups`)
- Redis (dedupe/lock por `processing:<messageId>`)

Capacidades:
- Normaliza payload Evolution (inclui `@lid`, grupo vs privado, autor da mensagem)
- Ignora mensagens da propria Summi (`IGNORE_REMOTE_JID` equivalente no n8n)
- Valida/remover conversa se "Apaga Mensagem ao Responder?" ativo
- Identifica tipo da mensagem:
  - texto
  - audio
  - imagem
  - reacao
- Audio:
  - baixa base64
  - transcreve
  - resume condicionalmente por duracao (`segundos_para_resumir`) + `resume_audio`
  - envia transcricao/resumo na conversa ou no privado (`send_private_only`)
  - respeita preferencias `transcreve_audio_enviado` / `transcreve_audio_recebido`
  - opcao de somente ao reagir (`send_on_reaction`)
- Reacoes:
  - identifica emoji (inclusive logica LLM + checagem de `⚡`)
  - transcreve audio reagido
- Imagem:
  - baixa base64
  - descreve imagem com OpenAI
- Grupos:
  - separa grupo x privado
  - consulta `monitored_whatsapp_groups`
  - trata mencoes
- Persistencia:
  - salva/atualiza `chats.conversa` (string acumulada com prefixo `- Nome: msg`)
  - cria ou atualiza chat no Supabase

#### `CPLI2sYHIgQJqA5i` `[Summi] Transcreve Audio + Guarda no Banco de Dados - [1.4]`
Trigger:
- Webhook `POST /webhook/whatsapp`

Integracoes:
- Evolution API
- OpenAI
- Supabase (`profiles`, `subscribers`, `chats`, `monitored_whatsapp_groups`)
- Redis

Capacidades:
- Muito semelhante ao BETA, com variacoes de gating por assinante ativo (`subscribers`)
- Fluxo legado/producao do webhook principal

### 2) Analise/Priorizacao (subworkflows)

#### `QXZ9xcw6joKKfPMZ` `[Summi][Subworkflow] Analise de Conversas e Priorizacao [1.2] SUPABASE`
Triggers:
- `executeWorkflow` (input `id_usuario`)
- Webhook `POST /webhook/analisa-mensagens`

Integracoes:
- Supabase (`profiles`, `chats`)
- OpenAI (LLM + structured output)

Capacidades:
- Busca perfil e parametros (temas urgentes/importantes, blacklist)
- Busca chats do usuario
- Analisa somente chats alterados ou sem contexto (`modificado_em > analisado_em` ou `contexto` vazio)
- Ignora mensagens da Summi (remote_jid especifico)
- Atualiza `prioridade`, `contexto`, `analisado_em`
- Retorna dataset resumido para uso no Summi da Hora

#### `zYomlQJ2uhw7qy76` `[Summi][Subworkflow] Analise de Conversas e Priorizacao - BETA`
Triggers:
- `executeWorkflow` (input `id_usuario`)
- Webhook dedicado (UUID path)

Integracoes:
- Supabase (`profiles`, `chats`)
- OpenAI

Capacidades:
- Mesmo papel do subworkflow de analise
- Variacoes de schema/output (`prioridade/contexto` minusculos no output parser)
- Filtragem de perfil por `role=admin` em trecho beta

### 3) Summi da Hora (scheduler)

#### `jmdPlc6U9RbwkLTh` `[Summi][Beta] Summi da Hora`
Trigger:
- `Schedule Trigger` (horario)

Integracoes:
- Supabase (`subscribers`, `profiles`)
- `executeWorkflow` para analise (`QXZ9...`)
- `executeWorkflow` para apagar mensagens (`Uu4TH...`, nao disponivel no MCP)
- OpenAI (remodelar resumo + texto para audio + TTS)
- Evolution API (enviar resumo texto e audio)

Capacidades:
- Itera assinantes ativos
- Filtra usuarios `role=beta`
- Analisa conversas antes de montar o resumo
- Valida horario comercial (8-18)
- Ordena/filtra prioridades
- Gera resumo com links `wa.me`
- Envia texto e opcionalmente audio (`Summi em Audio?`)
- Dispara limpeza de mensagens de baixa prioridade por subworkflow

#### `ixDrnQN8dlvPMtV1` `[Summi] Summi da Hora [1.2]`
Trigger:
- `Schedule Trigger` (horario)

Integracoes:
- Supabase (`subscribers`, `profiles`)
- `executeWorkflow` para analise (`QXZ9...`)
- `executeWorkflow` para apagar mensagens (`Uu4TH...`, nao disponivel no MCP)
- OpenAI (remodelar resumo + TTS)
- Evolution API

Capacidades:
- Mesmo padrao do beta, com variacoes de filtro de usuarios/instance (ex.: nomes de instancia fixos em alguns nodes)
- Em uma versao filtra apenas prioridades `2` e `3`

### 4) Limpeza

#### `g9axRbcJiXF9tgvb` `[Summi] Apaga Mensagens`
Trigger:
- `Schedule Trigger` (21h)

Integracoes:
- Supabase (`subscribers`, `profiles`, `chats`)

Capacidades:
- Itera assinantes ativos
- Busca perfis admin
- Deleta chats do usuario

Observacao:
- Este workflow nao e o mesmo subworkflow `Uu4TH...` chamado pelos Summi da Hora (ID diferente). E uma rotina paralela de limpeza diaria.

## Matriz de Paridade (n8n x Worker Atual)

Legenda:
- `OK`: portado com comportamento suficiente
- `PARCIAL`: existe, mas com gaps relevantes
- `NAO`: nao portado

### Core de Plataforma
- Frontend (fora do Lovable): `OK`
  - Frontend containerizado em GHCR + Nginx + Traefik
- Supabase Edge Functions com fallback n8n -> worker por URL: `OK`
  - Fallback por configuracao (nao failover automatico)
- Deploy VPS / Portainer / GHCR: `OK`

### Webhook / Ingestao
- Receber webhook Evolution (`messages.upsert`): `PARCIAL`
  - Worker recebe e normaliza payload 2.3.7 (inclui envelope `body`)
  - Armazena conversa em `chats.conversa` como JSON array de eventos
  - Gaps: sem fluxo completo de tipos, grupos, reacoes, locks Redis, preferencias por perfil

- Persistencia legada `conversa` string acumulada (`- Nome: msg`): `NAO`
  - Worker atual usa JSON array; convive com legado, mas nao replica formato do n8n

- Filtro de remetente/ignorar Summi: `PARCIAL`
  - Worker ignora `remote_jid` configurado no momento da analise/scheduler
  - Gaps no fluxo de ingestao completo (fromMe/regras finas)

### Midia e Interacoes
- Transcricao de audio no webhook: `NAO`
- Resumo condicional de audio por duracao: `NAO`
- Descricao de imagem (vision): `NAO`
- Transcricao por reacao (`⚡`): `NAO`
- Dedupe/lock por `messageId` (Redis): `NAO`

### Regras por Perfil / Negocio
- `send_private_only`: `NAO`
- `transcreve_audio_enviado` / `transcreve_audio_recebido`: `NAO`
- `send_on_reaction`: `NAO`
- `apaga mensagem ao responder`: `NAO`
- Grupos monitorados (`monitored_whatsapp_groups`): `NAO`
- Mencoes em grupos: `NAO`

### Analise/Priorizacao
- Endpoint de analise sob demanda (`/api/analyze-messages`): `OK`
- Analise de chats alterados/pendentes: `OK` (aproximada por consulta + filtro em memoria)
- Atualizacao `prioridade/contexto/analisado_em`: `OK`
- Uso de temas urgentes/importantes do perfil: `OK`
- Compatibilidade plena com outputs/parsers beta/legacy: `PARCIAL`
  - Funciona no worker, mas nao replica cada diferenca de subworkflow beta vs supabase

### Summi da Hora (scheduler)
- Agendamento proprio na VPS: `OK`
- Envio de resumo texto: `OK`
- Envio de resumo em audio (TTS): `OK`
- Respeitar horario comercial: `OK`
- Selecao de chats prioridade 2/3: `OK`
- Rodar analise antes do resumo (igual n8n): `OK` (implementado no branch `codex/vps-migration`)

- Limpeza de mensagens baixa prioridade apos envio: `OK` (implementado no branch `codex/vps-migration`, com filtro por `id_usuario`)

### Observabilidade / Operacao
- Health endpoint `/health`: `OK`
- Healthchecks de stack (branch `codex/vps-migration`): `OK` (a aplicar via redeploy)
- Logs suficientes para auditoria de evento por `messageId`: `PARCIAL`
- DLQ / retries / poison message handling: `NAO`

## Dependencias Externas (ja recebidas por JSON)

Recebidas e analisadas:
1. `5G93ntjXP0yhzxoU` (error workflow compartilhado)
2. `Uu4THVpPZQ86NzpY` (subworkflow de apagar mensagens por prioridade)

Inventario de dependencias do n8n agora esta funcionalmente completo para o escopo Summi.

## Plano de Acao da Migracao (executavel)

### Fase 0: Congelamento de corte (ja em andamento)
- Manter webhook principal da instancia no n8n (`whatsapp-beta` / `whatsapp`)
- Usar worker em paralelo para:
  - frontend
  - analise via endpoint
  - scheduler/Summi da Hora (com validacao)
- Verificar:
  - producao segue sem regressao
  - logs e metricas do worker sao observaveis

### Fase 1: Paridade do webhook principal (MVP funcional do `whatsapp-beta`)
Objetivo:
- Worker reproduzir o caminho critico do n8n principal sem perda operacional.

Escopo minimo (ordem):
1. Normalizacao completa do payload Evolution
   - texto, audio, imagem, reacao
   - grupo/privado, `@lid`, `participant`, `authorName`
   - `messageId`, `fromMe`, `messageTimestamp`
2. Dedupe por `messageId`
   - Redis (ou tabela leve no Supabase com TTL)
3. Persistencia compatível
   - manter suporte ao formato legado `conversa` string (compat)
   - opcionalmente gravar paralelo em JSON (`conversa_json`) para transicao
4. Regras basicas por perfil
   - ignore Summi
   - `send_private_only`
   - `transcreve_audio_enviado` / `recebido`
   - `segundos_para_resumir`, `resume_audio`
5. Transcricao + resumo de audio
6. Descricao de imagem
7. Reacao `⚡` para transcrever audio reagido

Criterio de aceite:
- Mesma mensagem (texto/audio/imagem/reacao) gera efeito equivalente ao n8n em 5 cenarios de teste reais.

### Fase 2: Paridade do Summi da Hora
Objetivo:
- Worker superar n8n no fluxo horario (mais simples de operar, mesmo resultado).

Escopo:
1. Rodar `analyze_user_chats()` dentro do job horario antes de montar resumos
2. Implementar limpeza de mensagens de baixa prioridade apos envio
   - reproduzir intencao do subworkflow `Uu4TH...` com seguranca (por `id_usuario`)
3. Ajustar filtros de role/plano (beta/user/admin) conforme fluxos atuais
4. Guardar trilha de execucao por usuario (log estruturado)

Criterio de aceite:
- 3 ciclos horarios consecutivos com resultados equivalentes ao n8n em usuarios de teste.

### Fase 3: Shadow Mode do webhook (sem corte)
Objetivo:
- Receber os mesmos eventos no worker, comparar saida com n8n sem afetar producao.

Escopo:
1. Duplicar entrega de webhook (ou replay controlado)
2. Comparar:
   - persistencia (`chats`)
   - transcricoes enviadas
   - resumos enviados
3. Registrar divergencias por tipo de mensagem

Criterio de aceite:
- >= 95% equivalencia em cenarios reais de 48h
- 0 regressao critica (mensagem perdida, loop, envio indevido)

### Fase 4: Cutover gradual
Objetivo:
- Mover instancia(s) para webhook do worker sem risco de parada.

Sequencia:
1. Canario (1 instancia de teste ou baixo risco)
2. Validacao 24-48h
3. Cutover de instancias restantes
4. Manter fallback n8n configuravel por env por periodo de observacao

Rollback:
- Reapontar webhook da instance para n8n
- Limpar envs worker nas Edge Functions (se necessario)
- Manter imagens anteriores no GHCR para rollback rapido

## Execucao Imediata Recomendada (proxima sprint)

### Sprint A (alto impacto, baixo risco de regressao)
- [x] Portar dedupe por `messageId` (Redis) (opcional via `REDIS_URL`)
- [x] Expandir normalizacao de payload (audio/imagem/reacao/grupo) (best-effort)
- [x] Adicionar logs estruturados por evento (`instance`, `messageId`, `type`, `path`)
- [x] Fazer scheduler rodar analise antes do resumo
- [x] Aplicar limpeza de baixa prioridade no scheduler (por `id_usuario`, com flag de perfil)
- [ ] Aplicar hardening Nginx + healthchecks (branch `codex/vps-migration`)

Verificacao:
- `POST /webhooks/evolution-analyze` com payloads reais de texto/audio/imagem/reacao (mascarados)
- confirmar persistencia + analise + ausencia de duplicidade

### Sprint B (paridade funcional do `whatsapp-beta`)
- [x] Transcricao de audio + resumo condicional (best-effort, validar endpoint de media Evolution)
- [x] Descricao de imagem (best-effort, validar endpoint de media Evolution)
- [x] Fluxo por reacao `⚡` (best-effort)
- [x] Regras `send_private_only` e preferencias de transcricao (subset critico)
- [ ] Persistencia compativel com legado (ou adaptador de leitura)

Observacao de endurecimento da Sprint B:
- Ainda falta validacao em payloads reais de audio/imagem/reacao na Evolution `2.3.7`
- Endpoint de `get-media-base64` foi implementado com multiplas tentativas (best-effort)
- Envio com quoted message (reply) ainda nao foi portado

## Decisoes de Arquitetura (atuais)
- Nao cortar n8n antes de paridade do webhook principal
- Migracao por ondas com shadow mode
- Manter fallback em Edge Functions por configuracao
- Separar frontend / worker-api / scheduler (mesma stack, servicos distintos)
