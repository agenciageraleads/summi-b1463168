
-- Criar tabela para armazenar grupos monitorados do WhatsApp
CREATE TABLE public.monitored_whatsapp_groups (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id TEXT NOT NULL,
    group_name TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar índice composto para garantir que um usuário não possa adicionar o mesmo grupo duas vezes
CREATE UNIQUE INDEX idx_user_group_unique ON public.monitored_whatsapp_groups (user_id, group_id);

-- Criar índice para consultas rápidas por usuário
CREATE INDEX idx_monitored_groups_user_id ON public.monitored_whatsapp_groups (user_id);

-- Ativar Row Level Security (RLS)
ALTER TABLE public.monitored_whatsapp_groups ENABLE ROW LEVEL SECURITY;

-- Política RLS para permitir que apenas admins acessem os dados
CREATE POLICY "Apenas admins podem acessar grupos monitorados" 
    ON public.monitored_whatsapp_groups 
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Comentários para documentação
COMMENT ON TABLE public.monitored_whatsapp_groups IS 'Armazena grupos do WhatsApp selecionados para monitoramento especial';
COMMENT ON COLUMN public.monitored_whatsapp_groups.group_id IS 'ID do grupo vindo da Evolution API (ex: 120363048995669813@g.us)';
COMMENT ON COLUMN public.monitored_whatsapp_groups.group_name IS 'Nome do grupo para fácil identificação';
COMMENT ON COLUMN public.monitored_whatsapp_groups.user_id IS 'ID do usuário dono do grupo';
;
