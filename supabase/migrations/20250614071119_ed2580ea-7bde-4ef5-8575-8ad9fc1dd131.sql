
-- Comentário: Esta migração corrige uma vulnerabilidade de segurança crítica, removendo uma política de
-- segurança de nível de linha (RLS) excessivamente permissiva na tabela 'subscribers'.
-- A política antiga permitia que qualquer usuário autenticado realizasse qualquer operação (leitura, escrita, exclusão)
-- em qualquer registro de assinatura, o que é um risco de segurança grave.
-- As modificações agora são tratadas exclusivamente por Edge Functions seguras que usam a chave de serviço (service role),
-- que ignora as políticas RLS. A política de leitura para usuários visualizarem apenas suas próprias assinaturas
-- permanece intacta e correta.

-- Passo 1: Remover a política permissiva "edge_functions_can_manage_subscriptions".
-- Esta política é insegura porque o 'USING (true)' permite acesso total a qualquer usuário autenticado.
DROP POLICY IF EXISTS "edge_functions_can_manage_subscriptions" ON public.subscribers;

-- Comentário sobre a tabela 'chats':
-- As políticas RLS para a tabela 'chats' já estão corretamente configuradas para restringir o acesso
-- aos dados do próprio usuário, conforme definido na migração existente.
-- Portanto, nenhuma alteração é necessária para a tabela 'chats'.
;
