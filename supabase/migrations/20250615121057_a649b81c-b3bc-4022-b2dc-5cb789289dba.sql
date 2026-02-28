
-- Verificar e corrigir as políticas RLS para permitir atualização dos novos campos
-- Primeiro, vamos recriar a política de UPDATE de forma mais permissiva

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Criar nova política de UPDATE mais permissiva para todos os campos do perfil
CREATE POLICY "Users can update their own profile" 
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Garantir que todos os campos novos estão permitidos para atualização
-- Verificar se há constraints que podem estar bloqueando
ALTER TABLE public.profiles ALTER COLUMN "Summi em Audio?" SET DEFAULT false;
ALTER TABLE public.profiles ALTER COLUMN apenas_horario_comercial SET DEFAULT true;

-- Adicionar índice para melhorar performance das consultas por usuário
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(id);

-- Verificar se há algum trigger que pode estar interferindo
-- Se houver triggers personalizados, eles podem estar causando problemas
;
