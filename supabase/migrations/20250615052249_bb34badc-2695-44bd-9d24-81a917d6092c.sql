
-- Corrigir a função generate_referral_code que está faltando
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recriar o trigger para gerar código de indicação automaticamente
CREATE OR REPLACE FUNCTION public.handle_referral_code()
RETURNS TRIGGER AS $$
BEGIN
    -- Se não tem código de indicação, gera um
    IF NEW.referral_code IS NULL THEN
        NEW.referral_code := public.generate_referral_code();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recriar o trigger
DROP TRIGGER IF EXISTS set_referral_code ON public.profiles;
CREATE TRIGGER set_referral_code
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_referral_code();

-- Gerar códigos para usuários existentes que não têm
UPDATE public.profiles 
SET referral_code = public.generate_referral_code() 
WHERE referral_code IS NULL;
;
