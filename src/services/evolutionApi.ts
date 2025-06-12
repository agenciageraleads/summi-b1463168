
import { supabase } from '@/integrations/supabase/client';

export interface InstanceData {
  instanceName: string;
  status?: string;
}

export interface QRCodeResponse {
  qrCode: string;
}

export interface ConnectionStatus {
  status: string;
}

export const createInstance = async (instanceName: string): Promise<InstanceData> => {
  console.log(`[Evolution API] Criando instância: ${instanceName}`);
  
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase.functions.invoke('evolution-create-instance', {
      body: { instanceName },
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
    });

    if (error) throw error;
    if (!data.success) throw new Error(data.error || 'Erro ao criar instância');

    console.log(`[Evolution API] Instância criada com sucesso:`, data);
    return {
      instanceName: data.instanceName,
      status: data.status
    };
  } catch (error) {
    console.error(`[Evolution API] Erro na criação da instância:`, error);
    throw error;
  }
};

export const generateQRCode = async (instanceName: string): Promise<string> => {
  console.log(`[Evolution API] Gerando QR Code para: ${instanceName}`);
  
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase.functions.invoke('evolution-generate-qr', {
      body: { instanceName },
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
    });

    if (error) throw error;
    if (!data.success) throw new Error(data.error || 'Erro ao gerar QR Code');

    console.log(`[Evolution API] QR Code gerado com sucesso`);
    return data.qrCode;
  } catch (error) {
    console.error(`[Evolution API] Erro ao gerar QR Code:`, error);
    throw error;
  }
};

export const getInstanceStatus = async (instanceName: string): Promise<string> => {
  console.log(`[Evolution API] Verificando status da instância: ${instanceName}`);
  
  try {
    const { data, error } = await supabase.functions.invoke('evolution-get-status', {
      body: { instanceName }
    });

    if (error) {
      console.error(`[Evolution API] Erro ao buscar status:`, error);
      return 'disconnected';
    }

    const status = data.status || 'disconnected';
    console.log(`[Evolution API] Status da instância:`, status);
    return status;
  } catch (error) {
    console.error(`[Evolution API] Erro ao verificar status:`, error);
    return 'disconnected';
  }
};

export const deleteInstance = async (instanceName: string): Promise<void> => {
  console.log(`[Evolution API] Deletando instância: ${instanceName}`);
  
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase.functions.invoke('evolution-delete-instance', {
      body: { instanceName },
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
    });

    if (error) {
      console.error(`[Evolution API] Erro ao deletar instância:`, error);
      throw error;
    }

    console.log(`[Evolution API] Instância deletada com sucesso`);
  } catch (error) {
    console.error(`[Evolution API] Erro ao deletar instância:`, error);
    throw error;
  }
};
