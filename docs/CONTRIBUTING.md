# 👥 Guia de Contribuição

**Versão:** 1.2.3
**Última atualização:** 2026-03-02

---

## 🎯 Como Contribuir

Todos são bem-vindos! Seja bug fix, feature ou documentação, siga os passos abaixo.

---

## 🚀 Workflow de Contribuição

### 1. Setup Local

```bash
# Clone e instale (veja docs/SETUP_LOCAL.md)
git clone <REPO_URL>
cd summi-b1463168
npm install
npm run dev
```

### 2. Crie uma Branch

```bash
git checkout -b feature/sua-feature
# ou
git checkout -b fix/seu-bug
```

**Naming Convention:**
- `feature/...` - Nova funcionalidade
- `fix/...` - Bug fix
- `docs/...` - Documentação
- `refactor/...` - Refatoração (sem mudança funcional)
- `chore/...` - Limpeza, dependências, etc

### 3. Faça suas Mudanças

**Siga os padrões:**
- 📖 Leia [`CODING_STANDARDS.md`](./CODING_STANDARDS.md)
- ✅ Rode testes localmente
- 📝 Mantenha commits pequenos e atômicos

### 4. Commit com Mensagem Clara

```bash
git add <arquivos>
git commit -m "feat: adicione novo recurso X"
# ou
git commit -m "fix: corrija bug em Y"
# ou
git commit -m "docs: melhore doc de Z"
```

**Formato de Mensagem:**
```
<tipo>(<escopo>): <descrição curta>

<corpo opcional com mais detalhes>

Fixes #<issue-number> (se aplicável)
```

**Tipos válidos:**
- `feat:` - Nova feature
- `fix:` - Bug fix
- `docs:` - Documentação
- `refactor:` - Refatoração de código
- `test:` - Testes
- `chore:` - Build, deps, etc
- `perf:` - Performance improvement

**Exemplos:**
```
feat(worker): adicione transcrição de áudio com fallback

Implementa fallback para Whisper quando confiança < threshold.
Adiciona OPENAI_TRANSCRIPTION_FALLBACK_MODEL env var.

Fixes #123
```

```
fix(frontend): corrija validação de email em login

O regex de email estava rejeitando domínios válidos.
Atualizou para RFC 5322 compliant.
```

### 5. Push e Abra Pull Request

```bash
git push origin feature/sua-feature
```

Acesse GitHub e abra PR:
- **Título:** Curto e descritivo
- **Descrição:** Contexto, mudanças, screenshots (se UI)
- **Linked Issues:** Referencia issues relevantes

**Template de PR:**
```markdown
## 📝 Descrição
O que essa PR faz? Por quê?

## 🔍 Tipo de Mudança
- [ ] Bug fix
- [ ] Nova feature
- [ ] Breaking change
- [ ] Atualização de docs

## ✅ Checklist
- [ ] Código segue style guide
- [ ] Testes passam (`npm run test`)
- [ ] Docs foram atualizadas
- [ ] Sem console.error ou console.warn
- [ ] Sem dependências não-necessárias

## 📸 Screenshots (se UI)
Antes | Depois
```

### 6. Code Review

Um maintainer vai revisar:
- ✅ Lógica e funcionalidade
- ✅ Padrões de código
- ✅ Testes adequados
- ✅ Documentação atualizada
- ✅ Performance impact

**Se houver feedback:**
- Faça as mudanças solicitadas
- Commit novamente: `git commit -m "refactor: address review feedback"`
- Não faça rebase (deixa histórico claro)

### 7. Merge

Uma vez aprovada, um maintainer faz merge no `main`.

---

## 📋 Padrões de Código

### Frontend (React/TypeScript)

**Arquivo:** [`CODING_STANDARDS.md`](./CODING_STANDARDS.md)

Key points:
- Use TypeScript para type safety
- Componentes funcionais com hooks (não class components)
- Props bem-tipadas
- Padrão de naming: PascalCase para componentes
- Use `const` por padrão (não `let` ou `var`)

**Exemplo:**
```typescript
// ✅ Bom
interface MessageProps {
  id: string;
  content: string;
  priority: 'IMPORTANTE' | 'URGENTE' | 'NORMAL';
}

const MessageCard: React.FC<MessageProps> = ({ id, content, priority }) => {
  return <div className="message-card">{content}</div>;
};
```

```typescript
// ❌ Ruim
const MessageCard = (props) => {
  return <div>{props.content}</div>;
};
```

### Backend (Python)

**Python 3.11+ with type hints**

Key points:
- Use FastAPI type hints
- Docstrings no padrão Google
- snake_case para variáveis/funções
- PEP 8 compliant
- Rode `black` + `flake8` antes de commit

**Exemplo:**
```python
# ✅ Bom
async def analyze_message(
    message: str,
    user_id: str,
    model: str = "gpt-4o-mini"
) -> dict[str, Any]:
    """
    Analisa mensagem com OpenAI.

    Args:
        message: Conteúdo da mensagem
        user_id: ID do usuário
        model: Model OpenAI (default: gpt-4o-mini)

    Returns:
        dict com prioridade e contexto
    """
    response = await openai_client.analyze(message, model)
    return {"priority": response.priority, "context": response.context}
```

