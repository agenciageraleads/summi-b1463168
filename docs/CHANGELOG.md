# 📋 Changelog - Summi

Todas as mudanças notáveis neste projeto serão documentadas aqui.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
e este projeto segue [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.2.3] - 2026-03-02

### Added
- ✨ Deduplicação de subscribers por `user_id` (migration `20260302121500`)
- ✨ Novos unit tests para Python worker (`test_app.py`)

### Changed
- 🔄 Refinamentos no `Dockerfile` do worker
- 🔄 Melhorias no script `promote_release.py`
- 🔄 Atualização de Edge Functions para melhor validação

### Fixed
- 🐛 Audio dedupe floor pinning para evitar re-processamento

---

## [1.2.2] - 2026-02-28

### Added
- ✨ Suporte aprimorado a áudio com fallback automático
- ✨ Métricas de confiança para transcrição (confidence scores)

### Changed
- 🔄 Melhoria de qualidade em transcrição de áudio
- 🔄 Otimização de prompts para GPT-4o-mini

### Fixed
- 🐛 Tratamento de edge cases em áudio curto
- 🐛 Fallback para Whisper quando confiança < threshold

---

## [1.2.1] - 2026-02-27

### Added
- ✨ Suporte a áudio privado em resumos

### Fixed
- 🐛 Quoting correto em respostas de áudio
- 🐛 Replay correto de resumos

---

## [1.2.0] - 2026-02-25

### Added
- ✨ Sistema de referência com rewards
- ✨ Novo modelo de dados `referrals` com rastreamento de status

### Changed
- 🔄 Melhorias na estrutura de migrations

---

## [1.1.x] - Versões Anteriores

### [1.1.5] - 2026-02-20
- ✨ Admin dashboard com gerenciamento de usuários

### [1.1.4] - 2026-02-15
- ✨ Integração com Stripe para billing

### [1.1.3] - 2026-02-10
- ✨ Business hours configurável por usuário

### [1.1.2] - 2026-02-05
- ✨ Análise de prioridade com GPT-4o

### [1.1.1] - 2026-02-01
- ✨ Webhook handling do Evolution API

### [1.1.0] - 2026-01-25
- ✨ Release initial do worker Python
- ✨ Integração com OpenAI

---

## [1.0.0] - 2026-01-01

### Added
- ✨ Frontend React com dashboard
- ✨ Autenticação com Supabase
- ✨ Suporte básico a WhatsApp (Evolution API)
- ✨ Database schema com 20+ migrations

---

## 📅 Formato de Versão

```
[MAJOR].[MINOR].[PATCH]

MAJOR: Breaking changes
MINOR: Nova funcionalidade (backward compatible)
PATCH: Bug fixes
```

**Exemplo:**
- `1.0.0` → `1.1.0`: Nova feature (MINOR)
- `1.1.0` → `1.1.1`: Bug fix (PATCH)
- `1.1.0` → `2.0.0`: Breaking change (MAJOR)

---

## 🔄 Como atualizar CHANGELOG

Quando fazer release:

1. Crie seção `[X.Y.Z] - YYYY-MM-DD`
2. Liste mudanças em:
   - **Added:** ✨ Novas features
   - **Changed:** 🔄 Mudanças existentes
   - **Deprecated:** ⚠️ Será removido em futuro
   - **Removed:** ❌ Removido nesta versão
   - **Fixed:** 🐛 Bug fixes
   - **Security:** 🔒 Correções de segurança

3. Use emoji para clareza visual

**Exemplo de entrada:**
```markdown
## [1.3.0] - 2026-03-15

### Added
- ✨ Integração com Telegram
- ✨ Dashboard de analytics avançado

### Changed
- 🔄 Refactor do pipeline de análise

### Fixed
- 🐛 Problema com transcrição de áudio longo
```

---

## 🔗 Links Úteis

- [Releases no GitHub](https://github.com/summi/summi-b1463168/releases)
- [Commits recentes](https://github.com/summi/summi-b1463168/commits/main)
- [Issues abertos](https://github.com/summi/summi-b1463168/issues)

---

**Última atualização:** 2026-03-02
**Versão atual:** 1.2.3
