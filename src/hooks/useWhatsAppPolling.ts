
import { useRef, useCallback } from 'react';

// Hook responsável apenas por lidar com timers e polling do WhatsApp
export const useWhatsAppPolling = () => {
  // Refs de controle dos timers
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const qrTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingActiveRef = useRef(false);

  // Função para parar todos timers/polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (qrTimeoutRef.current) {
      clearTimeout(qrTimeoutRef.current);
      qrTimeoutRef.current = null;
    }
    isPollingActiveRef.current = false;
  }, []);

  // Hook retorna refs e função de parada, que serão controlados pelo manager
  return {
    pollingIntervalRef,
    qrTimeoutRef,
    isPollingActiveRef,
    stopPolling,
  };
};
