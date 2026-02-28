-- ================================================================
-- PLANO DE REFATORAÇÃO COMPLETA: LIMPEZA TOTAL E RECONSTRUÇÃO
-- ================================================================
-- Este script faz limpeza completa e reconstrói do zero:
-- 1. Remove função is_admin existente (se houver)
-- 2. Remove todas as policies RLS conflitantes
-- 3. Recria função is_admin limpa e otimizada
-- 4. Recria todas as RLS policies necessárias
-- 5. Aplica configurações de segurança

-- ETAPA 1: LIMPEZA TOTAL
-- ================================================================

-- Remove função is_admin se existir
DROP FUNCTION IF EXISTS public.is_admin(uuid);

-- Remove todas as policies RLS da tabela profiles para recriar limpas
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_admin" ON public.profiles;

-- ETAPA 2: RECRIAÇÃO LIMPA DA FUNÇÃO is_admin
-- ================================================================

CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = COALESCE(user_id, auth.uid()) 
    AND role = 'admin'
  );
$function$;

-- Comentário da função
COMMENT ON FUNCTION public.is_admin(uuid) IS 'Verifica se um usuário tem role admin. Função SECURITY DEFINER para evitar recursão RLS.';

-- ETAPA 3: RECRIAÇÃO DAS POLICIES RLS LIMPAS
-- ================================================================

-- Garantir que RLS está ativo
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy para SELECT: todos podem ver perfis públicos
CREATE POLICY "profiles_select_all" 
ON public.profiles 
FOR SELECT 
USING (true);

-- Policy para INSERT: usuários podem criar seu próprio perfil
CREATE POLICY "profiles_insert_own" 
ON public.profiles 
FOR INSERT 
WITH CHECK (id = auth.uid());

-- Policy para UPDATE: usuários podem atualizar seu próprio perfil
CREATE POLICY "profiles_update_own" 
ON public.profiles 
FOR UPDATE 
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Policy para UPDATE ADMIN: admins podem atualizar qualquer perfil
CREATE POLICY "profiles_update_admin" 
ON public.profiles 
FOR UPDATE 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Policy para DELETE ADMIN: apenas admins podem deletar perfis
CREATE POLICY "profiles_delete_admin" 
ON public.profiles 
FOR DELETE 
USING (is_admin(auth.uid()));

-- ETAPA 4: VALIDAÇÃO E SEGURANÇA ADICIONAL
-- ================================================================

-- Criar índice otimizado para role lookup se não existir
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role) WHERE role = 'admin';

-- Verificar se a tabela security_audit_log existe para logs
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'security_audit_log') THEN
        CREATE TABLE public.security_audit_log (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id uuid,
            event_type text NOT NULL,
            event_details jsonb DEFAULT '{}',
            severity text DEFAULT 'medium',
            ip_address inet,
            user_agent text,
            session_id text,
            created_at timestamp with time zone DEFAULT now()
        );
        
        ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "security_audit_log_admin_view" 
        ON public.security_audit_log 
        FOR SELECT 
        USING (is_admin());
        
        CREATE POLICY "security_audit_log_service_insert" 
        ON public.security_audit_log 
        FOR INSERT 
        WITH CHECK (true);
    END IF;
END $$;

-- ETAPA 5: TESTE DE VALIDAÇÃO
-- ================================================================

-- Inserir log de refatoração completa
INSERT INTO public.security_audit_log (
    event_type, 
    event_details, 
    severity
) VALUES (
    'system_refactoring',
    jsonb_build_object(
        'action', 'complete_backend_refactoring',
        'timestamp', now(),
        'components', ARRAY['is_admin_function', 'rls_policies', 'security_audit']
    ),
    'high'
);