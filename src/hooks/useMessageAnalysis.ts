
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
      // Preparar dados para a edge function
      const requestData = { userId: user.id };
      console.log('[MESSAGE_ANALYSIS] Dados da requisição:', requestData);

      // Chamar edge function que fará a requisição ao webhook
      const { data, error } = await supabase.functions.invoke('analyze-messages', {
        body: requestData
      });

      console.log('[MESSAGE_ANALYSIS] Resposta da edge function:', { data, error });

      if (error) {
        console.error('[MESSAGE_ANALYSIS] Erro na edge function:', error);
        throw error;
      }

      if (data && !data.success) {
        console.error('[MESSAGE_ANALYSIS] Falha retornada pela função:', data);
        throw new Error(data.error || 'Falha na análise');
      }

      console.log('[MESSAGE_ANALYSIS] Análise iniciada com sucesso:', data);

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
      
      if (error.message && typeof error.message === 'string') {
        errorMessage = error.message;
      } else if (error.details && typeof error.details === 'string') {
        errorMessage = error.details;
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
