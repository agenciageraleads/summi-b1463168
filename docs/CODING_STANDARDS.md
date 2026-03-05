# 📝 Padrões de Código

**Última atualização:** 2026-03-02

---

## 🎨 Frontend (React/TypeScript)

### Naming

```typescript
// ✅ Componentes: PascalCase
const MessageCard: React.FC<Props> = () => {};
const useMessages = () => {};

// ✅ Variáveis: camelCase
const userName = "Lucas";
const isLoading = true;

// ✅ Constantes: UPPER_SNAKE_CASE
const MAX_RETRIES = 3;
const API_TIMEOUT = 5000;

// ✅ Enums: PascalCase
enum MessagePriority {
  IMPORTANTE = "IMPORTANTE",
  URGENTE = "URGENTE",
  NORMAL = "NORMAL"
}
```

### Imports

```typescript
// ✅ Agrupe imports
import React, { FC, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { MessageService } from '@/services/message';
import { useAuth } from '@/hooks/useAuth';

import { Card } from '@/components/ui/card';
```

### Props

```typescript
// ✅ Tipadas, bem estruturadas
interface MessageProps {
  id: string;
  content: string;
  priority: MessagePriority;
  timestamp: Date;
  onDelete?: (id: string) => void;
}

const Message: FC<MessageProps> = ({ id, content, priority, onDelete }) => {
  // ...
};

// ❌ Ruim
const Message = (props: any) => {
  return <div>{props.c}</div>;
};
```

### Hooks

```typescript
// ✅ Custom hooks
const useMessages = (userId: string) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['messages', userId],
    queryFn: () => MessageService.getMessages(userId),
  });

  return { messages: data, isLoading, error };
};

// ✅ Use hooks, não class components
const MyComponent: FC = () => {
  const { messages } = useMessages('user-123');
  return <div>{messages.length}</div>;
};
```

### Styling

```typescript
// ✅ Tailwind classes
<div className="flex items-center gap-2 p-4 rounded-lg bg-white shadow">
  <Icon className="w-5 h-5 text-blue-500" />
  <span className="text-sm font-medium">Message</span>
</div>

// ❌ Avoid inline styles
<div style={{ display: 'flex', color: 'blue' }}>
```

### Error Handling

```typescript
// ✅ Try-catch com messages claras
try {
  await MessageService.delete(messageId);
  toast.success("Mensagem deletada");
} catch (error) {
  console.error("Delete failed:", error);
  toast.error("Falha ao deletar mensagem");
}

// ❌ Silenciar erros
try {
  await delete();
} catch {}
```

---

## 🐍 Backend (Python)

### Naming

```python
# ✅ Funções/variáveis: snake_case
def analyze_message(message_text: str, user_id: str) -> dict:
    pass

message_priority = "IMPORTANTE"

# ✅ Classes: PascalCase
class MessageAnalyzer:
    pass

# ✅ Constantes: UPPER_SNAKE_CASE
MAX_MESSAGE_LENGTH = 4096
API_TIMEOUT_SECONDS = 30

# ✅ Enums: PascalCase com valores
from enum import Enum

class MessagePriority(str, Enum):
    IMPORTANTE = "IMPORTANTE"
    URGENTE = "URGENTE"
    NORMAL = "NORMAL"
```

### Type Hints

```python
# ✅ Sempre use type hints
from typing import Optional, Any

def get_user_messages(
    user_id: str,
    limit: int = 10,
    priority: Optional[str] = None
) -> list[dict[str, Any]]:
    """
    Recupera mensagens do usuário.

    Args:
        user_id: ID do usuário
        limit: Número máximo de mensagens
        priority: Filtrar por prioridade (opcional)

    Returns:
        Lista de mensagens com metadados
    """
    pass

# ❌ Ruim - sem type hints
def get_messages(uid, limit):
    pass
```

### Docstrings (Google Style)

```python
# ✅ Docstring clara
def transcribe_audio(
    audio_path: str,
    model: str = "whisper-1"
) -> str:
    """
    Transcreve áudio usando OpenAI Whisper.

    Args:
        audio_path: Caminho do arquivo de áudio
        model: Modelo OpenAI (default: whisper-1)

    Returns:
        Texto transcrito

    Raises:
        FileNotFoundError: Se arquivo não existe
        ValueError: Se formato não é suportado

    Example:
        >>> text = transcribe_audio("message.wav")
        >>> print(text)
        "Olá, tudo bem?"
    """
    pass
```

### Async/Await

