
-- Create chats table
CREATE TABLE public.chats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  id_usuario UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  remote_jid TEXT NOT NULL,
  nome TEXT NOT NULL,
  prioridade TEXT DEFAULT 'normal',
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  modificado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  contexto TEXT,
  analisado_em TIMESTAMP WITH TIME ZONE,
  conversa JSONB DEFAULT '[]'::jsonb
);

-- Enable RLS on chats table
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for chats
CREATE POLICY "Users can view their own chats" 
  ON public.chats 
  FOR SELECT 
  USING (auth.uid() = id_usuario);

CREATE POLICY "Users can insert their own chats" 
  ON public.chats 
  FOR INSERT 
  WITH CHECK (auth.uid() = id_usuario);

CREATE POLICY "Users can update their own chats" 
  ON public.chats 
  FOR UPDATE 
  USING (auth.uid() = id_usuario);

CREATE POLICY "Users can delete their own chats" 
  ON public.chats 
  FOR DELETE 
  USING (auth.uid() = id_usuario);

-- Function to update modificado_em timestamp
CREATE OR REPLACE FUNCTION public.update_chats_modificado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.modificado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update modificado_em on chat changes
CREATE TRIGGER update_chats_modificado_em
  BEFORE UPDATE ON public.chats
  FOR EACH ROW EXECUTE FUNCTION public.update_chats_modificado_em();

-- Create index for better performance
CREATE INDEX idx_chats_id_usuario ON public.chats(id_usuario);
CREATE INDEX idx_chats_remote_jid ON public.chats(remote_jid);
