
-- Corrigir search_path das funções de referral code para prevenir ataques de search_path hijacking
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT AS $$
DECLARE
    code TEXT;
    is_unique BOOLEAN := FALSE;
BEGIN
    -- Gera códigos únicos até encontrar um que não existe
    WHILE NOT is_unique LOOP
        -- Gera código alfanumérico de 8 caracteres
        code := upper(substring(md5(random()::text) from 1 for 8));
        
        -- Verifica se o código já existe
        SELECT NOT EXISTS(
            SELECT 1 FROM public.profiles WHERE referral_code = code
        ) INTO is_unique;
    END LOOP;
    
    RETURN code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION public.handle_referral_code()
RETURNS TRIGGER AS $$
BEGIN
    -- Se não tem código de indicação, gera um
    IF NEW.referral_code IS NULL THEN
        NEW.referral_code := public.generate_referral_code();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Mover extensão pg_net para schema específico se necessário
-- Verificar se pg_net está no schema public e movê-la
DO $$
BEGIN
    -- Verificar se a extensão pg_net existe no schema public
    IF EXISTS (
        SELECT 1 FROM pg_extension 
        WHERE extname = 'pg_net' 
        AND extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) THEN
        -- Criar schema extensions se não existir
        CREATE SCHEMA IF NOT EXISTS extensions;
        
        -- Mover a extensão pg_net para o schema extensions
        ALTER EXTENSION pg_net SET SCHEMA extensions;
    END IF;
END
$$;
