
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

export interface InstanceCheckResult {
  exists: boolean;
  status: string;
  instanceData?: any;
}

// Função para criar uma nova instância
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

// CORREÇÃO: Função para verificar se instância existe
export const checkInstanceExists = async (instanceName: string): Promise<InstanceCheckResult> => {
  console.log(`[Evolution API] Verificando se instância existe: ${instanceName}`);
  
  try {
    const { data, error } = await supabase.functions.invoke('evolution-check-instance', {
      body: { instanceName }
    });

    if (error) throw error;
    
    // CORREÇÃO: Tratar tanto sucesso quanto erro da função
    if (data.success === false) {
      console.error(`[Evolution API] Erro ao verificar instância:`, data.error);
      return { exists: false, status: 'error' };
    }

    console.log(`[Evolution API] Resultado da verificação:`, data);
    return {
      exists: data.exists,
      status: data.status,
      instanceData: data.instanceData
    };
  } catch (error) {
    console.error(`[Evolution API] Erro ao verificar instância:`, error);
    return { exists: false, status: 'error' };
  }
};

// CORREÇÃO: Função para conectar instância e gerar QR Code
export const connectInstance = async (instanceName: string): Promise<string> => {
  console.log(`[Evolution API] Conectando instância: ${instanceName}`);
  
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase.functions.invoke('evolution-connect-instance', {
      body: { instanceName },
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
    });

    if (error) throw error;
    
    // CORREÇÃO: Verificar se instância já está conectada
    if (data.alreadyConnected) {
      throw new Error('Instância já está conectada');
    }
    
    if (!data.success) throw new Error(data.error || 'Erro ao conectar instância');

    console.log(`[Evolution API] QR Code gerado com sucesso`);
    return data.qrCode;
  } catch (error) {
    console.error(`[Evolution API] Erro ao conectar instância:`, error);
    throw error;
  }
};

// CORREÇÃO: Função para verificar estado da conexão
export const getConnectionState = async (instanceName: string): Promise<string> => {
  console.log(`[Evolution API] Verificando estado da conexão: ${instanceName}`);
  
  try {
    const { data, error } = await supabase.functions.invoke('evolution-connection-state', {
      body: { instanceName }
    });

    if (error) {
      console.error(`[Evolution API] Erro ao buscar estado:`, error);
      return 'disconnected';
    }

    // CORREÇÃO: Sempre retornar um estado válido
    const state = data.state || 'disconnected';
    console.log(`[Evolution API] Estado da conexão:`, state);
    return state;
  } catch (error) {
    console.error(`[Evolution API] Erro ao verificar estado:`, error);
    return 'disconnected';
  }
};

// Função para reiniciar instância
export const restartInstance = async (instanceName: string): Promise<void> => {
  console.log(`[Evolution API] Reiniciando instância: ${instanceName}`);
  
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase.functions.invoke('evolution-restart-instance', {
      body: { instanceName },
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
    });

    if (error) {
      console.error(`[Evolution API] Erro ao reiniciar instância:`, error);
      throw error;
    }

    if (!data.success) {
      throw new Error(data.error || 'Erro ao reiniciar instância');
    }

    console.log(`[Evolution API] Instância reiniciada com sucesso`);
  } catch (error) {
    console.error(`[Evolution API] Erro ao reiniciar instância:`, error);
    throw error;
  }
};

// Função para deletar instância
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
