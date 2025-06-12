
import { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';
import { QrCode, Smartphone, CheckCircle, AlertCircle, RotateCcw } from 'lucide-react';
import { 
  checkInstanceExists, 
  connectInstance, 
  getConnectionState, 
  restartInstance,
  createInstance 
} from '@/services/evolutionApi';

const WhatsAppConnectionPage = () => {
  const { profile, updateProfile } = useProfile();
  const { toast } = useToast();
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [qrCode, setQrCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [connectionTimer, setConnectionTimer] = useState(0);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Limpar intervalos ao desmontar o componente
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const generateInstanceName = () => {
    if (!profile?.nome || !profile?.numero) return '';
    
    const nome = profile.nome.toLowerCase().replace(/[^a-z0-9]/g, '');
    const ultimosDigitos = profile.numero.slice(-4);
    return `${nome}_${ultimosDigitos}`;
  };

  const startConnectionTimer = () => {
    setConnectionTimer(0);
    if (timerRef.current) clearInterval(timerRef.current);
    
    timerRef.current = setInterval(() => {
      setConnectionTimer(prev => prev + 1);
    }, 1000);
  };

  const stopConnectionTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setConnectionTimer(0);
  };

  const checkConnectionStatus = async (instanceName: string): Promise<boolean> => {
    try {
      const state = await getConnectionState(instanceName);
      console.log(`Estado da conexão: ${state}`);
      
      if (state === 'open') {
        setConnectionStatus('connected');
        setQrCode('');
        stopConnectionTimer();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Erro ao verificar estado da conexão:', error);
      return false;
    }
  };

  const startConnectionMonitoring = (instanceName: string) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    
    intervalRef.current = setInterval(async () => {
      const isConnected = await checkConnectionStatus(instanceName);
      
      if (isConnected) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        toast({
          title: 'WhatsApp Conectado!',
          description: 'Sua Summi está pronta para atender'
        });
        return;
      }

      // Se passou 40 segundos, reiniciar a instância
      if (connectionTimer >= 40) {
        console.log('Timeout de 40s atingido, reiniciando instância...');
        await handleRestartAndReconnect(instanceName);
      }
    }, 10000); // A cada 10 segundos
  };

  const handleRestartAndReconnect = async (instanceName: string) => {
    try {
      console.log('Reiniciando instância...');
      await restartInstance(instanceName);
      
      toast({
        title: 'Instância reiniciada',
        description: 'Gerando novo QR Code...'
      });

      // Aguardar um pouco antes de gerar novo QR Code
      setTimeout(async () => {
        await handleConnect(instanceName);
      }, 3000);
      
    } catch (error) {
      console.error('Erro ao reiniciar instância:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível reiniciar a instância',
        variant: 'destructive'
      });
    }
  };

  const handleConnect = async (instanceName?: string) => {
    const targetInstanceName = instanceName || generateInstanceName();
    
    try {
      console.log(`Conectando à instância: ${targetInstanceName}`);
      const qrCodeData = await connectInstance(targetInstanceName);
      
      setQrCode(qrCodeData);
      setConnectionStatus('connecting');
      startConnectionTimer();
      startConnectionMonitoring(targetInstanceName);
      
      toast({
        title: 'QR Code gerado!',
        description: 'Escaneie o QR Code com seu WhatsApp para conectar'
      });
      
    } catch (error) {
      console.error('Erro ao conectar instância:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível gerar o QR Code',
        variant: 'destructive'
      });
      setConnectionStatus('disconnected');
      stopConnectionTimer();
    }
  };

  const handleConnectWhatsApp = async () => {
    // Verificar se os dados do usuário estão preenchidos
    if (!profile?.nome || !profile?.numero) {
      toast({
        title: 'Informações incompletas',
        description: 'Complete seu perfil antes de conectar o WhatsApp',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    const instanceName = generateInstanceName();

    try {
      console.log(`Verificando se a instância ${instanceName} já existe...`);
      
      // Primeiro, verificar se a instância já existe
      const instanceCheck = await checkInstanceExists(instanceName);
      
      if (instanceCheck.exists) {
        console.log('Instância encontrada, verificando status...');
        
        // Se existe, verificar o status
        if (instanceCheck.status === 'open') {
          console.log('Instância já está conectada');
          setConnectionStatus('connected');
          setQrCode('');
          toast({
            title: 'WhatsApp já conectado!',
            description: 'Sua instância já está conectada e funcionando'
          });
          return;
        } else {
          // Se não está conectada, tentar conectar
          console.log('Instância existe mas não está conectada, gerando QR Code...');
          await handleConnect(instanceName);
        }
      } else {
        // Se não existe, criar a instância primeiro
        console.log('Instância não encontrada, criando nova instância...');
        
        await createInstance(instanceName);
        await updateProfile({ instance_name: instanceName });
        
        // Aguardar um pouco e então conectar
        setTimeout(async () => {
          await handleConnect(instanceName);
        }, 2000);
        
        toast({
          title: 'Instância criada!',
          description: 'Gerando QR Code para conexão...'
        });
      }
      
    } catch (error) {
      console.error('Erro no processo de conexão:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível conectar o WhatsApp',
        variant: 'destructive'
      });
      setConnectionStatus('disconnected');
      stopConnectionTimer();
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusDisplay = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          color: 'text-green-600',
          bg: 'bg-green-100',
          icon: CheckCircle,
          text: 'Conectado'
        };
      case 'connecting':
        return {
          color: 'text-yellow-600',
          bg: 'bg-yellow-100',
          icon: RotateCcw,
          text: `Conectando... (${connectionTimer}s)`
        };
      default:
        return {
          color: 'text-red-500',
          bg: 'bg-red-100',
          icon: AlertCircle,
          text: 'Desconectado'
        };
    }
  };

  const status = getStatusDisplay();
  const StatusIcon = status.icon;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Conexão WhatsApp 📱
          </h1>
          <p className="text-muted-foreground">
            Conecte seu WhatsApp Business para começar a automatizar o atendimento
          </p>
        </div>

        {/* Status Card */}
        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-full ${status.bg} flex items-center justify-center`}>
                  <StatusIcon className={`w-6 h-6 ${status.color} ${connectionStatus === 'connecting' ? 'animate-spin' : ''}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-fore">Status da Conexão</h3>
                  <p className={`font-medium ${status.color}`}>{status.text}</p>
                  {connectionTimer > 30 && connectionStatus === 'connecting' && (
                    <p className="text-sm text-muted-foreground">
                      Reiniciará automaticamente em {40 - connectionTimer}s
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Connection Steps */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Instructions */}
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>📋</span>
                <span>Como conectar</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <div>
                  <h4 className="font-medium text-foreground">Gerar QR Code</h4>
                  <p className="text-sm text-muted-foreground">
                    Clique no botão para gerar um QR code único
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <div>
                  <h4 className="font-medium text-foreground">Abrir WhatsApp</h4>
                  <p className="text-sm text-muted-foreground">
                    No seu celular, vá em Configurações → Dispositivos conectados
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <div>
                  <h4 className="font-medium text-foreground">Escanear QR Code</h4>
                  <p className="text-sm text-muted-foreground">
                    Aponte a câmera para o QR code e aguarde a conexão
                  </p>
                </div>
              </div>

              <Button 
                onClick={handleConnectWhatsApp}
                disabled={isLoading || !profile?.nome || !profile?.numero || connectionStatus === 'connecting'}
                className="w-full mt-6"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processando...
                  </>
                ) : connectionStatus === 'connecting' ? (
                  <>
                    <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  <>
                    <Smartphone className="w-4 h-4 mr-2" />
                    Conectar WhatsApp
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* QR Code Display */}
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>📱</span>
                <span>QR Code</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center space-y-4">
                {connectionStatus === 'disconnected' && !qrCode ? (
                  <div className="w-64 h-64 bg-muted rounded-lg flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <span className="text-4xl block mb-2">📱</span>
                      <p>Clique em "Conectar WhatsApp" para começar</p>
                    </div>
                  </div>
                ) : connectionStatus === 'connecting' || qrCode ? (
                  <div className="w-64 h-64 bg-white border-2 border-border rounded-lg flex items-center justify-center relative overflow-hidden">
                    {qrCode && (
                      <img 
                        src={qrCode} 
                        alt="QR Code" 
                        className="w-56 h-56 object-contain"
                        onError={(e) => {
                          console.error('Erro ao carregar imagem do QR Code:', e);
                          toast({
                            title: 'Erro no QR Code',
                            description: 'Não foi possível carregar a imagem do QR Code',
                            variant: 'destructive'
                          });
                        }}
                      />
                    )}
                  </div>
                ) : (
                  <div className="w-64 h-64 bg-green-50 rounded-lg flex items-center justify-center">
                    <div className="text-center text-green-600">
                      <span className="text-6xl block mb-4">✅</span>
                      <p className="font-semibold">Conectado com sucesso!</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Sua Summi está pronta para atender
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Connected Features */}
        {connectionStatus === 'connected' && (
          <Card className="card-hover animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>⚡</span>
                <span>Recursos Ativos</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
                  <span className="text-2xl">🤖</span>
                  <div>
                    <h4 className="font-medium text-foreground">Respostas Automáticas</h4>
                    <p className="text-sm text-muted-foreground">Ativo 24/7</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
                  <span className="text-2xl">📊</span>
                  <div>
                    <h4 className="font-medium text-foreground">Coleta de Dados</h4>
                    <p className="text-sm text-muted-foreground">Qualificação ativa</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
                  <span className="text-2xl">🔄</span>
                  <div>
                    <h4 className="font-medium text-foreground">Sincronização</h4>
                    <p className="text-sm text-muted-foreground">Tempo real</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Informações do Perfil Incompleto */}
        {(!profile?.nome || !profile?.numero) && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-orange-800">
                <AlertCircle className="w-5 h-5" />
                <span>Complete seu perfil</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-orange-700 mb-4">
                Para conectar o WhatsApp, você precisa completar as informações do seu perfil.
              </p>
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

export default WhatsAppConnectionPage;
