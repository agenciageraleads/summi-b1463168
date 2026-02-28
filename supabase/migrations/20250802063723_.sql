-- Fix remaining critical database security issues

-- Fix remaining functions that need search_path set
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.handle_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
    -- Se não tem código de indicação, gera um
    IF NEW.referral_code IS NULL THEN
        NEW.referral_code := public.generate_referral_code();
    END IF;
    
    RETURN NEW;
END;
$function$;;
