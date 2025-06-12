
const EVOLUTION_API_URL = 'https://evo.borgesai.com';
const GLOBAL_API_KEY = '1f8edf0c2c8a18d3c224a4d802dd53b5';

export interface InstanceStatus {
  instance: {
    instanceName: string;
    status: 'open' | 'close' | 'connecting';
  };
}

export interface QRCodeResponse {
  base64: string;
}

export class EvolutionApiService {
  private static headers = {
    'Content-Type': 'application/json',
    'apikey': GLOBAL_API_KEY
  };

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

      const response = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error creating instance:', errorText);
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
      const response = await fetch(`${EVOLUTION_API_URL}/instance/restart/${instanceName}`, {
        method: 'PUT',
        headers: this.headers
      });

      return response.ok;
    } catch (error) {
      console.error('Error restarting instance:', error);
      return false;
    }
  }

  // 4. Gerar QR Code
  static async generateQRCode(instanceName: string): Promise<string | null> {
    try {
      const response = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
        method: 'GET',
        headers: this.headers
      });

      if (!response.ok) {
        return null;
      }

      const data: QRCodeResponse = await response.json();
      return data.base64;
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

      return await response.json();
    } catch (error) {
      console.error('Error getting instance status:', error);
      return null;
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
      await new Promise(resolve => setTimeout(resolve, 2000));

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
}
