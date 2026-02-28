
-- FASE 1: Limpeza segura de políticas duplicadas e padronização de nomes
-- Remove todas as políticas existentes na tabela chats para evitar duplicações
DROP POLICY IF EXISTS "Users can view their own chats" ON public.chats;
DROP POLICY IF EXISTS "Users can insert their own chats" ON public.chats;
DROP POLICY IF EXISTS "Users can update their own chats" ON public.chats;
DROP POLICY IF EXISTS "Users can delete their own chats" ON public.chats;
DROP POLICY IF EXISTS "users_can_view_own_chats" ON public.chats;
DROP POLICY IF EXISTS "users_can_insert_own_chats" ON public.chats;
DROP POLICY IF EXISTS "users_can_update_own_chats" ON public.chats;
DROP POLICY IF EXISTS "users_can_delete_own_chats" ON public.chats;
DROP POLICY IF EXISTS "users_can_select_own_chats" ON public.chats;

-- Recria políticas com nomes padronizados e únicos
CREATE POLICY "users_can_select_own_chats" ON public.chats
  FOR SELECT USING (id_usuario = auth.uid());

CREATE POLICY "users_can_insert_own_chats" ON public.chats
  FOR INSERT WITH CHECK (id_usuario = auth.uid());

CREATE POLICY "users_can_update_own_chats" ON public.chats
  FOR UPDATE USING (id_usuario = auth.uid());

CREATE POLICY "users_can_delete_own_chats" ON public.chats
  FOR DELETE USING (id_usuario = auth.uid());

-- FASE 2: Adicionar políticas faltantes para a tabela feedback (se não existirem)
DROP POLICY IF EXISTS "users_can_update_own_feedback" ON public.feedback;
DROP POLICY IF EXISTS "users_can_delete_own_feedback" ON public.feedback;

CREATE POLICY "users_can_update_own_feedback" ON public.feedback
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "users_can_delete_own_feedback" ON public.feedback
  FOR DELETE USING (user_id = auth.uid());

-- FASE 3: Adicionar políticas faltantes para a tabela profiles (se não existir)
DROP POLICY IF EXISTS "users_can_delete_own_profile" ON public.profiles;

CREATE POLICY "users_can_delete_own_profile" ON public.profiles
  FOR DELETE USING (id = auth.uid());

-- FASE 4: Garantir que RLS está habilitado em todas as tabelas
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- FASE 5: Forçar RLS para garantir que as políticas sejam sempre aplicadas
ALTER TABLE public.chats FORCE ROW LEVEL SECURITY;
ALTER TABLE public.feedback FORCE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.subscribers FORCE ROW LEVEL SECURITY;
;
