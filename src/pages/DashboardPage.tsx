import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { useProfile } from '@/hooks/useProfile';
import { useChats } from '@/hooks/useChats';
import { createInstance, connectInstance, getConnectionState } from '@/services/evolutionApi';
import { useToast } from '@/hooks/use-toast';
import { QrCode, Smartphone, MessageCircle, Clock, CheckCircle, AlertCircle, RotateCcw } from 'lucide-react';

const DashboardPage = () => {
  const { profile, updateProfile } = useProfile();
  const { chats } = useChats();
  const { toast } = useToast();
  const [qrCode, setQrCode] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected');
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);

  // Verificar status da conexão automaticamente
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (profile?.instance_name) {
      // Verificar status imediatamente
      checkConnectionStatus();
      
      // Verificar status a cada 10 segundos
      interval = setInterval(checkConnectionStatus, 10000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [profile?.instance_name]);

  const checkConnectionStatus = async () => {
    if (!profile?.instance_name) return;
    
    try {
      const status = await getConnectionState(profile.instance_name);
      console.log(`Status da conexão: ${status}`);
      setConnectionStatus(status);
      
      if (status === 'open') {
        setQrCode(''); // Limpar QR Code quando conectado
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
      setConnectionStatus('disconnected');
    }
  };

  const generateInstanceName = () => {
    if (!profile?.nome || !profile?.numero) return '';
    
    const nome = profile.nome.toLowerCase().replace(/\s+/g, '');
    const ultimosDigitos = profile.numero.slice(-4);
    return `${nome}_${ultimosDigitos}`;
  };

  const handleCreateInstance = async () => {
    if (!profile?.nome || !profile?.numero) {
      toast({
        title: 'Informações incompletas',
        description: 'Complete seu perfil antes de conectar o WhatsApp',
        variant: 'destructive'
      });
      return;
    }

    setIsConnecting(true);
    try {
      const instanceName = generateInstanceName();
      console.log(`Criando instância: ${instanceName}`);
      
      await createInstance(instanceName);
      
      // Salvar o nome da instância no perfil
      await updateProfile({ instance_name: instanceName });
      
      toast({
        title: 'Instância criada!',
        description: 'Agora gere o QR Code para conectar seu WhatsApp'
      });
      
      setConnectionStatus('disconnected');
    } catch (error) {
      console.error('Erro ao criar instância:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar a instância do WhatsApp',
        variant: 'destructive'
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleGenerateQRCode = async () => {
    if (!profile?.instance_name) return;

    setIsGeneratingQR(true);
    try {
      console.log(`Gerando QR Code para: ${profile.instance_name}`);
      const qrCodeData = await connectInstance(profile.instance_name);
      setQrCode(qrCodeData);
      
      toast({
        title: 'QR Code gerado!',
        description: 'Escaneie o QR Code com seu WhatsApp para conectar'
      });
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível gerar o QR Code',
        variant: 'destructive'
      });
    } finally {
      setIsGeneratingQR(false);
    }
  };

  const getStatusInfo = () => {
    switch (connectionStatus) {
      case 'open':
        return {
          label: 'Conectado',
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: CheckCircle,
          iconColor: 'text-green-600'
        };
      case 'connecting':
        return {
          label: 'Conectando',
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: Clock,
          iconColor: 'text-yellow-600'
        };
      default:
        return {
          label: 'Desconectado',
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: AlertCircle,
          iconColor: 'text-red-600'
        };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;
  const pendingChats = chats.filter(chat => chat.prioridade === 'urgente' || chat.prioridade === 'importante').length;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Status da Conexão */}
        <Card className={connectionStatus === 'open' ? 'border-green-200 bg-green-50' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Smartphone className="w-5 h-5 text-summi-green" />
                <span>Status do WhatsApp</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge className={statusInfo.color}>
                  <StatusIcon className={`w-3 h-3 mr-1 ${statusInfo.iconColor}`} />
                  {statusInfo.label}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={checkConnectionStatus}
                  disabled={!profile?.instance_name}
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {connectionStatus === 'open' ? (
              <div className="text-center py-4">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-green-800 mb-2">
                  WhatsApp Conectado!
                </h3>
                <p className="text-green-600">
                  Sua assistente Summi está ativa e monitorando suas conversas.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {!profile?.instance_name ? (
                  <div className="text-center py-4">
                    <p className="text-summi-gray-600 mb-4">
                      Conecte seu WhatsApp para começar a usar a Summi
                    </p>
                    <Button
                      onClick={handleCreateInstance}
                      disabled={isConnecting || !profile?.nome || !profile?.numero}
                      className="bg-summi-green hover:bg-summi-green/90 text-white"
                    >
                      {isConnecting ? 'Criando...' : 'Conectar WhatsApp'}
                    </Button>
                  </div>
                ) : qrCode ? (
                  <div className="text-center space-y-4">
                    <div className="max-w-xs mx-auto">
                      <img 
                        src={qrCode} 
                        alt="QR Code WhatsApp" 
                        className="w-full border rounded-lg shadow-sm"
                      />
                    </div>
                    <div>
                      <h4 className="font-semibold text-summi-gray-900 mb-2">
                        Escaneie o QR Code
                      </h4>
                      <p className="text-sm text-summi-gray-600">
                        1. Abra o WhatsApp no seu celular<br/>
                        2. Toque em Mais opções (⋮) → Dispositivos conectados<br/>
                        3. Toque em "Conectar dispositivo"<br/>
                        4. Escaneie este código
                      </p>
                    </div>
                    <Button
                      onClick={handleGenerateQRCode}
                      disabled={isGeneratingQR}
                      variant="outline"
                      size="sm"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Gerar Novo QR Code
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <QrCode className="w-16 h-16 text-summi-gray-400 mx-auto mb-4" />
                    <h4 className="font-semibold text-summi-gray-900 mb-2">
                      Gerar QR Code
                    </h4>
                    <p className="text-sm text-summi-gray-600 mb-4">
                      Clique no botão abaixo para gerar o QR Code e conectar seu WhatsApp
                    </p>
                    <Button
                      onClick={handleGenerateQRCode}
                      disabled={isGeneratingQR}
                      className="bg-summi-green hover:bg-summi-green/90 text-white"
                    >
                      {isGeneratingQR ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Gerando...
                        </>
                      ) : (
                        <>
                          <QrCode className="w-4 h-4 mr-2" />
                          Gerar QR Code
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mensagens Pendentes */}
        {connectionStatus === 'open' && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageCircle className="w-5 h-5 text-blue-500" />
                  <span>Conversas Ativas</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-summi-gray-900">
                  {chats.length}
                </div>
                <p className="text-sm text-summi-gray-600">
                  Total de conversas monitoradas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-orange-500" />
                  <span>Mensagens Importantes</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">
                  {pendingChats}
                </div>
                <p className="text-sm text-summi-gray-600">
                  Requerem sua atenção
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-semibold text-green-600">
                  Ativo
                </div>
                <p className="text-sm text-summi-gray-600">
                  Summi está monitorando
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Informações do Perfil Incompleto */}
        {(!profile?.nome || !profile?.numero) && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-orange-800">
                <AlertCircle className="w-5 h-5" />
                <span>Complete seu perfil</span>
              </CardTitle>
              <CardDescription className="text-orange-700">
                Para conectar o WhatsApp, você precisa completar as informações do seu perfil.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="border-orange-300 text-orange-800 hover:bg-orange-100">
                Ir para Configurações
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardPage;
