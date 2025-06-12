
const API_URL = 'https://api.gera-leads.com/instance';
const API_KEY = 'B6D711FCDE4D4FD5936544120E713976';

export interface InstanceData {
  instanceName: string;
  token: string;
  phoneNumber?: string;
  displayName?: string;
  profilePicUrl?: string;
  status?: string;
  serverUrl?: string;
  apiKey?: string;
}

export interface QRCodeResponse {
  qrcode?: {
    code?: string;
    base64?: string;
  };
}

export interface ConnectionStatus {
  instance: {
    instanceName: string;
    status: string;
  };
}

const headers = {
  'Content-Type': 'application/json',
  'apikey': API_KEY
};

export const createInstance = async (instanceName: string): Promise<InstanceData> => {
  console.log(`[Evolution API] Criando instância: ${instanceName}`);
  
  const payload = {
    instanceName,
    token: API_KEY,
    qrcode: true,
    instanceSettings: {
      settings: {
        groupsIgnore: true,
        syncFullHistory: true
      }
    },
    webhook: {
      webhookSettings: {
        webhookUrl: "https://webhookn8n.gera-leads.com/webhook/whatsapp",
        webhookBase64: true,
        webhookEvents: [
          "MESSAGES_UPSERT"
        ]
      }
    }
  };

  try {
    const response = await fetch(`${API_URL}/create`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Evolution API] Erro ao criar instância:`, errorText);
      throw new Error(`Erro ao criar instância: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`[Evolution API] Instância criada com sucesso:`, data);
    
    return {
      instanceName: data.instance?.instanceName || instanceName,
      token: data.hash || API_KEY,
      status: data.instance?.status || 'disconnected'
    };
  } catch (error) {
    console.error(`[Evolution API] Erro na criação da instância:`, error);
    throw error;
  }
};

export const generateQRCode = async (instanceName: string): Promise<string> => {
  console.log(`[Evolution API] Gerando QR Code para: ${instanceName}`);
  
  try {
    const response = await fetch(`${API_URL}/connect/${instanceName}`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Evolution API] Erro ao gerar QR Code:`, errorText);
      throw new Error(`Erro ao gerar QR Code: ${response.status} - ${errorText}`);
    }

    const data: QRCodeResponse = await response.json();
    console.log(`[Evolution API] Resposta do QR Code:`, data);
    
    // Verifica se temos um QR code válido na resposta
    if (data.qrcode?.base64) {
      return data.qrcode.base64;
    } else if (data.qrcode?.code) {
      return data.qrcode.code;
    } else {
      throw new Error('QR Code não encontrado na resposta da API');
    }
  } catch (error) {
    console.error(`[Evolution API] Erro ao gerar QR Code:`, error);
    throw error;
  }
};

export const getInstanceStatus = async (instanceName: string): Promise<string> => {
  console.log(`[Evolution API] Verificando status da instância: ${instanceName}`);
  
  try {
    const response = await fetch(`${API_URL}/fetchInstances/${instanceName}`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Evolution API] Erro ao buscar status:`, errorText);
      throw new Error(`Erro ao buscar status: ${response.status} - ${errorText}`);
    }

    const data: ConnectionStatus = await response.json();
    console.log(`[Evolution API] Status da instância:`, data);
    
    return data.instance?.status || 'disconnected';
  } catch (error) {
    console.error(`[Evolution API] Erro ao verificar status:`, error);
    return 'disconnected';
  }
};

export const deleteInstance = async (instanceName: string): Promise<void> => {
  console.log(`[Evolution API] Deletando instância: ${instanceName}`);
  
  try {
    const response = await fetch(`${API_URL}/delete/${instanceName}`, {
      method: 'DELETE',
      headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Evolution API] Erro ao deletar instância:`, errorText);
      throw new Error(`Erro ao deletar instância: ${response.status} - ${errorText}`);
    }

    console.log(`[Evolution API] Instância deletada com sucesso`);
  } catch (error) {
    console.error(`[Evolution API] Erro ao deletar instância:`, error);
    throw error;
  }
};
