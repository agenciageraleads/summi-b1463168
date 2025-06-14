
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
    console.log('[useInstanceRestart] INICIANDO RESTART da instância:', instanceName);
    
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Usuário não autenticado');
      }

      console.log('[useInstanceRestart] Chamando função de restart...');
      const response = await supabase.functions.invoke('evolution-restart-instance', {
        body: { instanceName },
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (response.error) {
        console.error('[useInstanceRestart] ERRO ao reiniciar instância:', response.error);
        throw response.error;
      }

      console.log('[useInstanceRestart] Instância reiniciada com sucesso! Aguardando 3s...');
      
      // Aguardar 3 segundos e tentar gerar novo QR Code
      setTimeout(async () => {
        try {
          console.log('[useInstanceRestart] Gerando novo QR Code após restart...');
          const qrResult = await getQRCode(instanceName);
          
          if (qrResult.success && qrResult.qrCode) {
            console.log('[useInstanceRestart] QR Code gerado com sucesso após restart!');
            onQRCodeChange?.(qrResult.qrCode);
            onRestartComplete(instanceName);
            
            toast({
              title: 'Instância Reiniciada',
              description: 'Novo QR Code gerado. Escaneie novamente.',
            });
          } else {
            console.error('[useInstanceRestart] Falha ao gerar QR Code após restart:', qrResult.error);
            throw new Error(qrResult.error || 'Erro ao gerar QR Code após restart');
          }
        } catch (qrError) {
          console.error('[useInstanceRestart] Erro ao gerar QR Code após restart:', qrError);
          toast({
            title: 'Erro',
            description: 'Instância reiniciada, mas falha ao gerar novo QR Code',
            variant: 'destructive',
          });
        }
      }, 3000);
      
    } catch (error) {
      console.error('[useInstanceRestart] ERRO CRÍTICO no restart:', error);
      toast({
        title: 'Erro Crítico',
        description: 'Não foi possível reiniciar a instância. Tente novamente.',
        variant: 'destructive',
      });
    }
  }, [onQRCodeChange, onRestartComplete, toast]);

  return {
    restartInstance,
  };
};
