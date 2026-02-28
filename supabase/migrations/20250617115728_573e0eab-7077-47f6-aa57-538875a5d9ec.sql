
-- Adicionar role "beta" de forma mais direta e segura
-- Como a coluna role já existe como text, vamos apenas adicionar uma constraint

-- Remove qualquer constraint existente na coluna role
DO $$ 
BEGIN
    -- Busca e remove constraints existentes na coluna role
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
        WHERE tc.table_name = 'profiles' 
        AND tc.constraint_type = 'CHECK'
        AND cc.check_clause LIKE '%role%'
    ) THEN
        -- Remove a constraint existente
        ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    END IF;
END $$;

-- Adiciona nova constraint que permite 'user', 'admin' e 'beta'
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('user', 'admin', 'beta'));

-- Garante que o default seja 'user'
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'user';

-- Comentário: Adiciona suporte ao role 'beta' mantendo compatibilidade
-- Permite que admins possam definir usuários como 'beta' para acesso às funcionalidades beta
;
