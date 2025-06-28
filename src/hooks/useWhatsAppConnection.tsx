
// ABOUTME: Hook simplificado para gerenciar conexão WhatsApp com máquina de estados clara
// ABOUTME: Foca apenas nos 4 estados principais e transições entre eles
import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';

// Estados da máquina de estados
export type ConnectionState = 
  | 'NO_CONNECTION'       // Usuário nunca conectou ou desconectou completamente
  | 'AWAITING_CONNECTION' // Instância criada, aguardando pareamento
  | 'CONNECTED'          // WhatsApp conectado e funcionando
  | 'ERROR';             // Erro que requer intervenção do usuário

export interface WhatsAppConnectionData {
  state: ConnectionState;
  isLoading: boolean;
  pairingCode: string | null;
  qrCode: string | null;
  instanceName: string | null;
  message: string;
  error: string | null;
}

export const useWhatsAppConnection = () => {
  const { toast } = useToast();
  const { profile, refreshProfile } = useProfile();
  
  // Estado principal unificado
  const [connectionData, setConnectionData] = useState<WhatsAppConnectionData>({
    state: 'NO_CONNECTION',
    isLoading: false,
    pairingCode: null,
    qrCode: null,
    instanceName: null,
    message: 'Configure seu WhatsApp para começar',
    error: null
  });

  // Refs para controle de polling
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Função para obter sessão válida
  const getSession = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      throw new Error('Usuário não autenticado');
    }
    return sessionData.session;
  }, []);

  // Função para limpar polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // Função para verificar status da conexão
  const checkConnectionStatus = useCallback(async (instanceName: string) => {
    try {
      const session = await getSession();
      
      const { data, error } = await supabase.functions.invoke('evolution-connection-state', {
        body: { instanceName },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      
      const status = data?.state || 'disconnected';
      return status === 'open' || status === 'connected';
    } catch (error) {
      console.error('[WhatsApp Connection] Erro ao verificar status:', error);
      return false;
    }
  }, [getSession]);

  // Função para iniciar polling de status
  const startPolling = useCallback((instanceName: string) => {
    stopPolling();
    
    const checkAndUpdate = async () => {
      if (!isMountedRef.current) return;
      
      const isConnected = await checkConnectionStatus(instanceName);
      if (isConnected) {
        stopPolling();
        setConnectionData(prev => ({
          ...prev,
          state: 'CONNECTED',
          isLoading: false,
          message: 'WhatsApp conectado com sucesso!'
        }));
        
        toast({
          title: "✅ Conectado!",
          description: "Seu WhatsApp foi conectado com sucesso.",
          duration: 3000
        });
        
        await refreshProfile();
      }
    };

    // Primeira verificação após 3 segundos
    setTimeout(checkAndUpdate, 3000);
    
    // Polling a cada 5 segundos
    pollingIntervalRef.current = setInterval(checkAndUpdate, 5000);
    
    // Timeout de 60 segundos para expirar código
    setTimeout(() => {
      if (connectionData.state === 'AWAITING_CONNECTION') {
        setConnectionData(prev => ({
          ...prev,
          message: 'Código expirado. Clique em "Gerar novo código" para continuar.'
        }));
      }
    }, 60000);
  }, [checkConnectionStatus, stopPolling, connectionData.state, toast, refreshProfile]);

  // Função principal para conectar - MELHORADA
  const connect = useCallback(async () => {
    if (!profile?.numero) {
      toast({
        title: 'Informações incompletas',
        description: 'Configure seu número de telefone no perfil.',
        variant: 'destructive'
      });
      return;
    }

    console.log('[WhatsApp Connection] Iniciando processo de conexão...');

    setConnectionData(prev => ({
      ...prev,
      state: 'AWAITING_CONNECTION',
      isLoading: true,
      message: 'Preparando conexão WhatsApp...',
      error: null,
      pairingCode: null,
      qrCode: null
    }));

    try {
      const session = await getSession();

      console.log('[WhatsApp Connection] Chamando evolution-api-handler com action: connect');

      const { data, error } = await supabase.functions.invoke('evolution-api-handler', {
        body: { action: 'connect' },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      console.log('[WhatsApp Connection] Resposta recebida:', { data, error });

      if (error) {
        console.error('[WhatsApp Connection] Erro da função:', error);
        throw error;
      }
      
      if (!data.success) {
        console.error('[WhatsApp Connection] Função retornou erro:', data.error);
        throw new Error(data.error || 'Erro ao conectar');
      }

      // Se já está conectado
      if (data.state === 'already_connected') {
        setConnectionData(prev => ({
          ...prev,
          state: 'CONNECTED',
          isLoading: false,
          message: 'WhatsApp já está conectado!'
        }));
        return;
      }

      // Se gerou códigos com sucesso
      console.log('[WhatsApp Connection] Códigos gerados com sucesso');
      setConnectionData(prev => ({
        ...prev,
        state: 'AWAITING_CONNECTION',
        isLoading: false,
        pairingCode: data.pairingCode,
        qrCode: data.qrCode,
        instanceName: data.instanceName,
        message: 'Use o código de pareamento para conectar seu WhatsApp'
      }));

      if (data.instanceName) {
        startPolling(data.instanceName);
      }

    } catch (error: any) {
      console.error('[WhatsApp Connection] Erro na conexão:', error);
      setConnectionData(prev => ({
        ...prev,
        state: 'ERROR',
        isLoading: false,
        error: error.message || 'Erro inesperado ao conectar',
        message: 'Ocorreu um erro ao tentar conectar'
      }));
      
      toast({
        title: "Erro na Conexão",
        description: error.message || 'Ocorreu um erro.',
        variant: 'destructive'
      });
    }
  }, [profile, getSession, toast, startPolling]);

  // Função para gerar novo código - MELHORADA
  const generateNewCode = useCallback(async () => {
    console.log('[WhatsApp Connection] Gerando novo código...');
    
    setConnectionData(prev => ({
      ...prev,
      isLoading: true,
      message: 'Gerando novo código...'
    }));

    try {
      const session = await getSession();

      const { data, error } = await supabase.functions.invoke('evolution-api-handler', {
        body: { action: 'recreate-for-pairing-code' },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Erro ao gerar novo código');

      setConnectionData(prev => ({
        ...prev,
        isLoading: false,
        pairingCode: data.pairingCode,
        qrCode: data.qrCode,
        instanceName: data.instanceName,
        message: 'Novo código gerado com sucesso!'
      }));

      if (data.instanceName) {
        startPolling(data.instanceName);
      }

      toast({
        title: "Novo código gerado",
        description: "Use o novo código de pareamento para conectar.",
        duration: 5000
      });

    } catch (error: any) {
      console.error('[WhatsApp Connection] Erro ao gerar novo código:', error);
      setConnectionData(prev => ({
        ...prev,
        state: 'ERROR',
        isLoading: false,
        error: error.message || 'Erro ao gerar novo código',
        message: 'Erro ao gerar novo código'
      }));
    }
  }, [getSession, startPolling, toast]);

  // NOVA FUNÇÃO: Desconectar WhatsApp
  const disconnect = useCallback(async () => {
    if (!profile?.instance_name) {
      toast({
        title: 'Nenhuma conexão encontrada',
        description: 'Não há instância para desconectar.',
        variant: 'destructive'
      });
      return;
    }

    setConnectionData(prev => ({
      ...prev,
      isLoading: true,
      message: 'Desconectando WhatsApp...'
    }));

    try {
      const session = await getSession();

      const { data, error } = await supabase.functions.invoke('evolution-api-handler', {
        body: { action: 'delete' },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Erro ao desconectar');

      // Resetar para estado inicial
      setConnectionData({
        state: 'NO_CONNECTION',
        isLoading: false,
        pairingCode: null,
        qrCode: null,
        instanceName: null,
        message: 'WhatsApp desconectado com sucesso',
        error: null
      });

      await refreshProfile();

      toast({
        title: "Desconectado",
        description: "WhatsApp desconectado com sucesso.",
        duration: 3000
      });

    } catch (error: any) {
      console.error('[WhatsApp Connection] Erro ao desconectar:', error);
      setConnectionData(prev => ({
        ...prev,
        state: 'ERROR',
        isLoading: false,
        error: error.message || 'Erro ao desconectar',
        message: 'Erro ao desconectar WhatsApp'
      }));
      
      toast({
        title: "Erro ao Desconectar",
        description: error.message || 'Ocorreu um erro.',
        variant: 'destructive'
      });
    }
  }, [profile, getSession, toast, refreshProfile]);

  // Função para resetar para o estado inicial
  const reset = useCallback(() => {
    stopPolling();
    setConnectionData({
      state: 'NO_CONNECTION',
      isLoading: false,
      pairingCode: null,
      qrCode: null,
      instanceName: null,
      message: 'Configure seu WhatsApp para começar',
      error: null
    });
  }, [stopPolling]);

  // Definir estado inicial baseado no perfil
  useEffect(() => {
    if (!profile) return;

    if (!profile.numero) {
      setConnectionData(prev => ({
        ...prev,
        state: 'NO_CONNECTION',
        message: 'Configure seu número de telefone no perfil'
      }));
    } else if (profile.instance_name) {
      // Verificar se já está conectado
      checkConnectionStatus(profile.instance_name).then(isConnected => {
        if (isConnected) {
          setConnectionData(prev => ({
            ...prev,
            state: 'CONNECTED',
            instanceName: profile.instance_name,
            message: 'WhatsApp conectado e funcionando!'
          }));
        } else {
          setConnectionData(prev => ({
            ...prev,
            state: 'NO_CONNECTION',
            message: 'Pronto para conectar seu WhatsApp'
          }));
        }
      });
    }
  }, [profile, checkConnectionStatus]);

  // Cleanup
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopPolling();
    };
  }, [stopPolling]);

  return {
    connectionData,
    connect,
    disconnect,
    generateNewCode,
    reset
  };
};
