
// Serviço unificado para conexão WhatsApp - VERSÃO DEFINITIVA
import { supabase } from '@/integrations/supabase/client';

export interface ConnectionResult {
  success: boolean;
  state: 'needs_phone_number' | 'needs_qr_code' | 'is_connecting' | 'already_connected' | 'error';
  instanceName?: string;
  qrCode?: string;
  message?: string;
  error?: string;
}

export interface StatusResult {
  success: boolean;
  status: string;
  state?: string;
  error?: string;
}

// Função auxiliar para obter sessão
const getSession = async () => {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    throw new Error('Usuário não autenticado');
  }
  return sessionData.session;
};

// Inicializar conexão WhatsApp
export const initializeWhatsAppConnection = async (): Promise<ConnectionResult> => {
  console.log('[WhatsApp Connection] Inicializando conexão...');
  
  try {
    const session = await getSession();

    const response = await supabase.functions.invoke('evolution-api-handler', {
      body: { action: 'initialize-connection' },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (response.error) {
      console.error('[WhatsApp Connection] Erro na inicialização:', response.error);
      return {
        success: false,
        state: 'error',
        error: response.error.message || 'Erro ao inicializar conexão'
      };
    }

    const result = response.data;
    console.log('[WhatsApp Connection] Resultado da inicialização:', result);

    return {
      success: true,
      state: result.state || 'error',
      instanceName: result.instanceName,
      message: result.message
    };
  } catch (error) {
    console.error('[WhatsApp Connection] Erro inesperado:', error);
    return {
      success: false,
      state: 'error',
      error: error instanceof Error ? error.message : 'Erro inesperado'
    };
  }
};

// Gerar QR Code
export const generateQRCode = async (instanceName: string): Promise<ConnectionResult> => {
  console.log('[WhatsApp Connection] Gerando QR Code para:', instanceName);
  
  try {
    const session = await getSession();

    const response = await supabase.functions.invoke('evolution-generate-qr', {
      body: { instanceName },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (response.error) {
      console.error('[WhatsApp Connection] Erro ao gerar QR:', response.error);
      return {
        success: false,
        state: 'error',
        error: response.error.message || 'Erro ao gerar QR Code'
      };
    }

    const result = response.data;
    console.log('[WhatsApp Connection] QR Code gerado:', result.success ? 'Sucesso' : result.error);

    if (result.success && result.qrCode) {
      return {
        success: true,
        state: 'needs_qr_code',
        qrCode: result.qrCode,
        message: 'QR Code gerado com sucesso'
      };
    } else if (result.alreadyConnected) {
      return {
        success: true,
        state: 'already_connected',
        message: 'WhatsApp já está conectado'
      };
    } else {
      return {
        success: false,
        state: 'error',
        error: result.error || 'Erro ao gerar QR Code'
      };
    }
  } catch (error) {
    console.error('[WhatsApp Connection] Erro inesperado ao gerar QR:', error);
    return {
      success: false,
      state: 'error',
      error: error instanceof Error ? error.message : 'Erro inesperado'
    };
  }
};

// Verificar status da conexão
export const checkConnectionStatus = async (instanceName: string): Promise<StatusResult> => {
  console.log('[WhatsApp Connection] Verificando status de:', instanceName);
  
  try {
    const session = await getSession();

    const response = await supabase.functions.invoke('evolution-connection-state', {
      body: { instanceName },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (response.error) {
      console.error('[WhatsApp Connection] Erro ao verificar status:', response.error);
      return {
        success: false,
        status: 'disconnected',
        error: response.error.message
      };
    }

    const result = response.data;
    console.log('[WhatsApp Connection] Status verificado:', result);

    return {
      success: true,
      status: result.state || 'disconnected',
      state: result.state
    };
  } catch (error) {
    console.error('[WhatsApp Connection] Erro inesperado ao verificar status:', error);
    return {
      success: false,
      status: 'disconnected',
      error: error instanceof Error ? error.message : 'Erro inesperado'
    };
  }
};

// Reiniciar instância
export const restartInstance = async (instanceName: string): Promise<ConnectionResult> => {
  console.log('[WhatsApp Connection] Reiniciando instância:', instanceName);
  
  try {
    const session = await getSession();

    const response = await supabase.functions.invoke('evolution-restart-instance', {
      body: { instanceName },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (response.error) {
      console.error('[WhatsApp Connection] Erro ao reiniciar:', response.error);
      return {
        success: false,
        state: 'error',
        error: response.error.message || 'Erro ao reiniciar instância'
      };
    }

    const result = response.data;
    console.log('[WhatsApp Connection] Instância reiniciada:', result.success ? 'Sucesso' : result.error);

    return {
      success: result.success,
      state: result.success ? 'needs_qr_code' : 'error',
      message: result.success ? 'Instância reiniciada com sucesso' : undefined,
      error: result.success ? undefined : result.error
    };
  } catch (error) {
    console.error('[WhatsApp Connection] Erro inesperado ao reiniciar:', error);
    return {
      success: false,
      state: 'error',
      error: error instanceof Error ? error.message : 'Erro inesperado'
    };
  }
};

// Desconectar WhatsApp (apenas logout)
export const disconnectWhatsApp = async (): Promise<ConnectionResult> => {
  console.log('[WhatsApp Service] Desconectando WhatsApp...');
  
  try {
    const session = await getSession();

    const { data, error } = await supabase.functions.invoke('evolution-logout-instance', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) {
      console.error('[WhatsApp Service] Erro na desconexão:', error);
      if (error.status === 401 || (error.message && error.message.includes("expirada"))) {
        return {
          success: false,
          state: 'error',
          error: 'Sessão expirada. Por favor, faça login novamente.'
        };
      }
      return {
        success: false,
        state: 'error',
        error: error.message || 'Erro ao desconectar'
      };
    }
    
    if (data && !data.success && data.error && /sessão|expirada|inválida|autentic/.test(data.error)) {
      return {
        success: false,
        state: 'error',
        error: 'Sessão expirada ou inválida. Faça login novamente.'
      };
    }

    console.log('[WhatsApp Service] Desconectado com sucesso');
    return {
      success: true,
      state: 'needs_phone_number',
      message: data?.message || 'WhatsApp desconectado com sucesso'
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

// Deletar instância (para quando deletar conta)
export const deleteWhatsAppInstance = async (): Promise<ConnectionResult> => {
  console.log('[WhatsApp Service] Deletando instância WhatsApp...');
  
  try {
    const session = await getSession();

    const { data, error } = await supabase.functions.invoke('evolution-delete-instance', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) {
      console.error('[WhatsApp Service] Erro ao deletar instância:', error);
      return {
        success: false,
        state: 'error',
        error: error.message || 'Erro ao deletar instância'
      };
    }

    console.log('[WhatsApp Service] Instância deletada com sucesso');
    return {
      success: true,
      state: 'needs_phone_number',
      message: data?.message || 'Instância WhatsApp deletada com sucesso'
    };
  } catch (error) {
    console.error('[WhatsApp Service] Erro ao deletar instância:', error);
    return {
      success: false,
      state: 'error',
      error: error instanceof Error ? error.message : 'Erro ao deletar instância'
    };
  }
};
