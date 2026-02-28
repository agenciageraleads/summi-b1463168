
-- Comentário: Esta migração adapta a tabela de assinantes para uma integração robusta com o Stripe,
-- orientada a webhooks. Estamos substituindo o campo genérico 'plan_type' por 'stripe_price_id',
-- que armazenará o ID de preço específico do Stripe, garantindo um rastreamento preciso do plano do usuário.

-- Passo 1: Remover a coluna antiga 'plan_type', se ela existir.
ALTER TABLE public.subscribers DROP COLUMN IF EXISTS plan_type;

-- Passo 2: Adicionar a nova coluna 'stripe_price_id' para armazenar o ID do preço do Stripe.
ALTER TABLE public.subscribers ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

-- Passo 3: Garantir que a coluna 'subscription_status' tenha um valor padrão para novos registros.
ALTER TABLE public.subscribers ALTER COLUMN subscription_status SET DEFAULT 'inactive';

-- Passo 4: Adicionar o ID da assinatura do stripe_subscription_id que está faltando.
ALTER TABLE public.subscribers ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

