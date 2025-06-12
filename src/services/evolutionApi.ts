
const EVOLUTION_API_URL = 'https://evo.borgesai.com';
const GLOBAL_API_KEY = '1f8edf0c2c8a18d3c224a4d802dd53b5';

export interface InstanceStatus {
  instance: {
    instanceName: string;
    state: 'open' | 'close' | 'connecting';
  };
}

export interface QRCodeResponse {
  base64?: string;
  code?: string;
  pairingCode?: string;
}

export class EvolutionApiService {
  private static headers = {
    'Content-Type': 'application/json',
    'apikey': GLOBAL_API_KEY
  };

  // Gerar nome da instância padronizado
  static generateInstanceName(nome: string, numero: string): string {
    const cleanNome = nome.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const last4Digits = numero.slice(-4);
    return `${cleanNome}_${last4Digits}`;
  }

  // 1. Verificar se há instância
  static async checkInstance(instanceName: string): Promise<boolean> {
    try {
      const response = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances?instanceName=${instanceName}`, {
        method: 'GET',
        headers: this.headers
      });
      
      if (!response.ok) {
        return false;
      }
      
      const data = await response.json();
      console.log('Check instance response:', data);
      return data && data.length > 0;
    } catch (error) {
      console.error('Error checking instance:', error);
      return false;
    }
  }

  // 2. Criar uma instância
  static async createInstance(instanceName: string, phoneNumber: string): Promise<boolean> {
    try {
      const payload = {
        instanceName: instanceName,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
        token: instanceName,
        number: phoneNumber,
        businessId: "",
        webhookUrl: "",
        webhookByEvents: false,
        events: [],
        rejectCall: false,
        msgCall: "",
        groups: true,
        always_online: false,
        read_messages: false,
        read_status: false,
        sync_full_history: true
      };

      console.log('Creating instance with payload:', payload);

      const response = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload)
      });

      const responseData = await response.json();
      console.log('Create instance response:', responseData);

      if (!response.ok) {
        console.error('Error creating instance:', responseData);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error creating instance:', error);
      return false;
    }
  }

  // 3. Reiniciar o socket da instância
  static async restartInstance(instanceName: string): Promise<boolean> {
    try {
      console.log('Restarting instance:', instanceName);
      const response = await fetch(`${EVOLUTION_API_URL}/instance/restart/${instanceName}`, {
        method: 'PUT',
        headers: this.headers
      });

      const responseData = await response.json();
      console.log('Restart instance response:', responseData);

      return response.ok;
    } catch (error) {
      console.error('Error restarting instance:', error);
      return false;
    }
  }

  // 4. Gerar QR Code
  static async generateQRCode(instanceName: string): Promise<string | null> {
    try {
      console.log('Generating QR code for instance:', instanceName);
      const response = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
        method: 'GET',
        headers: this.headers
      });

      const responseData: QRCodeResponse = await response.json();
      console.log('QR Code response:', responseData);

      if (!response.ok) {
        console.error('QR Code request failed:', responseData);
        return null;
      }

      // Verificar diferentes possíveis campos de retorno
      const qrCode = responseData.base64 || responseData.code || responseData.pairingCode;
      
      if (!qrCode) {
        console.error('No QR code found in response:', responseData);
        return null;
      }

      console.log('QR Code generated successfully, length:', qrCode.length);
      return qrCode;
    } catch (error) {
      console.error('Error generating QR code:', error);
      return null;
    }
  }

  // Verificar status da instância
  static async getInstanceStatus(instanceName: string): Promise<InstanceStatus | null> {
    try {
      const response = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`, {
        method: 'GET',
        headers: this.headers
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      console.log('Instance status:', data);
      return data;
    } catch (error) {
      console.error('Error getting instance status:', error);
      return null;
    }
  }

  // Deletar instância
  static async deleteInstance(instanceName: string): Promise<boolean> {
    try {
      console.log('Deleting instance:', instanceName);
      const response = await fetch(`${EVOLUTION_API_URL}/instance/delete/${instanceName}`, {
        method: 'DELETE',
        headers: this.headers
      });

      const responseData = await response.json();
      console.log('Delete instance response:', responseData);

      return response.ok;
    } catch (error) {
      console.error('Error deleting instance:', error);
      return false;
    }
  }

  // Fluxo completo de conexão
  static async connectWhatsApp(instanceName: string, phoneNumber: string): Promise<{ success: boolean; qrCode?: string; message?: string }> {
    try {
      console.log('1. Verificando se instância existe...');
      const instanceExists = await this.checkInstance(instanceName);
      
      if (instanceExists) {
        console.log('2. Instância existe, reiniciando socket...');
        await this.restartInstance(instanceName);
      } else {
        console.log('2. Criando nova instância...');
        const created = await this.createInstance(instanceName, phoneNumber);
        if (!created) {
          return { success: false, message: 'Erro ao criar instância' };
        }
      }

      // Aguardar um pouco antes de gerar o QR Code
      await new Promise(resolve => setTimeout(resolve, 3000));

      console.log('3. Gerando QR Code...');
      const qrCode = await this.generateQRCode(instanceName);
      
      if (!qrCode) {
        return { success: false, message: 'Erro ao gerar QR Code' };
      }

      return { success: true, qrCode };
    } catch (error) {
      console.error('Error in connect flow:', error);
      return { success: false, message: 'Erro no processo de conexão' };
    }
  }

  // Verificação automática de status com polling
  static startStatusPolling(instanceName: string, onStatusChange: (connected: boolean) => void, intervalMs: number = 10000): () => void {
    const checkStatus = async () => {
      try {
        const status = await this.getInstanceStatus(instanceName);
        const isConnected = status?.instance?.state === 'open';
        onStatusChange(isConnected);
      } catch (error) {
        console.error('Error in status polling:', error);
        onStatusChange(false);
      }
    };

    // Verificar imediatamente
    checkStatus();
    
    // Configurar intervalo
    const interval = setInterval(checkStatus, intervalMs);
    
    // Retornar função para parar o polling
    return () => clearInterval(interval);
  }
}
