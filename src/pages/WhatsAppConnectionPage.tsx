
import { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';
import { QrCode, Smartphone, CheckCircle, AlertCircle, RotateCcw } from 'lucide-react';
import {
  initializeWhatsAppConnection,
  generateQRCode,
  checkConnectionStatus,
  restartInstance
} from '@/services/whatsappConnection';
import { SEO } from '@/components/SEO';
import { useTranslation } from 'react-i18next';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

const WhatsAppConnectionPage = () => {
  const { t } = useTranslation();
  const { profile, updateProfile } = useProfile();
  const { toast } = useToast();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [qrCode, setQrCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [connectionTimer, setConnectionTimer] = useState(0);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // CORREÇÃO: Limpar intervalos ao desmontar o componente
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // CORREÇÃO: Função para gerar nome da instância
  const generateInstanceName = () => {
    if (!profile?.nome || !profile?.numero) return '';

    const nome = profile.nome.toLowerCase().replace(/[^a-z0-9]/g, '');
    const ultimosDigitos = profile.numero.slice(-4);
    return `${nome}_${ultimosDigitos}`;
  };

  // CORREÇÃO: Função para iniciar timer de conexão
  const startConnectionTimer = () => {
    setConnectionTimer(0);
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setConnectionTimer(prev => prev + 1);
    }, 1000);
  };

  // CORREÇÃO: Função para parar timer de conexão
  const stopConnectionTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setConnectionTimer(0);
  };

  // CORREÇÃO: Função para verificar status da conexão usando o novo serviço
  const checkConnectionStatusInternal = async (instanceName: string): Promise<boolean> => {
    try {
      const result = await checkConnectionStatus(instanceName);
      console.log(`[WhatsApp] Estado da conexão: ${result.status}`);

      if (result.success && ['open', 'connected'].includes(result.status)) {
        setConnectionStatus('connected');
        setQrCode('');
        stopConnectionTimer();
        return true;
      }

      return false;
    } catch (error) {
      console.error('[WhatsApp] Erro ao verificar estado da conexão:', error);
      return false;
    }
  };

  // CORREÇÃO: Função para monitorar conexão a cada 10 segundos
  const startConnectionMonitoring = (instanceName: string) => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(async () => {
      const isConnected = await checkConnectionStatusInternal(instanceName);

      if (isConnected) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        toast({
          title: t('whatsapp_connected_title'),
          description: t('whatsapp_connected_desc')
        });
        return;
      }

      // CORREÇÃO: Se passou 40 segundos, reiniciar a instância
      if (connectionTimer >= 40) {
        console.log('[WhatsApp] Timeout de 40s atingido, reiniciando instância...');
        await handleRestartAndReconnect(instanceName);
      }
    }, 10000); // A cada 10 segundos
  };

  // CORREÇÃO: Função para reiniciar e reconectar usando o novo serviço
  const handleRestartAndReconnect = async (instanceName: string) => {
    try {
      console.log('[WhatsApp] Reiniciando instância...');
      await restartInstance(instanceName);

      toast({
        title: t('instance_restarted_title'),
        description: t('generating_new_qrcode')
      });

      // CORREÇÃO: Aguardar 3 segundos antes de gerar novo QR Code
      setTimeout(async () => {
        await handleConnect(instanceName);
      }, 3000);

    } catch (error) {
      console.error('[WhatsApp] Erro ao reiniciar instância:', error);
      toast({
        title: t('error'),
        description: t('restart_instance_error'),
        variant: 'destructive'
      });
    }
  };

  // CORREÇÃO: Função para conectar e gerar QR Code usando o novo serviço
  const handleConnect = async (instanceName?: string) => {
    const targetInstanceName = instanceName || generateInstanceName();

    try {
      console.log(`[WhatsApp] Conectando à instância: ${targetInstanceName}`);
      const result = await generateQRCode(targetInstanceName);

      if (result.success && result.qrCode) {
        setQrCode(result.qrCode);
        setConnectionStatus('connecting');
        startConnectionTimer();
        startConnectionMonitoring(targetInstanceName);

        toast({
          title: t('qrcode_generated_title'),
          description: t('qrcode_generated_desc')
        });
      } else if (result.state === 'already_connected') {
        setConnectionStatus('connected');
        setQrCode('');
        toast({
          title: t('whatsapp_already_connected_title'),
          description: t('whatsapp_already_connected_desc')
        });
      } else {
        throw new Error(result.error || 'Erro ao gerar QR Code');
      }

    } catch (error) {
      console.error('[WhatsApp] Erro ao conectar instância:', error);
      toast({
        title: t('error'),
        description: t('connect_instance_error'),
        variant: 'destructive'
      });
      setConnectionStatus('disconnected');
      stopConnectionTimer();
    }
  };

  // CORREÇÃO: Função principal para conectar WhatsApp seguindo o fluxo completo
  const handleConnectWhatsApp = async () => {
    // 1. Verificar se os dados do usuário estão preenchidos
    if (!profile?.nome || !profile?.numero) {
      toast({
        title: t('incomplete_info_title'),
        description: t('complete_profile_before_connect'),
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    const instanceName = generateInstanceName();

    try {
      console.log(`[WhatsApp] Iniciando fluxo de conexão para: ${instanceName}`);

      // 2. Inicializar conexão (criar instância se necessário)
      console.log('[WhatsApp] Inicializando conexão...');
      const initResult = await initializeWhatsAppConnection();

      if (initResult.success && initResult.instanceName) {
        // Atualizar perfil com nome da instância se necessário
        if (!profile.instance_name) {
          await updateProfile({ instance_name: initResult.instanceName });
        }

        // 3. Gerar QR Code
        await handleConnect(initResult.instanceName);
      } else {
        throw new Error(initResult.error || 'Erro ao inicializar conexão');
      }

    } catch (error) {
      console.error('[WhatsApp] Erro no processo de conexão:', error);
      toast({
        title: t('error'),
        description: t('whatsapp_connect_process_error'),
        variant: 'destructive'
      });
      setConnectionStatus('disconnected');
      stopConnectionTimer();
    } finally {
      setIsLoading(false);
    }
  };

  // CORREÇÃO: Função para obter informações de display do status
  const getStatusDisplay = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          color: 'text-green-600',
          bg: 'bg-green-100',
          icon: CheckCircle,
          text: t('connected')
        };
      case 'connecting':
        return {
          color: 'text-yellow-600',
          bg: 'bg-yellow-100',
          icon: RotateCcw,
          text: t('connecting_timer', { timer: connectionTimer })
        };
      default:
        return {
          color: 'text-red-500',
          bg: 'bg-red-100',
          icon: AlertCircle,
          text: t('disconnected')
        };
    }
  };

  const status = getStatusDisplay();
  const StatusIcon = status.icon;

  return (
    <DashboardLayout>
      <SEO
        title={t('whatsapp_connection_title')}
        description={t('whatsapp_connection_desc')}
        author="Summi"
      />
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {t('whatsapp_connection_header')}
          </h1>
          <p className="text-muted-foreground">
            {t('whatsapp_connection_subtitle')}
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
                  <h2 className="font-semibold text-foreground text-base">{t('connection_status_label')}</h2>
                  <p className={`font-medium ${status.color}`}>{status.text}</p>
                  {connectionTimer > 30 && connectionStatus === 'connecting' && (
                    <p className="text-sm text-muted-foreground">
                      {t('auto_restart_warning', { remaining: 40 - connectionTimer })}
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
                <h2 className="text-lg font-semibold">{t('how_to_connect_title')}</h2>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <div>
                  <h3 className="font-medium text-foreground">{t('step1_title')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('step1_desc')}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <div>
                  <h3 className="font-medium text-foreground">{t('step2_title')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('step2_desc')}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <div>
                  <h3 className="font-medium text-foreground">{t('step3_title')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('step3_desc')}
                  </p>
                </div>
              </div>

              <Button
                role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.click(); }} onClick={handleConnectWhatsApp}
                disabled={isLoading || !profile?.nome || !profile?.numero || connectionStatus === 'connecting'}
                className="w-full mt-6"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {t('processing')}
                  </>
                ) : connectionStatus === 'connecting' ? (
                  <>
                    <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
                    {t('connecting')}
                  </>
                ) : (
                  <>
                    <Smartphone className="w-4 h-4 mr-2" />
                    {t('connect_whatsapp_btn')}
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
                <h2 className="text-lg font-semibold">{t('qrcode_display_title')}</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center space-y-4">
                {connectionStatus === 'disconnected' && !qrCode ? (
                  <div className="w-64 h-64 bg-muted rounded-lg flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <span className="text-4xl block mb-2">📱</span>
                      <p>{t('click_to_start_msg')}</p>
                    </div>
                  </div>
                ) : connectionStatus === 'connecting' && qrCode ? (
                  <div className="w-64 h-64 bg-white border-2 border-border rounded-lg flex items-center justify-center relative overflow-hidden">
                    <img
                      src={qrCode}
                      alt={t('whatsapp_qrcode_alt')}
                      className="w-56 h-56 object-contain"
                      onError={() => {
                        toast({
                          title: t('qrcode_error_title'),
                          description: t('qrcode_error_desc'),
                          variant: 'destructive'
                        });
                      }}
                    />
                  </div>
                ) : connectionStatus === 'connected' ? (
                  <div className="w-64 h-64 bg-green-50 rounded-lg flex items-center justify-center">
                    <div className="text-center text-green-600">
                      <span className="text-6xl block mb-4">✅</span>
                      <h3 className="font-semibold">{t('success_connection_msg')}</h3>
                      <p className="text-sm text-muted-foreground mt-2">
                        {t('ready_to_serve_msg')}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="w-64 h-64 bg-muted rounded-lg flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <span className="text-4xl block mb-2">⏳</span>
                      <p>{t('processing')}</p>
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
                <h2 className="text-lg font-semibold">{t('active_features_title')}</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
                  <span className="text-2xl">🤖</span>
                  <div>
                    <h3 className="font-medium text-foreground">{t('auto_responses_title')}</h3>
                    <p className="text-sm text-muted-foreground">{t('active_247')}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
                  <span className="text-2xl">📊</span>
                  <div>
                    <h3 className="font-medium text-foreground">{t('data_collection_title')}</h3>
                    <p className="text-sm text-muted-foreground">{t('active_qualification')}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
                  <span className="text-2xl">🔄</span>
                  <div>
                    <h3 className="font-medium text-foreground">{t('sync_title')}</h3>
                    <p className="text-sm text-muted-foreground">{t('real_time')}</p>
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
                <h2 className="text-lg font-semibold">{t('complete_your_profile_title')}</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-orange-700 mb-4">
                {t('complete_profile_warning_msg')}
              </p>
              <Button variant="outline" className="border-orange-300 text-orange-800 hover:bg-orange-100">
                {t('go_to_settings_btn')}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default WhatsAppConnectionPage;
