# 🎨 Frontend (React)

**Localização:** `/src/`
**Stack:** React 18 + TypeScript + Vite + Tailwind

---

## 📁 Estrutura

```
src/
├── pages/              # 15 páginas (rotas)
│   ├── Index.tsx      # Dashboard principal
│   ├── LoginPage.tsx
│   ├── SubscriptionPage.tsx
│   ├── SettingsPage.tsx
│   ├── AdminDashboardPage.tsx
│   └── ...
├── components/        # 18+ componentes (shadcn-ui)
├── hooks/            # Custom hooks
├── services/         # API clients
├── contexts/         # React Context (Auth)
├── integrations/     # Supabase setup
└── lib/              # Utilities
```

---

## 🎯 Key Pages

| Página | Descrição |
|--------|-----------|
| **Index** | Dashboard principal (mensagens, resumos) |
| **LoginPage** | Autenticação |
| **SubscriptionPage** | Billing com Stripe |
| **SettingsPage** | Configurações do usuário |
| **AdminDashboardPage** | Admin controls |

---

## 🧩 Key Components

- `Navbar` - Navegação
- `MessageCard` - Display de mensagem
- `InstanceManager` - Gerenciar WhatsApp
- `ChartCard` - Gráficos de estatísticas
- `SubscriptionCard` - Plano de preço
- Dialogs, Forms, Modals (shadcn-ui)

---

## 🎣 Custom Hooks

| Hook | O que faz |
|------|-----------|
| `useAuth()` | Autenticação (login, logout) |
| `useMessages()` | Fetch de mensagens |
| `useInstances()` | Gerenciar WhatsApp instances |
| `useSubscription()` | Info de billing |

---

## 🔌 Integração com Backend

**Supabase Client:** `/src/integrations/supabase/client.ts`

```typescript
// Exemplo: fetch mensagens
const { data: messages } = await supabase
  .from('chats')
  .select('*')
  .eq('usuario_id', user.id)
  .order('created_at', { ascending: false })
  .limit(20);
```

---

## 🎨 Styling

Usando **Tailwind CSS** + **shadcn-ui** (Radix primitives)

```typescript
<div className="flex items-center gap-2 p-4 rounded-lg shadow">
  <Icon className="w-5 h-5" />
  <span className="text-sm font-medium">Text</span>
</div>
```

---

## 🚀 Dev Server

```bash
npm run dev
# http://localhost:5173
```

---

## 🧪 Testes

```bash
npm run test         # Run tests
npm run test:ui      # Interactive mode
npm run test:coverage
```

---

**Ver também:** [`CODING_STANDARDS.md`](./CODING_STANDARDS.md) para padrões React.
