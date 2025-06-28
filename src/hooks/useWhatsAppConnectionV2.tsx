
// ABOUTME: Hook otimizado para conexão WhatsApp usando nova arquitetura de Edge Functions
// ABOUTME: Implementa fluxo robusto com polling inteligente e estados claros
import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';

export type WhatsAppConnectionState = 
  | 'not_connected'
  | 'awaiting_pairing' 
  | 'connected'
  | 'error'
  | 'loading';

export interface WhatsAppConnectionData {
  state: WhatsAppConnectionState;
  instanceName: string | null;
  pairingCode: string | null;
  qrBase64: string | null;
  message: string;
  error: string | null;
  isLoading: boolean;
}

export const useWhatsAppConnectionV2 = () => {
  const { toast } = useToast();
  const { profile, refreshProfile } = useProfile();
  
  const [connectionData, setConnectionData] = useState<WhatsAppConnectionData>({
    state: 'not_connected',
    instanceName: null,
    pairingCode: null,
    qrBase64: null,
    message: 'Pronto para conectar',
    error: null,
    isLoading: false
  });

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Limpar timers
  const clearTimers = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Iniciar polling para verificar conexão
  const startPolling = useCallback((instanceName: string) => {
    console.log('[WhatsApp V2] 🔄 Iniciando polling para:', instanceName);
    
    clearTimers();

    const checkConnection = async () => {
      if (!isMountedRef.current) return;
      
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) return;

        const { data, error } = await supabase.functions.invoke('get-connection-status', {
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
        });

        if (error) {
          console.error('[WhatsApp V2] ❌ Erro no polling:', error);
          return;
        }

        console.log('[WhatsApp V2] 📊 Status:', data.status);

        if (data.status === 'connected') {
          console.log('[WhatsApp V2] ✅ Conectado!');
          clearTimers();
          
          setConnectionData(prev => ({
            ...prev,
            state: 'connected',
            message: 'WhatsApp conectado com sucesso!',
            pairingCode: null,
            qrBase64: null
          }));

          toast({
            title: "Conectado!",
            description: "Seu WhatsApp foi conectado com sucesso.",
            duration: 5000
          });

          await refreshProfile();
        }
      } catch (error) {
        console.error('[WhatsApp V2] ❌ Erro no polling:', error);
      }
    };

    // Polling a cada 5 segundos
    pollingIntervalRef.current = setInterval(checkConnection, 5000);

    // Timeout de 90 segundos
    timeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        console.log('[WhatsApp V2] ⏰ Timeout do código');
        clearTimers();
        setConnectionData(prev => ({
          ...prev,
          message: 'Código expirado. Clique em conectar para obter um novo código.'
        }));
      }
    }, 90000);
  }, [clearTimers, toast, refreshProfile]);

  // Função para conectar
  const connect = useCallback(async () => {
    console.log('[WhatsApp V2] 🚀 Iniciando conexão');
    
    if (!profile?.numero) {
      toast({
        title: "Configuração necessária",
        description: "Configure seu número de telefone no perfil antes de conectar.",
        variant: "destructive"
      });
      return;
    }

    setConnectionData(prev => ({
      ...prev,
      state: 'loading',
      isLoading: true,
      message: 'Conectando...',
      error: null
    }));

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase.functions.invoke('connect-whatsapp', {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (error) {
        throw new Error(error.message || 'Erro na comunicação');
      }

      if (data.error === 'phone_number_required') {
        throw new Error('Configure seu número de telefone no perfil');
      }

      if (data.status === 'already_connected') {
        setConnectionData(prev => ({
          ...prev,
          state: 'connected',
          instanceName: data.instanceName,
          message: 'WhatsApp já conectado',
          isLoading: false
        }));
        
        toast({
          title: "Já conectado",
          description: "Seu WhatsApp já está conectado!",
          duration: 3000
        });
        
        await refreshProfile();
        return;
      }

      if (data.status === 'awaiting_pairing') {
        setConnectionData(prev => ({
          ...prev,
          state: 'awaiting_pairing',
          instanceName: data.instanceName,
          pairingCode: data.pairingCode,
          qrBase64: data.qrBase64,
          message: 'Use o código de pareamento ou escaneie o QR Code',
          isLoading: false
        }));

        // Iniciar polling
        startPolling(data.instanceName);

        toast({
          title: "Códigos gerados",
          description: "Use o código de pareamento ou QR Code para conectar",
          duration: 5000
        });
      }

    } catch (error: any) {
      console.error('[WhatsApp V2] ❌ Erro:', error);
      
      setConnectionData(prev => ({
        ...prev,
        state: 'error',
        error: error.message,
        message: 'Erro na conexão',
        isLoading: false
      }));

      toast({
        title: "Erro na conexão",
        description: error.message || 'Não foi possível conectar o WhatsApp',
        variant: "destructive"
      });
    }
  }, [profile, toast, refreshProfile, startPolling]);

  // Função para desconectar
  const disconnect = useCallback(async () => {
    console.log('[WhatsApp V2] 🔌 Desconectando');
    
    setConnectionData(prev => ({ 
      ...prev, 
      isLoading: true, 
      message: 'Desconectando...' 
    }));
    
    clearTimers();

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase.functions.invoke('disconnect-whatsapp', {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (error) {
        throw new Error(error.message || 'Erro ao desconectar');
      }

      setConnectionData({
        state: 'not_connected',
        instanceName: null,
        pairingCode: null,
        qrBase64: null,
        message: 'Pronto para conectar',
        error: null,
        isLoading: false
      });

      await refreshProfile();

      toast({
        title: "Desconectado",
        description: "WhatsApp desconectado com sucesso.",
        duration: 3000
      });

    } catch (error: any) {
      console.error('[WhatsApp V2] ❌ Erro ao desconectar:', error);
      
      setConnectionData(prev => ({
        ...prev,
        state: 'error',
        error: error.message,
        message: 'Erro ao desconectar',
        isLoading: false
      }));

      toast({
        title: "Erro",
        description: error.message || 'Erro ao desconectar',
        variant: "destructive"
      });
    }
  }, [clearTimers, refreshProfile, toast]);

  // Verificar status inicial
  useEffect(() => {
    const checkInitialStatus = async () => {
      if (!profile?.numero) {
        setConnectionData(prev => ({
          ...prev,
          state: 'not_connected',
          message: 'Configure seu número de telefone no perfil'
        }));
        return;
      }

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) return;

        const { data, error } = await supabase.functions.invoke('get-connection-status', {
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
        });

        if (error) {
          console.error('[WhatsApp V2] ❌ Erro na verificação inicial:', error);
          return;
        }

        if (data.status === 'connected') {
          setConnectionData(prev => ({
            ...prev,
            state: 'connected',
            instanceName: data.instanceName,
            message: 'WhatsApp conectado'
          }));
        } else if (data.status === 'not_found') {
          setConnectionData(prev => ({
            ...prev,
            state: 'not_connected',
            message: 'Pronto para conectar'
          }));
        }
      } catch (error) {
        console.error('[WhatsApp V2] ❌ Erro na verificação inicial:', error);
      }
    };

    if (profile) {
      checkInitialStatus();
    }
  }, [profile]);

  // Cleanup
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearTimers();
    };
  }, [clearTimers]);

  return {
    connectionData,
    connect,
    disconnect
  };
};
