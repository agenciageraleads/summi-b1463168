
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getQRCode } from '@/services/evolutionApiV2';
import { useToast } from '@/hooks/use-toast';

interface UseInstanceRestartProps {
  onQRCodeChange?: (qrCode: string | null) => void;
  onRestartComplete: (instanceName: string) => void;
}

export const useInstanceRestart = ({
  onQRCodeChange,
  onRestartComplete,
}: UseInstanceRestartProps) => {
  const { toast } = useToast();

  // Função para reiniciar instância quando necessário
  const restartInstance = useCallback(async (instanceName: string) => {
    console.log('[useInstanceRestart] Reiniciando instância por timeout:', instanceName);
    
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error('Usuário não autenticado');

      const response = await supabase.functions.invoke('evolution-restart-instance', {
        body: { instanceName },
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (response.error) {
        console.error('[useInstanceRestart] Erro ao reiniciar instância:', response.error);
        throw response.error;
      }

      console.log('[useInstanceRestart] Instância reiniciada com sucesso');
      
      // Aguardar 3 segundos e tentar gerar novo QR Code
      setTimeout(async () => {
        console.log('[useInstanceRestart] Gerando novo QR Code após restart...');
        const qrResult = await getQRCode(instanceName);
        
        if (qrResult.success && qrResult.qrCode) {
          onQRCodeChange?.(qrResult.qrCode);
          onRestartComplete(instanceName);
          
          toast({
            title: 'Instância Reiniciada',
            description: 'Novo QR Code gerado. Escaneie novamente.',
          });
        }
      }, 3000);
      
    } catch (error) {
      console.error('[useInstanceRestart] Erro no restart:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível reiniciar a instância',
        variant: 'destructive',
      });
    }
  }, [onQRCodeChange, onRestartComplete, toast]);

  return {
    restartInstance,
  };
};
