
-- Adicionar coluna subscribed na tabela subscribers
ALTER TABLE public.subscribers ADD COLUMN IF NOT EXISTS subscribed BOOLEAN NOT NULL DEFAULT false;

-- Atualizar registros existentes para refletir o status correto
UPDATE public.subscribers 
SET subscribed = CASE 
  WHEN subscription_status IN ('active', 'trialing') THEN true 
  ELSE false 
END;
