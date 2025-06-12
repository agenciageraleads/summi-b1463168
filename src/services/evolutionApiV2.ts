
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
}

export interface StatusResult {
  success: boolean;
  status?: string;
  error?: string;
}

// Função para criar instância com webhook configurado automaticamente
export const createInstanceWithWebhook = async (instanceName: string): Promise<InstanceCreateResult> => {
  console.log(`[Evolution API v2] Criando instância com webhook: ${instanceName}`);
  
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase.functions.invoke('evolution-api-handler', {
      body: { 
        action: 'create',
        instanceName 
      },
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
    });

    if (error) throw error;
    
    console.log(`[Evolution API v2] Instância criada:`, data);
    return data;
  } catch (error) {
    console.error(`[Evolution API v2] Erro na criação:`, error);
    throw error;
  }
};

// Função para obter QR Code
export const getQRCode = async (instanceName: string): Promise<QRCodeResult> => {
  console.log(`[Evolution API v2] Obtendo QR Code: ${instanceName}`);
  
  try {
    const { data, error } = await supabase.functions.invoke('evolution-api-handler', {
      body: { 
        action: 'get-qrcode',
        instanceName 
      }
    });

    if (error) throw error;
    
    console.log(`[Evolution API v2] QR Code obtido com sucesso`);
    return data;
  } catch (error) {
    console.error(`[Evolution API v2] Erro ao obter QR Code:`, error);
    throw error;
  }
};

// Função para verificar status da conexão
export const getConnectionStatus = async (instanceName: string): Promise<StatusResult> => {
  console.log(`[Evolution API v2] Verificando status: ${instanceName}`);
  
  try {
    const { data, error } = await supabase.functions.invoke('evolution-api-handler', {
      body: { 
        action: 'get-status',
        instanceName 
      }
    });

    if (error) throw error;
    
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

    if (error) throw error;
    
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

    if (error) throw error;
    
    console.log(`[Evolution API v2] Instância deletada com sucesso`);
    return data;
  } catch (error) {
    console.error(`[Evolution API v2] Erro ao deletar instância:`, error);
    throw error;
  }
};
