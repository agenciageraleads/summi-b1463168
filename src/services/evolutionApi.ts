
const EVOLUTION_API_URL = 'https://evo.borgesai.com';
const GLOBAL_API_KEY = '1f8edf0c2c8a18d3c224a4d802dd53b5';

export interface InstanceStatus {
  instance: {
    instanceName: string;
    status: string;
  };
  qrcode?: {
    base64: string;
    code: string;
  };
}

export class EvolutionApiService {
  private static headers = {
    'Content-Type': 'application/json',
    'apikey': GLOBAL_API_KEY
  };

  static async createInstance(instanceName: string): Promise<any> {
    try {
      const response = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          instanceName,
          token: GLOBAL_API_KEY,
          qrcode: true,
          number: '',
          typebot: '',
          webhook: '',
          webhook_by_events: false,
          events: []
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating instance:', error);
      throw error;
    }
  }

  static async getInstanceStatus(instanceName: string): Promise<InstanceStatus> {
    try {
      const response = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances?instanceName=${instanceName}`, {
        method: 'GET',
        headers: this.headers
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data[0] || null;
    } catch (error) {
      console.error('Error fetching instance status:', error);
      throw error;
    }
  }

  static async generateQRCode(instanceName: string): Promise<string | null> {
    try {
      const response = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
        method: 'GET',
        headers: this.headers
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.base64 || null;
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw error;
    }
  }

  static async deleteInstance(instanceName: string): Promise<boolean> {
    try {
      const response = await fetch(`${EVOLUTION_API_URL}/instance/delete/${instanceName}`, {
        method: 'DELETE',
        headers: this.headers
      });

      return response.ok;
    } catch (error) {
      console.error('Error deleting instance:', error);
      return false;
    }
  }
}
