
// ABOUTME: Serviço para integração com Evolution API - VERSÃO CORRIGIDA
// ABOUTME: Implementa comunicação segura e confiável com a API do WhatsApp
import { supabase } from '@/integrations/supabase/client';

export interface InstanceData {
  instanceName: string;
  status?: string;
  state?: string;
}

export interface QRCodeResponse {
  qrCode: string;
  pairingCode?: string;
}

export interface ConnectionStatus {
  status: string;
  state?: string;
  success?: boolean;
}

export interface InstanceCheckResult {
  exists: boolean;
  status: string;
  state?: string;
  instanceData?: any;
}

export interface ConnectionResult {
  success: boolean;
  error?: string;
  instanceName?: string;
  pairingCode?: string;
  qrCode?: string;
  state?: string;
  message?: string;
}

// Função principal para inicializar conexão WhatsApp
export const createInstance = async (): Promise<ConnectionResult> => {
  console.log(`[Evolution API] 🚀 Iniciando criação de instância via evolution-api-handler`);
  
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      throw new Error('Usuário não autenticado');
    }

    console.log(`[Evolution API] 📡 Chamando evolution-api-handler com action: initialize-connection`);

    const { data, error } = await supabase.functions.invoke('evolution-api-handler', {
      body: { action: 'initialize-connection' },
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`,
        'Content-Type': 'application/json'
      },
    });

    console.log(`[Evolution API] 📨 Resposta recebida:`, { 
      hasData: !!data, 
      hasError: !!error,
      success: data?.success 
    });

    if (error) {
      console.error(`[Evolution API] ❌ Erro na requisição:`, error);
      throw new Error(`Erro na comunicação: ${error.message}`);
    }

    if (!data) {
      throw new Error('Resposta vazia do servidor');
    }

    if (!data.success) {
      console.error(`[Evolution API] ❌ Falha no backend:`, data.error);
      throw new Error(data.error || 'Erro no processo de criação da instância');
    }

    console.log(`[Evolution API] ✅ Instância criada com sucesso:`, {
      instanceName: data.instanceName,
      hasPairingCode: !!data.pairingCode,
      hasQrCode: !!data.qrCode,
      state: data.state
    });

    return {
      success: true,
      instanceName: data.instanceName,
      pairingCode: data.pairingCode,
      qrCode: data.qrCode,
      state: data.state || 'connecting',
      message: data.message || 'Instância criada com sucesso'
    };

  } catch (error: any) {
    console.error(`[Evolution API] ❌ Erro no processo de criação:`, error);
    return {
      success: false,
      error: error.message || 'Erro desconhecido na criação da instância'
    };
  }
};

// Função para verificar se instância existe
export const checkInstanceExists = async (instanceName: string): Promise<InstanceCheckResult> => {
  console.log(`[Evolution API] 🔍 Verificando se instância existe: ${instanceName}`);
  
  try {
    const { data, error } = await supabase.functions.invoke('evolution-check-instance', {
      body: { instanceName }
    });

    if (error) {
      console.error(`[Evolution API] ❌ Erro ao verificar instância:`, error);
      return { exists: false, status: 'error' };
    }
    
    if (data.success === false) {
      console.log(`[Evolution API] ℹ️ Instância não existe:`, data.error);
      return { exists: false, status: 'not_found' };
    }

    console.log(`[Evolution API] ✅ Resultado da verificação:`, data);
    return {
      exists: data.exists || false,
      status: data.status || 'unknown',
      state: data.state,
      instanceData: data.instanceData
    };
  } catch (error) {
    console.error(`[Evolution API] ❌ Erro ao verificar instância:`, error);
    return { exists: false, status: 'error' };
  }
};

// Função para conectar instância e gerar códigos
export const connectInstance = async (instanceName: string): Promise<ConnectionResult> => {
  console.log(`[Evolution API] 📱 Conectando instância: ${instanceName}`);
  
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      throw new Error('Usuário não autenticado');
    }

    const { data, error } = await supabase.functions.invoke('evolution-connect-instance', {
      body: { instanceName },
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
    });

    if (error) {
      console.error(`[Evolution API] ❌ Erro na conexão:`, error);
      throw new Error(`Erro na comunicação: ${error.message}`);
    }
    
    if (data.alreadyConnected) {
      console.log(`[Evolution API] ℹ️ Instância já conectada`);
      return {
        success: false,
        error: 'Instância já está conectada',
        state: 'already_connected'
      };
    }
    
    if (!data.success) {
      throw new Error(data.error || 'Erro ao conectar instância');
    }

    console.log(`[Evolution API] ✅ QR Code gerado com sucesso`);
    return {
      success: true,
      qrCode: data.qrCode,
      state: 'connecting'
    };
  } catch (error: any) {
    console.error(`[Evolution API] ❌ Erro ao conectar instância:`, error);
    return {
      success: false,
      error: error.message || 'Erro ao conectar instância'
    };
  }
};

// Função para verificar estado da conexão
export const getConnectionState = async (instanceName: string): Promise<string> => {
  console.log(`[Evolution API] 🔍 Verificando estado da conexão: ${instanceName}`);
  
  try {
    const { data, error } = await supabase.functions.invoke('evolution-connection-state', {
      body: { instanceName }
    });

    if (error) {
      console.error(`[Evolution API] ❌ Erro ao buscar estado:`, error);
      return 'disconnected';
    }

    const state = data.state || 'disconnected';
    console.log(`[Evolution API] 📊 Estado da conexão:`, state);
    return state;
  } catch (error) {
    console.error(`[Evolution API] ❌ Erro ao verificar estado:`, error);
    return 'disconnected';
  }
};

// Função para reiniciar instância
export const restartInstance = async (instanceName: string): Promise<void> => {
  console.log(`[Evolution API] 🔄 Reiniciando instância: ${instanceName}`);
  
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
      console.error(`[Evolution API] ❌ Erro ao reiniciar instância:`, error);
      throw error;
    }

    if (!data.success) {
      throw new Error(data.error || 'Erro ao reiniciar instância');
    }

    console.log(`[Evolution API] ✅ Instância reiniciada com sucesso`);
  } catch (error) {
    console.error(`[Evolution API] ❌ Erro ao reiniciar instância:`, error);
    throw error;
  }
};

// Função para deletar instância
export const deleteInstance = async (instanceName: string): Promise<void> => {
  console.log(`[Evolution API] 🗑️ Deletando instância: ${instanceName}`);
  
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
      console.error(`[Evolution API] ❌ Erro ao deletar instância:`, error);
      throw error;
    }

    console.log(`[Evolution API] ✅ Instância deletada com sucesso`);
  } catch (error) {
    console.error(`[Evolution API] ❌ Erro ao deletar instância:`, error);
    throw error;
  }
};
