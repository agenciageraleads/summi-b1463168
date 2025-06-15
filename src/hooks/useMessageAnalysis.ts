
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
      // Chamar edge function que fará a requisição ao webhook
      const { data, error } = await supabase.functions.invoke('analyze-messages', {
        body: { userId: user.id }
      });

      if (error) {
        console.error('[MESSAGE_ANALYSIS] Erro na edge function:', error);
        throw error;
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
      
      toast({
        title: "Erro na Análise",
        description: "Falha ao iniciar a classificação das mensagens",
        variant: "destructive",
      });
    }
  };

  return {
    isAnalyzing,
    startAnalysis
  };
};
