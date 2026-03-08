
import { useState } from 'react';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useProfile } from '@/hooks/useProfile';
import { useWhatsAppManager } from '@/hooks/useWhatsAppManager';
import { CheckCircle, AlertCircle, RotateCcw, Smartphone } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { useTranslation } from 'react-i18next';

const WhatsAppConnectionV2Page = () => {
  const { t } = useTranslation();
  const { profile } = useProfile();
  const { state, handleConnect, handleDisconnect } = useWhatsAppManager();

  // CORREÇÃO: Função wrapper que ignora o evento do mouse
  const handleConnectClick = () => {
    handleConnect(state.connectionMethod);
  };

  // Função para obter informações de display do status
  const getStatusDisplay = () => {
    switch (state.connectionState) {
      case 'already_connected':
        return {
          color: 'text-green-600',
          bg: 'bg-green-100',
          icon: CheckCircle,
          text: t('connected')
        };
      case 'is_connecting':
      case 'needs_connection':
        return {
          color: 'text-yellow-600',
          bg: 'bg-yellow-100',
          icon: RotateCcw,
          text: state.isPolling ? t('waiting_connection') : t('connecting')
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
        title={t('whatsapp_connection_v2_title')}
        description={t('whatsapp_connection_v2_desc')}
        author="Summi"
      />
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {t('whatsapp_connection_v2_header')}
          </h1>
          <p className="text-muted-foreground">
            {t('whatsapp_connection_v2_subtitle')}
          </p>
        </div>

        {/* Status Card */}
        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-full ${status.bg} flex items-center justify-center`}>
                  <StatusIcon className={`w-6 h-6 ${status.color} ${state.connectionState === 'is_connecting' ? 'animate-spin' : ''}`} />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground text-base">{t('connection_status_label')}</h2>
                  <p className={`font-medium ${status.color}`}>{status.text}</p>
                  {state.isPolling && (
                    <p className="text-sm text-muted-foreground">
                      {t('monitoring_connection')}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex space-x-2">
                {state.connectionState === 'needs_phone_number' ||
                  state.connectionState === 'needs_connection' ||
                  state.connectionState === 'error' ? (
                  <Button
                    role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.click(); }} onClick={handleConnectClick}
                    disabled={state.isLoading || !profile?.nome || !profile?.numero}
                    className="flex items-center"
                  >
                    {state.isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {t('processing')}
                      </>
                    ) : (
                      <>
                        <Smartphone className="w-4 h-4 mr-2" />
                        {t('connect_whatsapp_btn')}
                      </>
                    )}
                  </Button>
                ) : null}

                {state.connectionState === 'already_connected' && (
                  <Button
                    role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.click(); }} onClick={handleDisconnect}
                    disabled={state.isLoading}
                    variant="destructive"
                  >
                    {t('disconnect_btn')}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Instruções e QR Code */}
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
                  <h3 className="font-medium text-foreground">{t('step1_v2_title')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('step1_v2_desc')}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <div>
                  <h3 className="font-medium text-foreground">{t('step2_v2_title')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('step2_v2_desc')}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <div>
                  <h3 className="font-medium text-foreground">{t('step3_v2_title')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('step3_v2_desc')}
                  </p>
                </div>
              </div>
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
                {state.connectionState === 'needs_phone_number' && !state.qrCode ? (
                  <div className="w-64 h-64 bg-muted rounded-lg flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <span className="text-4xl block mb-2">📱</span>
                      <p>{t('click_to_start_msg')}</p>
                    </div>
                  </div>
                ) : (state.connectionState === 'is_connecting' || state.connectionState === 'needs_connection') && state.qrCode ? (
                  <div className="w-64 h-64 bg-white border-2 border-border rounded-lg flex items-center justify-center relative overflow-hidden">
                    <img
                      src={state.qrCode}
                      alt={t('whatsapp_qrcode_alt')}
                      className="w-56 h-56 object-contain"
                    />
                  </div>
                ) : state.connectionState === 'already_connected' ? (
                  <div className="w-64 h-64 bg-green-50 rounded-lg flex items-center justify-center">
                    <div className="text-center text-green-600">
                      <span className="text-6xl block mb-4">✅</span>
                      <h3 className="font-semibold">{t('success_connection_msg')}</h3>
                      <p className="text-sm text-muted-foreground mt-2">
                        {t('webhook_configured_msg')}
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

        {/* Recursos Ativos */}
        {state.connectionState === 'already_connected' && (
          <Card className="card-hover animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>⚡</span>
                <h2 className="text-lg font-semibold">{t('active_features_v2_title')}</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
                  <span className="text-2xl">🔗</span>
                  <div>
                    <h3 className="font-medium text-foreground">{t('auto_webhook_title')}</h3>
                    <p className="text-sm text-muted-foreground">{t('configured_on_creation')}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
                  <span className="text-2xl">📨</span>
                  <div>
                    <h3 className="font-medium text-foreground">{t('upsert_events_title')}</h3>
                    <p className="text-sm text-muted-foreground">{t('capture_all_messages')}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
                  <span className="text-2xl">🔄</span>
                  <div>
                    <h3 className="font-medium text-foreground">{t('base64_data_title')}</h3>
                    <p className="text-sm text-muted-foreground">{t('optimized_format')}</p>
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

export default WhatsAppConnectionV2Page;