```python
# ❌ Ruim
def analyzeMsg(msg, uid):
    r = openai_api.analyze(msg)
    return r
```

### SQL (Migrations)

**Arquivo padrão:**

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_description.sql

-- Exemplo com comentários
CREATE TABLE example (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_example_usuario_id ON example(usuario_id);

-- RLS
ALTER TABLE example ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_can_only_see_their_own" ON example
  FOR SELECT USING (usuario_id = auth.uid());
```

---

## 🧪 Testes

### Frontend

```bash
# Rode testes
npm run test

# Com coverage
npm run test:coverage
```

**Arquivo:** `src/__tests__/`

Exemplo (Vitest + React Testing Library):
```typescript
import { render, screen } from '@testing-library/react';
import { MessageCard } from '@/components/MessageCard';

describe('MessageCard', () => {
  it('renders message content', () => {
    render(<MessageCard id="1" content="Test" priority="NORMAL" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
```

### Backend (Python)

```bash
cd vps/summi_worker
pytest test_app.py -v
# ou
python -m pytest test_*.py --cov=.
```

**Arquivo:** `vps/summi_worker/test_*.py`

Exemplo:
```python
import pytest
from app import analyze_message

@pytest.mark.asyncio
async def test_analyze_message():
    result = await analyze_message("Olá, tudo bem?", "user-123")
    assert result["priority"] in ["IMPORTANTE", "URGENTE", "NORMAL"]
    assert "contexto" in result
```

---

## 📚 Documentação

### Atualizar docs quando:
1. **Adionar feature:** Documente em arquivo relevante
2. **Mudar API:** Atualize [`API_DESIGN.md`](./API_DESIGN.md)
3. **Mudar database:** Atualize [`DATABASE.md`](./DATABASE.md)
4. **Mudar env vars:** Atualize [`ENVIRONMENT_VARS.md`](./ENVIRONMENT_VARS.md)
5. **Release:** Atualize [`CHANGELOG.md`](./CHANGELOG.md)

**Padrão Markdown:**
- H1 `#` para título principal
- H2 `##` para seções
- H3 `###` para subsections
- Use **bold** para keywords
- Use `code` para comandos/variáveis
- Use [links] para referências cruzadas

---

## 🔒 Security Guidelines

### No Frontend
- ❌ **Nunca** coloque API keys em commits
- ❌ **Nunca** log sensitive data (email, tokens)
- ✅ Use `VITE_*` para env vars públicas
- ✅ Valide input do usuário
- ✅ Use HTTPS em produção

### No Backend
- ❌ **Nunca** commite `.env` ou secrets
- ✅ Use env vars para credentials
- ✅ Valide todas as requisições
- ✅ Use JWT para auth
- ✅ RLS policies para data access
- ✅ Rate limiting para APIs públicas

### Reporting Security Issues
**NÃO abra issue pública!**

Envie email para: `[security@summi.com]` com detalhes.

---

## 📊 Performance Checklist

Antes de fazer commit:

- [ ] Não há console.log em código de produção
- [ ] Não há comentários de debug
- [ ] Não há imports não-usados
- [ ] Não há re-renders desnecessários (React)
- [ ] Não há queries N+1 (backend)
- [ ] Testes passam
- [ ] Build não tem warnings
- [ ] Lighthouse score mantém-se ou melhora

```bash
# Checkar TypeScript
npx tsc --noEmit

# Checkar lint
npm run lint

# Build local
npm run build

# Pytest
pytest vps/summi_worker/ -v
```

---

## 🚀 Release Process

**Só maintainers fazem releases:**

```bash
# 1. Create release branch
git checkout -b release/v1.2.4

# 2. Bump version (usa script automatizado)
python scripts/promote_release.py

# 3. Update CHANGELOG.md
# (Add entry para nova versão)

# 4. Commit
git commit -m "chore(release): v1.2.4"

# 5. Tag
git tag v1.2.4

# 6. Push
git push origin release/v1.2.4
git push origin v1.2.4

# 7. Create GitHub Release
# (via GitHub UI com release notes)

# 8. Merge back to main
git checkout main
git merge release/v1.2.4
git push origin main
```

---

## 🤝 Code of Conduct

- ✅ Seja respeitoso
- ✅ Seja inclusivo
- ✅ Aceite crítica construtiva
- ✅ Foque na ideia, não na pessoa
- ✅ Agende discussões técnicas longas (Discord/meeting)

**Inaceitável:**
- ❌ Linguagem ofensiva
- ❌ Discriminação
- ❌ Harassment
- ❌ Spam

---

## 📞 Perguntas?

- **Setup issues?** Veja [`SETUP_LOCAL.md`](./SETUP_LOCAL.md)
- **Código standards?** Veja [`CODING_STANDARDS.md`](./CODING_STANDARDS.md)
- **Bug/feature?** Abra uma issue com template
- **Discussão geral?** Use Discord #dev-general

---

**Obrigado por contribuir!** 🎉
