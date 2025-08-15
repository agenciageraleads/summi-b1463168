-- Verificar e corrigir RLS para monitored_whatsapp_groups
-- Primeiro, verificar se a tabela existe e seu estado atual
SELECT 
  schemaname, 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'monitored_whatsapp_groups';

-- Habilitar RLS se não estiver habilitado
ALTER TABLE IF EXISTS public.monitored_whatsapp_groups ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes que podem estar conflitando
DROP POLICY IF EXISTS "Users can manage their own monitored groups" ON public.monitored_whatsapp_groups;
DROP POLICY IF EXISTS "Users can view their own monitored groups" ON public.monitored_whatsapp_groups;
DROP POLICY IF EXISTS "Users can insert their own monitored groups" ON public.monitored_whatsapp_groups;
DROP POLICY IF EXISTS "Users can update their own monitored groups" ON public.monitored_whatsapp_groups;
DROP POLICY IF EXISTS "Users can delete their own monitored groups" ON public.monitored_whatsapp_groups;

-- Criar políticas simples e funcionais
CREATE POLICY "Users can view their monitored groups" 
ON public.monitored_whatsapp_groups 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their monitored groups" 
ON public.monitored_whatsapp_groups 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their monitored groups" 
ON public.monitored_whatsapp_groups 
FOR DELETE 
USING (auth.uid() = user_id);

-- Verificar se a tabela tem as colunas necessárias
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'monitored_whatsapp_groups' 
AND table_schema = 'public';