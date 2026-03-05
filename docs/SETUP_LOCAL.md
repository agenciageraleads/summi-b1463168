# 🛠️ Setup Local para Desenvolvimento

**Última atualização:** 2026-03-02
**Versão do Projeto:** 1.2.3

---

## ⚡ Quickstart (5 minutos)

Para dev experiente, copie e cole:

```bash
# 1. Clone do repositório
git clone <REPO_URL>
cd summi-b1463168

# 2. Dependências Node
npm install

# 3. Setup Supabase (veja passo abaixo)
npx supabase start

# 4. Crie .env.local
cp .env.example .env.local
# Edite com suas credenciais

# 5. Dev server
npm run dev
```

Acesse: http://localhost:5173

---

## 📋 Pré-requisitos

Antes de começar, instale:

| Software | Versão | Por quê? |
|----------|--------|---------|
| **Node.js** | 18+ | Frontend build + npm |
| **npm** ou **bun** | Latest | Gerenciador de pacotes |
| **Git** | Latest | Version control |
| **Python** | 3.11+ | (Opcional) Worker local |
| **Docker** | 20+ | (Opcional) Worker containerizado |
| **Supabase CLI** | Latest | Local DB + Functions |

### Verificar versões instaladas:

```bash
node --version        # v18.x ou acima
npm --version         # 8.x ou acima
git --version         # 2.40+
supabase --version    # 1.x (se instalar)
```

---

## 1️⃣ Clone do Repositório

```bash
git clone <SEU_REPO_URL>
cd summi-b1463168
```

---

## 2️⃣ Instale Dependências Node

```bash
npm install
# ou com bun:
# bun install
```

**Verifique:**
```bash
npm list | head -20   # Deve listar @supabase-js, react, vite, etc
```

---

## 3️⃣ Configure Supabase Local (Recomendado)

### Opção A: Supabase Local (Recommended para dev)

Instale Supabase CLI:
```bash
npm install -g supabase
# ou: brew install supabase/tap/supabase (macOS)
```

Inicie o servidor local:
```bash
supabase start
```

Você verá:
```
API URL:        http://localhost:54321
GraphQL URL:    http://localhost:54321/graphql/v1
DB URL:         postgresql://postgres:postgres@localhost:5432/postgres
Inbucket URL:   http://localhost:54324
Studio URL:     http://localhost:54323
```

**Salve estes valores** - você vai precisar no `.env.local`

### Opção B: Supabase Cloud (Se tiver projeto existente)

Se você tem um projeto Supabase já rodando:

1. Acesse https://app.supabase.com
2. Pegue suas credenciais em `Settings > API`
   - URL (SUPABASE_URL)
   - anon key (SUPABASE_ANON_KEY)
   - service role key (para Edge Functions)

---

## 4️⃣ Configure Variáveis de Ambiente

### Create `.env.local`

Na raiz do projeto, crie `.env.local`:

```bash
# Supabase (FROM passo anterior)
VITE_SUPABASE_URL=http://localhost:54321           # (local) ou https://xxx.supabase.co (cloud)
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Opcional para Edge Functions
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe (opcional, para testar billing)
VITE_STRIPE_PUBLIC_KEY=pk_test_xxxxx

# API Worker (opcional, para testar análise)
VITE_WORKER_API_URL=http://localhost:8080         # Se rodar worker local
```

**Arquivo example existe?**
```bash
ls -la | grep env
# Se não existir .env.example, crie baseado no projeto
```

---

## 5️⃣ Inicie o Dev Server (Frontend)

```bash
npm run dev
```

Você verá:
```
  VITE v4.5.0  ready in 234 ms

  ➜  Local:   http://localhost:5173/
  ➜  Press h to show help
```

**Acesse:** http://localhost:5173

---

## 6️⃣ (Opcional) Setup Python Worker Local

Se você quer testar o worker (análise, transcrição):

### Pré-requisitos
- Python 3.11+
- OpenAI API key
- Evolution API access (para webhooks)

### Instruções

