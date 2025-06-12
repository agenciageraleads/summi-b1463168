
import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useChats } from '@/hooks/useChats';
import { useAuth } from '@/contexts/AuthContext';
import { EvolutionApiService } from '@/services/evolutionApi';

const DashboardPage = () => {
  const { user } = useAuth();
  const { chats, isLoading: chatsLoading } = useChats();
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'loading'>('loading');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [instanceName, setInstanceName] = useState<string>('');

  useEffect(() => {
    if (user) {
      const userInstanceName = `summi_${user.id.replace(/-/g, '_')}`;
      setInstanceName(userInstanceName);
      checkConnectionStatus(userInstanceName);
    }
  }, [user]);

  const checkConnectionStatus = async (instanceName: string) => {
    try {
      const status = await EvolutionApiService.getInstanceStatus(instanceName);
      if (status && status.instance.status === 'open') {
        setConnectionStatus('connected');
        setQrCode(null);
      } else {
        setConnectionStatus('disconnected');
      }
    } catch (error) {
      setConnectionStatus('disconnected');
    }
  };

  const handleConnect = async () => {
    setConnectionStatus('loading');
    try {
      if (connectionStatus === 'disconnected') {
        // Create instance first
        await EvolutionApiService.createInstance(instanceName);
        // Then generate QR code
        const qrCodeData = await EvolutionApiService.generateQRCode(instanceName);
        if (qrCodeData) {
          setQrCode(qrCodeData);
        }
      }
    } catch (error) {
      console.error('Error connecting:', error);
      setConnectionStatus('disconnected');
    }
  };

  const getStatusColor = (prioridade: string) => {
    switch (prioridade) {
      case 'urgente':
        return 'bg-red-500 text-white';
      case 'importante':
        return 'bg-yellow-500 text-white';
      case 'normal':
        return 'bg-summi-gray-500 text-white';
      default:
        return 'bg-summi-gray-300 text-summi-gray-700';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} min`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d`;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Connection Status Card */}
        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span>📱</span>
                <span>Status da Conexão WhatsApp</span>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                connectionStatus === 'connected' 
                  ? 'bg-summi-green text-white' 
                  : connectionStatus === 'loading'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-red-500 text-white'
              }`}>
                {connectionStatus === 'connected' ? 'Conectado' : 
                 connectionStatus === 'loading' ? 'Conectando...' : 'Desconectado'}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {connectionStatus === 'disconnected' && (
              <div className="text-center space-y-4">
                <p className="text-summi-gray-600">
                  Sua instância do WhatsApp não está conectada. Clique no botão abaixo para conectar.
                </p>
                <Button 
                  onClick={handleConnect}
                  className="bg-summi-green hover:bg-summi-green/90"
                >
                  Conectar WhatsApp
                </Button>
              </div>
            )}
            
            {connectionStatus === 'loading' && (
              <div className="text-center space-y-4">
                <p className="text-summi-gray-600">Conectando ao WhatsApp...</p>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-summi-blue mx-auto"></div>
              </div>
            )}

            {qrCode && (
              <div className="text-center space-y-4">
                <p className="text-summi-gray-600">
                  Escaneie o QR Code abaixo com seu WhatsApp para conectar:
                </p>
                <div className="flex justify-center">
                  <img 
                    src={`data:image/png;base64,${qrCode}`} 
                    alt="QR Code WhatsApp" 
                    className="max-w-xs border rounded-lg"
                  />
                </div>
                <Button 
                  onClick={() => checkConnectionStatus(instanceName)}
                  variant="outline"
                >
                  Verificar Conexão
                </Button>
              </div>
            )}

            {connectionStatus === 'connected' && (
              <div className="text-center space-y-4">
                <p className="text-summi-green font-medium">
                  ✅ WhatsApp conectado com sucesso!
                </p>
                <p className="text-summi-gray-600">
                  Sua instância está ativa e pronta para receber mensagens.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Conversations */}
        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span>💬</span>
                <span>Conversas Pendentes</span>
              </div>
              <span className="text-sm text-summi-gray-500">
                {chats.length} {chats.length === 1 ? 'conversa' : 'conversas'}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chatsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="flex items-center space-x-4 p-4 bg-summi-gray-50 rounded-lg">
                      <div className="w-10 h-10 bg-summi-gray-300 rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-summi-gray-300 rounded w-1/4 mb-2"></div>
                        <div className="h-3 bg-summi-gray-300 rounded w-3/4"></div>
                      </div>
                      <div className="h-6 bg-summi-gray-300 rounded w-16"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : chats.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-summi-gray-500">Nenhuma conversa encontrada.</p>
                <p className="text-sm text-summi-gray-400 mt-2">
                  As conversas aparecerão aqui quando você receber mensagens.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {chats.slice(0, 10).map((chat, index) => (
                  <div 
                    key={chat.id}
                    className="flex items-center justify-between p-4 bg-summi-gray-50 rounded-lg hover:bg-summi-gray-100 transition-colors cursor-pointer"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="w-10 h-10 bg-summi-blue rounded-full flex items-center justify-center">
                        <span className="text-white font-medium text-sm">
                          {chat.nome.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-summi-gray-900">{chat.nome}</h4>
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(chat.prioridade)}`}>
                            {chat.prioridade}
                          </span>
                        </div>
                        <p className="text-sm text-summi-gray-600">{chat.remote_jid}</p>
                        {chat.contexto && (
                          <p className="text-sm text-summi-gray-700 mt-1 truncate">
                            {chat.contexto}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-summi-gray-500">
                        {formatDate(chat.modificado_em)}
                      </p>
                      <p className="text-xs text-summi-gray-400">
                        {chat.conversa.length} {chat.conversa.length === 1 ? 'mensagem' : 'mensagens'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default DashboardPage;
