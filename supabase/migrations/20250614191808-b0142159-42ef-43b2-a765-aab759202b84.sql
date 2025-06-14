
-- Comentário: Esta migração adiciona políticas de Segurança de Nível de Linha (RLS) à tabela 'chats'
-- para garantir que cada usuário só possa acessar, criar, atualizar e excluir suas próprias conversas.
-- Isso corrige uma falha de segurança crítica que deixava os dados dos chats desprotegidos.

-- Passo 1: Habilitar a Segurança de Nível de Linha (RLS) para a tabela 'chats'.
-- Sem esta linha, nenhuma política de segurança é aplicada.
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

-- Passo 2: Criar política para Leitura (SELECT).
-- Permite que um usuário visualize apenas os chats que pertencem a ele (onde id_usuario corresponde ao seu id de autenticação).
CREATE POLICY "users_can_view_own_chats" ON public.chats
  FOR SELECT USING (id_usuario = auth.uid());

-- Passo 3: Criar política para Inserção (INSERT).
-- Garante que um usuário só pode criar novos chats associados ao seu próprio ID.
CREATE POLICY "users_can_insert_own_chats" ON public.chats
  FOR INSERT WITH CHECK (id_usuario = auth.uid());

-- Passo 4: Criar política para Atualização (UPDATE).
-- Permite que um usuário atualize apenas os chats que já pertencem a ele.
CREATE POLICY "users_can_update_own_chats" ON public.chats
  FOR UPDATE USING (id_usuario = auth.uid());

-- Passo 5: Criar política para Exclusão (DELETE).
-- Permite que um usuário exclua apenas os seus próprios chats.
CREATE POLICY "users_can_delete_own_chats" ON public.chats
  FOR DELETE USING (id_usuario = auth.uid());

-- Passo 6: Forçar a aplicação das políticas RLS, inclusive para o proprietário da tabela.
-- Isso garante que as regras de segurança sejam aplicadas a todos, sem exceções.
ALTER TABLE public.chats FORCE ROW LEVEL SECURITY;
