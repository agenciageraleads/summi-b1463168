
# 📱 Conecta Mentor IA - Documentação Técnica

## 🎯 Visão Geral

O **Conecta Mentor IA** é uma plataforma SaaS inovadora que utiliza inteligência artificial para analisar e classificar mensagens do WhatsApp, ajudando usuários a identificar e priorizar conversas importantes de forma automatizada.

## 🏗️ Arquitetura da Aplicação

### **Frontend**
- **Framework**: React 18 com TypeScript
- **Roteamento**: React Router DOM v6
- **Estilização**: Tailwind CSS + shadcn/ui
- **Estado Global**: Context API com hooks customizados
- **Build Tool**: Vite
- **Ícones**: Lucide React

### **Backend**
- **Plataforma**: Supabase (PostgreSQL + Edge Functions)
- **Autenticação**: Supabase Auth
- **Banco de Dados**: PostgreSQL com Row Level Security (RLS)
- **API Externa**: Evolution API para integração WhatsApp
- **Pagamentos**: Stripe para assinaturas

## 📊 Estrutura do Banco de Dados

### **Tabelas Principais**

#### `profiles`
```sql
- id: UUID (PK)
- nome: TEXT
- email: TEXT
- numero: TEXT
- instance_name: TEXT
- role: TEXT (user/admin)
- referral_code: TEXT
- temas_urgentes: TEXT
- temas_importantes: TEXT
- apenas_horario_comercial: BOOLEAN
- configurações de áudio e transcrição
```

#### `chats`
```sql
- id: UUID (PK)
- id_usuario: UUID (FK)
- nome: TEXT
- remote_jid: TEXT
- conversa: JSONB
- prioridade: TEXT (0,1,2,3)
- contexto: TEXT
- modificado_em: TIMESTAMP
```

#### `whatsapp_groups_cache`
```sql
- id: UUID (PK)
- user_id: UUID (FK)
- group_id: TEXT
- group_name: TEXT
- participants_count: INTEGER
- last_updated: TIMESTAMP
```

#### `admin_announcements`
```sql
- id: UUID (PK)
- title: TEXT
- message: TEXT
- send_via_whatsapp: BOOLEAN
- send_via_email: BOOLEAN
- status: TEXT (draft/sending/sent/failed)
- recipients_count: INTEGER
- sent_count: INTEGER
- failed_count: INTEGER
```

#### `monitored_whatsapp_groups`
```sql
- id: UUID (PK)
- user_id: UUID (FK)
- group_id: TEXT
- group_name: TEXT
```

#### `subscribers`
```sql
- id: UUID (PK)
- user_id: UUID (FK)
- subscription_status: TEXT
- stripe_customer_id: TEXT
- stripe_subscription_id: TEXT
- trial_ends_at: TIMESTAMP
```

#### `feedback`
```sql
- id: UUID (PK)
- user_id: UUID (FK)
- title: TEXT
- description: TEXT
- type: TEXT
- rating: INTEGER
- status: TEXT
```

## 🔧 Funcionalidades Principais

### **1. Análise Inteligente de Mensagens**
- **Classificação Automática**: Urgente (3), Importante (2), Não Importante (1), Não Analisada (0)
- **Contexto IA**: Resumo inteligente das conversas
- **Filtros Personalizáveis**: Temas urgentes e importantes configuráveis
- **Horário Comercial**: Análise respeitando horários de trabalho

### **2. Gestão de Grupos WhatsApp**
- **Cache Inteligente**: Armazenamento local para reduzir tráfego
- **Monitoramento Seletivo**: Escolha de grupos específicos para análise
- **Atualização Manual**: Controle sobre quando buscar novos grupos
- **Interface Intuitiva**: Seleção e gerenciamento visual

### **3. Conexão WhatsApp via Evolution API**
- **QR Code Dinâmico**: Conexão segura e renovável
- **Status em Tempo Real**: Monitoramento de conexão
- **Reconexão Automática**: Sistema de polling para verificação
- **Múltiplas Instâncias**: Suporte a diferentes números

### **4. Sistema de Assinaturas**
- **Integração Stripe**: Pagamentos seguros
- **Período Trial**: 7 dias gratuitos
- **Gestão de Status**: Ativo, Trial, Inativo, Cancelado
- **Portal do Cliente**: Gerenciamento de assinatura

### **5. Painel Administrativo**
- **Gestão de Usuários**: Visualização e controle de contas
- **Estatísticas Detalhadas**: Métricas de uso e conexões
- **Sistema de Anúncios**: Comunicação via email/WhatsApp
- **Gestão de Grupos Beta**: Controle de funcionalidades experimentais
- **Auditoria de Segurança**: Monitoramento de atividades

## 🛠️ Componentes Técnicos

### **Edge Functions (Supabase)**

#### `fetch-whatsapp-groups`
- Busca grupos do usuário via Evolution API
- Implementa cache para reduzir requisições
- Filtra participantes para otimização

#### `manage-whatsapp-groups-cache`
- Gerencia cache de grupos WhatsApp
- Operações: get_cached, refresh_from_api
- Otimização de performance

#### `admin-announcements`
- Criação e envio de anúncios administrativos
- Suporte a email e WhatsApp
- Rastreamento de entregas

#### `analyze-messages`
- Análise IA das conversas
- Classificação de prioridades
- Geração de contexto

#### `evolution-*` (família)
- `evolution-connect-instance`: Conexão WhatsApp
- `evolution-generate-qr`: Geração de QR Code
- `evolution-connection-state`: Status da conexão
- `evolution-delete-instance`: Limpeza de instâncias

