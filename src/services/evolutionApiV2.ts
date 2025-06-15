
import { supabase } from '@/integrations/supabase/client';

export interface InstanceCreateResult {
  success: boolean;
  instanceName?: string;
  status?: string;
  webhookConfigured?: boolean;
  error?: string;
}

export interface QRCodeResult {
  success: boolean;
  qrCode?: string;
  error?: string;
  alreadyConnected?: boolean;
  instanceNotFound?: boolean;
}

export interface StatusResult {
  success: boolean;
  status?: string;
  error?: string;
}

export interface ConnectionResult {
  success: boolean;
  state: 'needs_phone_number' | 'needs_qr_code' | 'is_connecting' | 'already_connected' | 'error';
  instanceName?: string;
  message?: string;
  error?: string;
}

// Função para inicializar a conexão (cria a instância se não existir)
export const initializeConnection = async (): Promise<ConnectionResult> => {
  console.log(`[Evolution API v2] Inicializando conexão...`);
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase.functions.invoke('evolution-api-handler', {
      body: { 
        action: 'initialize-connection',
      },
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
    });

    if (error) {
      console.error(`[Evolution API v2] Erro na função:`, error);
      throw error;
    }

    if (!data.success) {
      console.error(`[Evolution API v2] Resposta de erro:`, data);
      throw new Error(data.error || 'Erro desconhecido na inicialização');
    }
    
    console.log(`[Evolution API v2] Inicialização concluída:`, data);
    return data;
  } catch (error) {
    console.error(`[Evolution API v2] Erro na inicialização:`, error);
    return {
      success: false,
      state: 'error',
      error: error.message || 'Erro inesperado na inicialização'
    };
  }
};

// Função para obter QR Code (só para instâncias já existentes)
export const getQRCode = async (instanceName: string): Promise<QRCodeResult> => {
  console.log(`[Evolution API v2] Obtendo QR Code: ${instanceName}`);
  
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase.functions.invoke('evolution-generate-qr', {
      body: { instanceName },
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
    });

    if (error) {
      console.error(`[Evolution API v2] Erro na função QR:`, error);
      throw error;
    }

    if (!data.success) {
      console.error(`[Evolution API v2] Erro ao obter QR Code:`, data);
      return {
        success: false,
        error: data.error || 'Erro ao gerar QR Code',
        alreadyConnected: data.alreadyConnected,
        instanceNotFound: data.instanceNotFound
      };
    }
    
    console.log(`[Evolution API v2] QR Code obtido com sucesso`);
    return data;
  } catch (error) {
    console.error(`[Evolution API v2] Erro ao obter QR Code:`, error);
    return {
      success: false,
      error: error.message || 'Erro inesperado ao obter QR Code'
    };
  }
};

// Função para verificar status da conexão
export const getConnectionStatus = async (instanceName: string): Promise<StatusResult> => {
  console.log(`[Evolution API v2] Verificando status: ${instanceName}`);
  
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase.functions.invoke('evolution-api-handler', {
      body: { 
        action: 'get-status',
        instanceName
      },
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
    });

    if (error) {
      console.error(`[Evolution API v2] Erro na função status:`, error);
      throw error;
    }

    if (!data.success) {
      console.error(`[Evolution API v2] Erro no status:`, data);
      return { success: false, status: 'DISCONNECTED', error: data.error };
    }
    
    console.log(`[Evolution API v2] Status verificado:`, data.status);
    return data;
  } catch (error) {
    console.error(`[Evolution API v2] Erro ao verificar status:`, error);
    return { success: false, status: 'DISCONNECTED', error: error.message };
  }
};

// Função para fazer logout/desconectar
export const logoutInstance = async (instanceName: string): Promise<{ success: boolean; message?: string; error?: string }> => {
  console.log(`[Evolution API v2] Fazendo logout: ${instanceName}`);
  
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase.functions.invoke('evolution-api-handler', {
      body: { 
        action: 'logout',
        instanceName 
      },
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
    });

    if (error) {
      console.error(`[Evolution API v2] Erro na função logout:`, error);
      throw error;
    }

    if (!data.success) {
      console.error(`[Evolution API v2] Erro no logout:`, data);
      throw new Error(data.error || 'Erro no logout');
    }
    
    console.log(`[Evolution API v2] Logout realizado com sucesso`);
    return data;
  } catch (error) {
    console.error(`[Evolution API v2] Erro no logout:`, error);
    throw error;
  }
};

// Função para deletar instância
export const deleteInstance = async (instanceName: string): Promise<{ success: boolean; message?: string; error?: string }> => {
  console.log(`[Evolution API v2] Deletando instância: ${instanceName}`);
  
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase.functions.invoke('evolution-api-handler', {
      body: { 
        action: 'delete',
        instanceName 
      },
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
    });

    if (error) {
      console.error(`[Evolution API v2] Erro na função delete:`, error);
      throw error;
    }

    if (!data.success) {
      console.error(`[Evolution API v2] Erro ao deletar:`, data);
      throw new Error(data.error || 'Erro ao deletar instância');
    }
    
    console.log(`[Evolution API v2] Instância deletada com sucesso`);
    return data;
  } catch (error) {
    console.error(`[Evolution API v2] Erro ao deletar instância:`, error);
    throw error;
  }
};
