-- Migration: adiciona coluna para rastrear o último evento real da conversa.
-- Evita reanálise infinita causada por updates internos que alteram modificado_em.

ALTER TABLE public.chats
  ADD COLUMN IF NOT EXISTS ultimo_evento_em TIMESTAMPTZ DEFAULT now();

COMMENT ON COLUMN public.chats.ultimo_evento_em IS
  'Timestamp do último evento recebido via webhook para este chat. Não deve ser atualizado por análise interna.';

-- Backfill para chats existentes
UPDATE public.chats
SET ultimo_evento_em = COALESCE(ultimo_evento_em, modificado_em, criado_em)
WHERE ultimo_evento_em IS NULL;

CREATE INDEX IF NOT EXISTS idx_chats_ultimo_evento_em
  ON public.chats (ultimo_evento_em);