### **Hooks Customizados**

#### `useWhatsAppManager`
- Gerenciamento completo da conexão WhatsApp
- Estados: disconnected, needs_phone_number, needs_qr_code, connecting, connected
- Polling automático para verificação de status

#### `useProfile`
- Gestão do perfil do usuário
- Sincronização com banco de dados
- Cache local para performance

#### `useAdmin`
- Funcionalidades administrativas
- Verificação de permissões
- Estatísticas e métricas

#### `useMessageAnalysis`
- Controle da análise de mensagens
- Feedback visual para usuário
- Gestão de estado de processamento

## 🔐 Segurança

### **Row Level Security (RLS)**
- Políticas implementadas em todas as tabelas
- Isolamento de dados por usuário
- Verificação de permissões admin

### **Funções de Segurança**
```sql
-- Verificação de admin
public.is_admin(user_id uuid) -> boolean

-- Validação de perfil
public.verify_admin_access(user_id uuid) -> boolean

-- Geração segura de códigos
public.generate_referral_code() -> text
```

### **Autenticação**
- JWT tokens via Supabase Auth
- Refresh automático de tokens
- Logout seguro com limpeza de sessão

## 🎨 Interface do Usuário

### **Design System**
- **Base**: shadcn/ui components
- **Cores**: Sistema consistente com variáveis CSS
- **Tipografia**: Inter font family
- **Responsividade**: Mobile-first approach
- **Acessibilidade**: ARIA labels e navegação por teclado

### **Páginas Principais**
1. **Dashboard**: Visão geral e conexão WhatsApp
2. **Mensagens**: Lista de conversas analisadas
3. **Configurações**: Perfil e preferências
4. **Assinatura**: Gestão de pagamentos
5. **Admin**: Painel administrativo completo

## 🚀 Fluxo de Dados

### **Análise de Mensagens**
1. Usuário conecta WhatsApp via Evolution API
2. Sistema webhook recebe novas mensagens
3. Edge function processa e classifica via IA
4. Dados são armazenados na tabela `chats`
5. Interface atualiza em tempo real

### **Gestão de Grupos**
1. Usuário solicita atualização de grupos
2. Sistema verifica cache local
3. Se necessário, busca da Evolution API
4. Grupos são armazenados no cache
5. Interface exibe grupos disponíveis

### **Sistema de Assinaturas**
1. Usuário inicia trial gratuito
2. Stripe cria customer e subscription
3. Webhooks atualizam status no banco
4. Sistema verifica permissões em tempo real
5. Funcionalidades são liberadas/bloqueadas

## 🔧 Configuração e Deploy

### **Variáveis de Ambiente**
```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
EVOLUTION_API_URL=
EVOLUTION_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SIGNING_SECRET=
WEBHOOK_N8N_RECEBE_MENSAGEM=
WEBHOOK_N8N_ANALISA_MENSAGENS=
```

### **Dependências Principais**
```json
{
  "react": "^18.3.1",
  "@supabase/supabase-js": "^2.50.0",
  "@tanstack/react-query": "^5.56.2",
  "react-router-dom": "^6.26.2",
  "tailwindcss": "latest",
  "lucide-react": "^0.462.0"
}
```

## 📈 Métricas e Monitoramento

### **Estatísticas Administrativas**
- Total de usuários registrados
- Usuários ativos vs inativos
- Taxa de conversão trial -> pago
- Grupos monitorados por usuário
- Volume de mensagens analisadas

### **Performance**
- Cache de grupos reduz 90% das requisições à Evolution API
- RLS policies otimizadas para consultas rápidas
- Indexes estratégicos para queries frequentes
- Edge functions com latência < 200ms

## 🔄 Integrações Externas

### **Evolution API**
- **Endpoints Utilizados**:
  - `/instance/create`: Criação de instâncias
  - `/instance/connect`: Conexão WhatsApp
  - `/instance/qr`: Geração de QR Code
  - `/group/fetchAllGroups`: Busca de grupos
  - `/instance/connectionState`: Status da conexão

### **Stripe**
- **Webhooks**: Sincronização automática de assinaturas
- **Portal**: Gestão de pagamentos pelo cliente
- **Products**: Planos flexíveis de assinatura

### **N8N (Automação)**
- **Webhook Recebe Mensagem**: Processamento em tempo real
- **Webhook Analisa Mensagens**: Classificação via IA
- **Integração IA**: OpenAI/Anthropic para análise

## 🎯 Roadmap e Melhorias

### **Implementado**
✅ Sistema de cache para grupos WhatsApp  
✅ Painel de anúncios administrativos  
✅ Otimização de logs de segurança  
✅ Correção de warnings do Supabase  

### **Em Desenvolvimento**
🚧 Relatórios avançados de analytics  
🚧 API pública para integrações  
🚧 App mobile React Native  
🚧 Integração com CRM populares  

### **Planejado**
📋 Sistema de templates de resposta  
📋 Integração com Google Calendar  
📋 Análise de sentimento avançada  
📋 Suporte a múltiplos idiomas  

## 🤝 Contribuição

Para contribuir com o projeto:
1. Faça fork do repositório
2. Crie branch para sua feature
3. Commit suas mudanças
4. Abra Pull Request
5. Aguarde review do time

## 📞 Suporte

Para dúvidas técnicas ou suporte:
- **Email**: agenciageraleads@gmail.com
- **GitHub Issues**: Para bugs e sugestões
- **Documentação**: Este arquivo para referência técnica

---

**Conecta Mentor IA** - Transformando comunicação empresarial através da inteligência artificial.