```python
# ✅ Use async para I/O
async def analyze_and_save(message: str, user_id: str) -> None:
    analysis = await analyze_message(message)
    await save_to_db(user_id, analysis)

# FastAPI endpoint
from fastapi import FastAPI

app = FastAPI()

@app.post("/analyze")
async def handle_analyze(data: dict) -> dict:
    result = await analyze_message(data["message"])
    return result
```

### Error Handling

```python
# ✅ Específico e logged
import logging

logger = logging.getLogger(__name__)

try:
    result = await openai_client.analyze(message)
except OpenAIError as e:
    logger.error(f"OpenAI analysis failed for user {user_id}: {e}")
    raise ValueError("Análise falhou, tente novamente") from e

# ❌ Genérico/silencioso
try:
    pass
except:
    pass
```

### Classes e Métodos

```python
# ✅ Clear structure
class MessageAnalyzer:
    """Analisa mensagens com OpenAI."""

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.model = "gpt-4o-mini"

    async def analyze(self, message: str) -> dict:
        """Analisa uma mensagem."""
        # Implementation
        pass

    async def get_priority(self, message: str) -> str:
        """Determina prioridade."""
        # Implementation
        pass

# Use na FastAPI
analyzer = MessageAnalyzer(api_key=OPENAI_API_KEY)

@app.post("/analyze")
async def analyze(msg: str):
    result = await analyzer.analyze(msg)
    return result
```

---

## 🗄️ SQL (Migrations)

### Naming

```sql
-- ✅ Clear, descriptive names
-- supabase/migrations/YYYYMMDDHHMMSS_add_audio_transcription.sql

-- ✅ Snake case para tabelas/colunas
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conteudo TEXT NOT NULL,
  transcricao_audio TEXT,
  criado_em TIMESTAMP DEFAULT now()
);

-- ✅ Índices com prefixo
CREATE INDEX idx_chat_messages_usuario_id ON chat_messages(usuario_id);
CREATE INDEX idx_chat_messages_criado_em ON chat_messages(criado_em DESC);

-- ✅ RLS policies
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_can_see_own_messages" ON chat_messages
  FOR SELECT USING (usuario_id = auth.uid());
```

### Best Practices

```sql
-- ✅ Transactions para múltiplas mudanças
BEGIN;
  ALTER TABLE chats ADD COLUMN audio_seconds FLOAT;
  CREATE INDEX idx_chats_audio ON chats(audio_seconds);
COMMIT;

-- ✅ Rollback safety
-- Se algo falhar, tudo reverte

-- ✅ Comentários úteis
-- Adicionando coluna para rastrear tempo de áudio
ALTER TABLE chats ADD COLUMN audio_duration_seconds FLOAT;

-- ✅ Cheque se existe antes de criar (safe)
CREATE TABLE IF NOT EXISTS subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL,
  instancia_id UUID NOT NULL,
  UNIQUE(usuario_id, instancia_id)
);
```

---

## 🔍 Linting & Formatting

### Frontend

```bash
# ESLint
npm run lint
npm run lint:fix

# Prettier (auto-format)
npm run format
```

### Backend

```bash
# Black (auto-format Python)
black vps/summi_worker/

# Flake8 (linting)
flake8 vps/summi_worker/ --max-line-length=100

# MyPy (type checking)
mypy vps/summi_worker/ --strict
```

---

## ✅ Pre-commit Checklist

Antes de fazer commit:

- [ ] Código segue este style guide
- [ ] Sem `console.log()` em produção (frontend)
- [ ] Sem `print()` em produção (backend)
- [ ] Sem code commented (use git history)
- [ ] Testes passam
- [ ] Linter passa (`npm run lint`, `black`, etc)
- [ ] Sem imports não usados
- [ ] Documentação atualizada

---

## 🚫 Anti-patterns

### Frontend

```typescript
// ❌ Evitar
class ComponentClass extends React.Component {}  // Use FC com hooks
const x = any;  // Use tipos específicos
useCallback/useMemo sem dependências  // Pode ser memória leak
```

### Backend

```python
# ❌ Evitar
except:  # Sempre use exceção específica
pass
global x  # Evitar global scope
input()  # Em servidor FastAPI
print()  # Use logging
```

### SQL

```sql
-- ❌ Evitar
SELECT *;  -- Sempre liste colunas
ALTER TABLE DISABLE TRIGGER ALL;  -- Pode quebrar RLS
```

---

## 📚 Recursos

- [Google Python Style Guide](https://google.github.io/styleguide/pyguide.html)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [PEP 8](https://pep8.org/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

---

**Ver também:** [`CONTRIBUTING.md`](./CONTRIBUTING.md) para processo de review.
