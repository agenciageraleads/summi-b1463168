import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type AnalyzeStatus = 'completed' | 'processing' | 'skipped' | 'error';

interface AnalyzeResponse {
  success?: boolean;
  status?: AnalyzeStatus;
  summary_sent?: boolean;
  fallback_sent?: boolean;
  onboarding_sent?: boolean;
  analyzed_count?: number;
  job_id?: string;
  reason?: string;
  error?: string;
}

const POLL_MAX_ATTEMPTS = 10;
const POLL_INTERVAL_MS = 2500;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const useMessageAnalysis = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const invokeAnalyze = async (body: Record<string, unknown> = {}): Promise<AnalyzeResponse> => {
    const { data, error } = await supabase.functions.invoke('analyze-messages', { body });
    if (error) {
      if (error.message?.includes('Function not found') || error.status === 404) {
        throw new Error('Função de análise não encontrada. Verifique se ela foi deployada corretamente.');
      }
      if (error.message?.includes('network') || error.message?.includes('fetch')) {
        throw new Error('Erro de conexão. Verifique sua internet e tente novamente.');
      }
      throw new Error(`Erro na comunicação: ${error.message || 'Erro desconhecido'}`);
    }
    return (data || {}) as AnalyzeResponse;
  };

  const notifyResult = (result: AnalyzeResponse, onComplete?: () => void) => {
    const status = result.status;
    const analyzedCount = result.analyzed_count || 0;

    if (status === 'completed') {
      const fallback = Boolean(result.fallback_sent);
      toast({
        title: fallback ? 'Summi da Hora enviado ✅' : 'Summi da Hora concluído ✅',
        description: fallback
          ? 'Não havia demandas prioritárias. Enviamos o resumo de tranquilidade no WhatsApp.'
          : `Resumo enviado no WhatsApp. Conversas analisadas: ${analyzedCount}.`,
      });
      onComplete?.();
      return;
    }

    if (status === 'skipped') {
      const reasonMap: Record<string, string> = {
        no_active_subscription: 'Seu plano não está ativo no momento.',
        missing_phone_number: 'Seu número de WhatsApp não está configurado no perfil.',
      };
      toast({
        title: 'Summi da Hora não executado',
        description: reasonMap[result.reason || ''] || 'Não foi possível executar agora.',
        variant: 'destructive',
      });
      return;
    }

    if (status === 'error') {
      toast({
        title: 'Erro no Summi da Hora',
        description: result.error || result.reason || 'Falha ao executar o Summi da Hora.',
        variant: 'destructive',
      });
    }
  };

  const pollUntilDone = async (jobId: string, onComplete?: () => void): Promise<void> => {
    for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt += 1) {
      await sleep(POLL_INTERVAL_MS);
      const statusResult = await invokeAnalyze({ jobId });
      if (statusResult.status === 'processing') {
        continue;
      }
      notifyResult(statusResult, onComplete);
      return;
    }

    toast({
      title: 'Summi da Hora em andamento',
      description: 'Seu resumo está processando em segundo plano e chegará no WhatsApp.',
    });
  };

  const startAnalysis = async (onComplete?: () => void) => {
    try {
      if (!user) {
        toast({
          title: 'Erro',
          description: 'Usuário não autenticado',
          variant: 'destructive',
        });
        return;
      }

      setIsAnalyzing(true);
      const result = await invokeAnalyze({});

      if (result.status === 'processing' && result.job_id) {
        toast({
          title: 'Summi da Hora iniciado',
          description: 'Estamos finalizando o seu resumo. Aguarde alguns segundos...',
        });
        await pollUntilDone(result.job_id, onComplete);
      } else {
        notifyResult(result, onComplete);
      }

    } catch (error) {
      toast({
        title: 'Erro na Análise',
        description: error instanceof Error ? error.message : 'Falha ao iniciar a classificação das mensagens',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return {
    isAnalyzing,
    startAnalysis
  };
};
