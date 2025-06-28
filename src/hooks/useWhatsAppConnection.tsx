
// ABOUTME: Hook principal para gerenciar conexão WhatsApp - VERSÃO CORRIGIDA
// ABOUTME: Implementa estado de conexão com códigos de pareamento e QR code
import { useState, useCallback, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';
import { createInstance, getConnectionState, deleteInstance, ConnectionResult } from '@/services/evolutionApi';

export type ConnectionState = 'NO_CONNECTION' | 'AWAITING_CONNECTION' | 'CONNECTED' | 'ERROR';

export interface WhatsAppConnectionData {
  state: ConnectionState;
  instanceName: string | null;
  pairingCode: string | null;
  qrCode: string | null;
  message: string;
  error: string | null;
  isLoading: boolean;
  isPolling: boolean;
}

export const useWhatsAppConnection = () => {
  const { toast } = useToast();
  const { profile, refreshProfile } = useProfile();
  
  const [connectionData, setConnectionData] = useState<WhatsAppConnectionData>({
    state: 'NO_CONNECTION',
    instanceName: null,
    pairingCode: null,
    qrCode: null,
    message: 'Pronto para conectar',
    error: null,
    isLoading: false,
    isPolling: false
  });

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Limpar polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setConnectionData(prev => ({ ...prev, isPolling: false }));
  }, []);

  // Iniciar polling para verificar conexão
  const startPolling = useCallback((instanceName: string) => {
    console.log(`[WhatsApp Connection] 🔄 Iniciando polling para ${instanceName}`);
    
    stopPolling();
    setConnectionData(prev => ({ ...prev, isPolling: true }));

    const checkConnection = async () => {
      if (!isMountedRef.current) return;
      
      try {
        const state = await getConnectionState(instanceName);
        console.log(`[WhatsApp Connection] 📊 Estado atual: ${state}`);
        
        if (state === 'open' || state === 'connected') {
          console.log(`[WhatsApp Connection] ✅ Conectado com sucesso!`);
          stopPolling();
          setConnectionData(prev => ({
            ...prev,
            state: 'CONNECTED',
            message: 'WhatsApp conectado com sucesso!',
            isPolling: false,
            pairingCode: null,
            qrCode: null
          }));
          
          toast({
            title: "Conectado!",
            description: "Seu WhatsApp foi conectado com sucesso.",
            duration: 5000
          });
          
          await refreshProfile();
        }
      } catch (error) {
        console.error(`[WhatsApp Connection] ❌ Erro no polling:`, error);
      }
    };

    // Verificação inicial após 3 segundos
    setTimeout(checkConnection, 3000);
    
    // Polling a cada 7 segundos
    pollingIntervalRef.current = setInterval(checkConnection, 7000);

    // Timeout após 90 segundos
    setTimeout(() => {
      if (isMountedRef.current && pollingIntervalRef.current) {
        stopPolling();
        setConnectionData(prev => ({
          ...prev,
          message: 'Código expirado. Gere um novo código para continuar.',
          isPolling: false
        }));
      }
    }, 90000);
  }, [stopPolling, toast, refreshProfile]);

  // Função principal para conectar
  const connect = useCallback(async () => {
    console.log(`[WhatsApp Connection] 🚀 Iniciando processo de conexão`);
    
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
      state: 'NO_CONNECTION',
      isLoading: true,
      message: 'Criando instância do WhatsApp...',
      error: null,
      pairingCode: null,
      qrCode: null
    }));

    try {
      console.log(`[WhatsApp Connection] 📡 Chamando serviço de criação`);
      
      const result: ConnectionResult = await createInstance();
      
      console.log(`[WhatsApp Connection] 📨 Resultado recebido:`, {
        success: result.success,
        hasInstanceName: !!result.instanceName,
        hasPairingCode: !!result.pairingCode,
        hasQrCode: !!result.qrCode,
        state: result.state
      });

      if (!result.success) {
        throw new Error(result.error || 'Erro na criação da instância');
      }

      // Verificar se já está conectado
      if (result.state === 'already_connected') {
        setConnectionData(prev => ({
          ...prev,
          state: 'CONNECTED',
          instanceName: result.instanceName || prev.instanceName,
          message: result.message || 'WhatsApp já conectado',
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

      // Configurar estado de aguardando conexão
      setConnectionData(prev => ({
        ...prev,
        state: 'AWAITING_CONNECTION',
        instanceName: result.instanceName || null,
        pairingCode: result.pairingCode || null,
        qrCode: result.qrCode || null,
        message: result.pairingCode 
          ? 'Use o código de pareamento ou escaneie o QR Code'
          : result.qrCode 
            ? 'Escaneie o QR Code com seu WhatsApp'
            : 'Conectando...',
        isLoading: false
      }));

      // Iniciar polling se temos uma instância
      if (result.instanceName) {
        startPolling(result.instanceName);
      }

      toast({
        title: "Códigos gerados",
        description: result.pairingCode 
          ? "Use o código de pareamento para conectar rapidamente"
          : "Escaneie o QR Code para conectar",
        duration: 5000
      });

    } catch (error: any) {
      console.error(`[WhatsApp Connection] ❌ Erro no processo:`, error);
      
      setConnectionData(prev => ({
        ...prev,
        state: 'ERROR',
        error: error.message,
        message: 'Erro ao criar instância',
        isLoading: false
      }));

      toast({
        title: "Erro na conexão",
        description: error.message || 'Não foi possível criar a instância do WhatsApp',
        variant: "destructive"
      });
    }
  }, [profile, toast, refreshProfile, startPolling]);

  // Função para desconectar
  const disconnect = useCallback(async () => {
    if (!profile?.instance_name) return;
    
    console.log(`[WhatsApp Connection] 🔌 Desconectando instância: ${profile.instance_name}`);
    
    setConnectionData(prev => ({ ...prev, isLoading: true, message: 'Desconectando...' }));
    stopPolling();
    
    try {
      await deleteInstance(profile.instance_name);
      
      setConnectionData({
        state: 'NO_CONNECTION',
        instanceName: null,
        pairingCode: null,
        qrCode: null,
        message: 'Pronto para conectar',
        error: null,
        isLoading: false,
        isPolling: false
      });
      
      await refreshProfile();
      
      toast({
        title: "Desconectado",
        description: "WhatsApp desconectado com sucesso."
      });
    } catch (error: any) {
      setConnectionData(prev => ({
        ...prev,
        isLoading: false,
        error: error.message,
        message: 'Erro ao desconectar'
      }));
      
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    }
  }, [profile, stopPolling, refreshProfile, toast]);

  // Função para gerar novo código
  const generateNewCode = useCallback(async () => {
    console.log(`[WhatsApp Connection] 🔄 Gerando novo código`);
    await connect();
  }, [connect]);

  // Função para resetar estado
  const reset = useCallback(() => {
    console.log(`[WhatsApp Connection] 🔄 Resetando estado`);
    stopPolling();
    setConnectionData({
      state: 'NO_CONNECTION',
      instanceName: null,
      pairingCode: null,
      qrCode: null,
      message: 'Pronto para conectar',
      error: null,
      isLoading: false,
      isPolling: false
    });
  }, [stopPolling]);

  // Definir estado inicial baseado no perfil
  useEffect(() => {
    if (profile?.instance_name && connectionData.state === 'NO_CONNECTION' && !connectionData.isLoading) {
      console.log(`[WhatsApp Connection] 📋 Perfil carregado com instância: ${profile.instance_name}`);
      
      // Verificar automaticamente o estado da conexão
      const checkInitialState = async () => {
        try {
          const state = await getConnectionState(profile.instance_name!);
          
          if (state === 'open' || state === 'connected') {
            setConnectionData(prev => ({
              ...prev,
              state: 'CONNECTED',
              instanceName: profile.instance_name,
              message: 'WhatsApp conectado'
            }));
          } else {
            setConnectionData(prev => ({
              ...prev,
              state: 'NO_CONNECTION',
              instanceName: profile.instance_name,
              message: 'Pronto para conectar'
            }));
          }
        } catch (error) {
          console.error(`[WhatsApp Connection] ❌ Erro na verificação inicial:`, error);
        }
      };
      
      checkInitialState();
    }
  }, [profile, connectionData.state, connectionData.isLoading]);

  // Cleanup ao desmontar
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