```bash
cd vps/summi_worker

# Virtual environment
python3 -m venv .venv
source .venv/bin/activate          # macOS/Linux
# ou: .venv\Scripts\activate       # Windows

# Instale dependências
pip install -r requirements.txt

# Crie .env
cp .env.example .env
# Edite .env com suas keys:
# - SUPABASE_URL
# - SUPABASE_SERVICE_ROLE_KEY
# - OPENAI_API_KEY
# - EVOLUTION_API_URL (opcional)

# Rode servidor
uvicorn app:app --host 0.0.0.0 --port 8080
```

Deve rodar em: http://localhost:8080

**Teste:**
```bash
curl http://localhost:8080/health   # Deve retornar {"status": "ok"}
```

---

## 7️⃣ (Opcional) Setup Supabase Edge Functions

Se você quer testar Edge Functions localmente:

```bash
# Já está com supabase start rodando? Verifique:
curl http://localhost:54321/health   # Deve retornar 200

# Deploy uma function localmente:
supabase functions deploy handle-signup --no-verify-jwt

# Teste:
curl -X POST http://localhost:54321/functions/v1/handle-signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

---

## ✅ Validação: Tudo Funcionando?

Execute este checklist:

```bash
# 1. Frontend
curl http://localhost:5173         # Deve retornar HTML
echo "✓ Frontend OK"

# 2. Supabase API
curl http://localhost:54321/health # Deve retornar 200
echo "✓ Supabase OK"

# 3. Worker (opcional)
curl http://localhost:8080/health  # Deve retornar {"status":"ok"}
echo "✓ Worker OK"

# 4. Git
git status                          # Deve mostrar working tree
echo "✓ Git OK"
```

Se tudo retornar ✓, parabéns! Você está pronto para desenvolver.

---

## 🗂️ Estrutura após setup:

```
summi-b1463168/
├── .env.local                    # Suas credenciais (NÃO commite!)
├── src/                          # Frontend React
├── supabase/
│   └── .branches/               # Supabase local data
├── vps/summi_worker/
│   └── .venv/                   # Python virtual env
├── node_modules/                # npm packages
└── dist/                        # Built frontend (após npm run build)
```

---

## 🚀 Próximos Passos

### Para Frontend Devs:
1. Abra `src/App.tsx`
2. Leia [`docs/FRONTEND.md`](./FRONTEND.md)
3. Explore componentes em `src/components/`

### Para Backend Devs:
1. Leia [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md)
2. Leia [`docs/DATABASE.md`](./DATABASE.md)
3. Explore Edge Functions em `supabase/functions/`

### Para Devs do Worker:
1. Leia [`docs/VPS_WORKER.md`](./VPS_WORKER.md)
2. Explore `vps/summi_worker/app.py`
3. Rode testes: `pytest vps/summi_worker/test_*.py`

---

## 🆘 Troubleshooting

### "npm install falha"
```bash
# Limpe cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### "Supabase start falha"
```bash
# Reinstale
npm uninstall -g supabase
npm install -g supabase
supabase start
```

### "Porta 5173 já em uso"
```bash
# Use outra porta
npm run dev -- --port 3000
```

### "VITE_SUPABASE_URL não encontrada"
```bash
# Certifique que .env.local existe
ls -la | grep env.local
# Verifique formato: VITE_SUPABASE_URL=...
```

### "Worker não conecta ao Supabase"
```bash
# Verifique .env do worker:
cat vps/summi_worker/.env | grep SUPABASE
# Deve ter SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
```

---

## 📚 Recursos Úteis

| Recurso | Link |
|---------|------|
| **Node.js** | https://nodejs.org/en/ |
| **npm docs** | https://docs.npmjs.com/ |
| **Supabase CLI** | https://supabase.com/docs/guides/cli |
| **Vite** | https://vitejs.dev/guide/ |
| **React** | https://react.dev/ |

---

## 💡 Dicas

1. **Use `npm run dev` em seu IDE terminal** - Más intellisense e auto-reload
2. **Mantenha `.env.local` gitignored** - Já está no `.gitignore`
3. **Restart dev server após env changes** - VITE não auto-recarrega .env
4. **Cheque `supabase status`** - Se supabase ficar lento
5. **Limpe browser cache** - Se componentes não atualizam

---

**Pronto!** 🎉
Vá para [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md) para entender como funciona.
