
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useMessageAnalysis = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Função para iniciar a análise das mensagens
  const startAnalysis = async (onComplete?: () => void) => {
    if (!user) {
      console.error('[MESSAGE_ANALYSIS] Usuário não autenticado');
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    console.log('[MESSAGE_ANALYSIS] Iniciando análise para usuário:', user.id);

    try {
      // Payload com apenas o userId necessário
      const payload = { userId: user.id };
      console.log('[MESSAGE_ANALYSIS] Enviando payload:', payload);

      // Chamar edge function com timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos timeout

      const { data, error } = await supabase.functions.invoke('analyze-messages', {
        body: payload,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log('[MESSAGE_ANALYSIS] Resposta da edge function:', { data, error });

      if (error) {
        console.error('[MESSAGE_ANALYSIS] Erro na edge function:', error);
        throw new Error(`Erro na comunicação: ${error.message}`);
      }

      if (data && !data.success) {
        console.error('[MESSAGE_ANALYSIS] Falha retornada pela função:', data);
        throw new Error(data.error || 'Falha na análise');
      }

      console.log('[MESSAGE_ANALYSIS] Análise iniciada com sucesso');

      toast({
        title: "Análise Iniciada! 🔄",
        description: "Suas mensagens estão sendo classificadas. Aguarde 60 segundos...",
      });

      // Aguardar 60 segundos e depois executar callback de conclusão
      setTimeout(() => {
        setIsAnalyzing(false);
        toast({
          title: "Análise Concluída! ✅",
          description: "Suas mensagens foram classificadas. Recarregando...",
        });
        
        // Executar callback se fornecido (para recarregar dados)
        if (onComplete) {
          onComplete();
        }
      }, 60000); // 60 segundos

    } catch (error) {
      console.error('[MESSAGE_ANALYSIS] Erro ao iniciar análise:', error);
      setIsAnalyzing(false);
      
      let errorMessage = 'Falha ao iniciar a classificação das mensagens';
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Timeout na comunicação com o servidor';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Erro na Análise",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return {
    isAnalyzing,
    startAnalysis
  };
};
