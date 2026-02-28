
-- Adicionar campo onboarding_completed na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN onboarding_completed boolean DEFAULT false;

-- Adicionar campos avatar e name para completar o perfil
ALTER TABLE public.profiles 
ADD COLUMN avatar text,
ADD COLUMN name text;

-- Atualizar name com o valor de nome para usuários existentes
UPDATE public.profiles 
SET name = nome 
WHERE name IS NULL AND nome IS NOT NULL;
;
