
import { supabase } from '@/integrations/supabase/client';

export type ConnectionState = 
  | 'needs_phone_number'
  | 'needs_qr_code'
  | 'is_connecting'
  | 'already_connected'
  | 'error';

export interface ConnectionResult {
  success: boolean;
  state: ConnectionState;
  instanceName?: string;
  message?: string;
  error?: string;
  qrCode?: string;
}

/**
 * Função principal: Inicializar conexão com lógica de estados inteligente
 * Esta função verifica o estado atual e decide o próximo passo automaticamente
 */
export const initializeConnection = async (): Promise<ConnectionResult> => {
  console.log('[WhatsApp Service] Inicializando conexão...');
  
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase.functions.invoke('evolution-api-handler', {
      body: { action: 'initialize-connection' },
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
    });

    if (error) throw error;
    
    console.log('[WhatsApp Service] Estado da conexão:', data);
    return data;
  } catch (error) {
    console.error('[WhatsApp Service] Erro na inicialização:', error);
    return {
      success: false,
      state: 'error',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
};

/**
 * Obter QR Code para conexão
 */
export const getQRCode = async (instanceName: string): Promise<ConnectionResult> => {
  console.log('[WhatsApp Service] Obtendo QR Code:', instanceName);
  
  try {
    const { data, error } = await supabase.functions.invoke('evolution-api-handler', {
      body: { 
        action: 'get-qrcode',
        instanceName 
      }
    });

    if (error) throw error;
    
    console.log('[WhatsApp Service] QR Code obtido com sucesso');
    return {
      success: true,
      state: 'needs_qr_code',
      qrCode: data.qrCode
    };
  } catch (error) {
    console.error('[WhatsApp Service] Erro ao obter QR Code:', error);
    return {
      success: false,
      state: 'error',
      error: error instanceof Error ? error.message : 'Erro ao obter QR Code'
    };
  }
};

/**
 * Desconectar WhatsApp e remover instância
 */
export const disconnectWhatsApp = async (): Promise<ConnectionResult> => {
  console.log('[WhatsApp Service] Desconectando WhatsApp...');
  
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase.functions.invoke('evolution-api-handler', {
      body: { action: 'disconnect' },
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
    });

    if (error) throw error;
    
    console.log('[WhatsApp Service] Desconectado com sucesso');
    return {
      success: true,
      state: 'needs_phone_number', // Volta ao estado inicial
      message: data.message
    };
  } catch (error) {
    console.error('[WhatsApp Service] Erro na desconexão:', error);
    return {
      success: false,
      state: 'error',
      error: error instanceof Error ? error.message : 'Erro ao desconectar'
    };
  }
};

/**
 * Verificar status da conexão periodicamente
 */
export const checkConnectionStatus = async (instanceName: string): Promise<'open' | 'close' | 'connecting'> => {
  try {
    const { data, error } = await supabase.functions.invoke('evolution-connection-state', {
      body: { instanceName }
    });

    if (error || !data.success) {
      return 'close';
    }

    const state = data.state?.toLowerCase();
    if (state === 'open') return 'open';
    if (state === 'connecting') return 'connecting';
    return 'close';
  } catch (error) {
    console.error('[WhatsApp Service] Erro ao verificar status:', error);
    return 'close';
  }
};
