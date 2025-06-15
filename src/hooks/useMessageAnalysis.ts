
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

      // Chamar edge function - verificar se função existe
      console.log('[MESSAGE_ANALYSIS] Tentando chamar função analyze-messages...');
      
      const { data, error } = await supabase.functions.invoke('analyze-messages', {
        body: payload
      });

      console.log('[MESSAGE_ANALYSIS] Resposta completa:', { data, error });

      // Verificar se houve erro na chamada da função
      if (error) {
        console.error('[MESSAGE_ANALYSIS] Erro detalhado na edge function:', {
          message: error.message,
          status: error.status,
          statusText: error.statusText,
          details: error
        });
        
        // Tratar diferentes tipos de erro
        if (error.message?.includes('Function not found') || error.status === 404) {
          throw new Error('Função de análise não encontrada. Verifique se ela foi deployada corretamente.');
        } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
          throw new Error('Erro de conexão. Verifique sua internet e tente novamente.');
        } else {
          throw new Error(`Erro na comunicação: ${error.message || 'Erro desconhecido'}`);
        }
      }

      // Verificar resposta da função
      if (data && !data.success) {
        console.error('[MESSAGE_ANALYSIS] Falha retornada pela função:', data);
        throw new Error(data.error || 'Falha na análise das mensagens');
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
      console.error('[MESSAGE_ANALYSIS] Erro completo ao iniciar análise:', {
        error,
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      setIsAnalyzing(false);
      
      let errorMessage = 'Falha ao iniciar a classificação das mensagens';
      
      if (error instanceof Error) {
        errorMessage = error.message;
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
