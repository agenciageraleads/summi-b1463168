
// ABOUTME: Componente principal para gerenciar conexão WhatsApp com interface aprimorada e robustez
// ABOUTME: Design refinado com indicadores visuais claros e ações específicas para cada situação

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useProfile } from '@/hooks/useProfile';
import { useNavigate } from 'react-router-dom';
import { useWhatsAppManager } from '@/hooks/useWhatsAppManager';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  MessageSquare, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  QrCode, 
  Phone, 
  Settings, 
  RefreshCw,
  Smartphone,
  Copy,
  Clock,
  AlertTriangle,
  Check,
  X,
  Trash2
} from 'lucide-react';

export const WhatsAppConnectionManager: React.FC = () => {
  const { profile, refreshProfile } = useProfile();
  const navigate = useNavigate();
  const { state, handleConnect, handleDisconnect, forceRenewCodes } = useWhatsAppManager();
  const { toast } = useToast();
  const [isRecreating, setIsRecreating] = React.useState(false);

  // Função para copiar pairing code
  const copyPairingCode = async () => {
    if (state.pairingCode) {
      try {
        await navigator.clipboard.writeText(state.pairingCode);
        toast({
          title: "✅ Copiado!",
          description: "Código de pareamento copiado com sucesso",
          duration: 2000
        });
      } catch (error) {
        console.error('Erro ao copiar:', error);
        toast({
          title: "❌ Erro",
          description: "Não foi possível copiar o código",
          variant: "destructive"
        });
      }
    }
  };

  // Função para recriar instância
  const handleRecreateInstance = async () => {
    if (!profile?.instance_name) {
      toast({
        title: "❌ Erro",
        description: "Nenhuma instância encontrada para recriar",
        variant: "destructive"
      });
      return;
    }

    setIsRecreating(true);
    
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Usuário não autenticado');
      }

      const { data: deleteData, error: deleteError } = await supabase.functions.invoke('evolution-api-handler', {
        body: { 
          action: 'delete',
          instanceName: profile.instance_name 
        },
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (deleteError) {
        throw new Error('Erro ao deletar instância atual');
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
      await refreshProfile();
      await handleConnect();

      toast({
        title: "✅ Instância Recriada",
        description: "A instância foi recriada com sucesso.",
        duration: 5000
      });

    } catch (error: any) {
      console.error('[WhatsApp Manager] Erro ao recriar instância:', error);
      toast({
        title: "❌ Erro ao Recriar Instância",
        description: error.message || 'Erro inesperado ao recriar instância',
        variant: "destructive"
      });
    } finally {
      setIsRecreating(false);
    }
  };

  // Renderizar status elegante
  const renderStatus = () => {
    switch (state.connectionState) {
      case 'already_connected':
        return (
          <div className="flex items-center space-x-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-emerald-900">WhatsApp Conectado</h3>
              <p className="text-sm text-emerald-700">Funcionando perfeitamente</p>
              {profile?.numero && (
                <p className="text-xs text-emerald-600 mt-1">
                  📱 {profile.numero.replace(/(\d{2})(\d{2})(\d{1})(\d{4})(\d{4})/, '+$1 ($2) $3 $4-$5')}
                </p>
              )}
            </div>
            <Button onClick={handleDisconnect} variant="outline" size="sm" className="border-emerald-300 text-emerald-700 hover:bg-emerald-100">
              Desconectar
            </Button>
          </div>
        );
      case 'is_connecting':
        return (
          <div className="flex items-center space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              {state.isRenewing ? (
                <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
              ) : (
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-blue-900">
                {state.isRenewing ? 'Renovando códigos...' : 'Conectando...'}
              </h3>
              <p className="text-sm text-blue-700">
                {state.isRenewing ? 'Gerando novos códigos de conexão' : 'Use um dos métodos abaixo'}
              </p>
              {state.isPolling && !state.isRenewing && (
                <p className="text-xs text-blue-600 mt-1">🔄 Aguardando confirmação</p>
              )}
            </div>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center space-x-3 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-red-900">Erro na Conexão</h3>
              <p className="text-sm text-red-700">{state.message}</p>
              {state.generationAttempts > 0 && (
                <p className="text-xs text-red-600 mt-1">
                  Tentativas: {state.generationAttempts}/3
                </p>
              )}
            </div>
            <div className="flex space-x-2">
              <Button onClick={() => handleConnect()} variant="outline" size="sm" className="border-red-300 text-red-700 hover:bg-red-100">
                Tentar Novamente
              </Button>
              {profile?.instance_name && state.errorCount >= 3 && (
                <Button onClick={handleRecreateInstance} variant="outline" size="sm" className="border-orange-300 text-orange-700 hover:bg-orange-100" disabled={isRecreating}>
                  {isRecreating ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-1" />
                  )}
                  Recriar
                </Button>
              )}
            </div>
          </div>
        );
      default:
        return (
          <div className="flex items-center space-x-3 p-4 bg-gray-50 border border-gray-200 rounded-xl">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-gray-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">Sincronizar WhatsApp</h3>
              <p className="text-sm text-gray-700">Conecte seu dispositivo para começar</p>
            </div>
            {state.connectionState === 'needs_phone_number' ? (
              <Button variant="outline" size="sm" onClick={() => navigate('/settings')} className="border-blue-300 text-blue-700 hover:bg-blue-50">
                <Settings className="w-4 h-4 mr-1" />
                Configurar
              </Button>
            ) : (
              <Button onClick={() => handleConnect()} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={state.isLoading}>
                {state.isLoading ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Smartphone className="w-4 h-4 mr-1" />
                )}
                Conectar
              </Button>
            )}
          </div>
        );
    }
  };

  // NOVA: Renderizar contador elegante com renovação automática
  const renderCountdown = () => {
    if (state.connectionState !== 'is_connecting' || (!state.qrCode && !state.pairingCode) || state.isRenewing) {
      return null;
    }

    const minutes = Math.floor(state.countdownSeconds / 60);
    const seconds = state.countdownSeconds % 60;
    const isWarning = state.countdownSeconds <= 15;
    const isExpiring = state.countdownSeconds <= 5;

    return (
      <div className={`flex items-center justify-between p-3 rounded-lg transition-all ${
        isExpiring ? 'bg-red-50 border border-red-200' : 
        isWarning ? 'bg-amber-50 border border-amber-200' : 
        'bg-blue-50 border border-blue-200'
      }`}>
        <div className="flex items-center space-x-3">
          <Clock className={`w-4 h-4 ${
            isExpiring ? 'text-red-600' : 
            isWarning ? 'text-amber-600' : 
            'text-blue-600'
          }`} />
          <span className={`text-sm font-medium ${
            isExpiring ? 'text-red-800' : 
            isWarning ? 'text-amber-800' : 
            'text-blue-800'
          }`}>
            {isExpiring ? 'Renovando automaticamente...' : 
             `Renovação automática em ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`}
          </span>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={forceRenewCodes}
          className={`text-xs px-3 py-1 h-7 ${
            isExpiring ? 'border-red-300 text-red-700 hover:bg-red-100' :
            isWarning ? 'border-amber-300 text-amber-700 hover:bg-amber-100' :
            'border-blue-300 text-blue-700 hover:bg-blue-100'
          }`}
          disabled={state.isRenewing}
        >
          {state.isRenewing ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <>
              <RefreshCw className="w-3 h-3 mr-1" />
              Renovar Agora
            </>
          )}
        </Button>
      </div>
    );
  };

  // Renderizar alerta de erro elegante
  const renderErrorAlert = () => {
    if (!state.hasConnectionError || state.errorCount === 0) return null;

    return (
      <div className="flex items-center space-x-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
        <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-orange-800 font-medium">
            {state.errorCount >= 5 
              ? `Muitos erros detectados (${state.errorCount}). Recomendamos recriar a instância.`
              : `Tentativa ${state.errorCount}/5. Tentando reconectar...`
            }
          </p>
        </div>
        {state.errorCount >= 3 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRecreateInstance}
            disabled={isRecreating}
            className="text-xs border-orange-300 text-orange-700 hover:bg-orange-100 flex-shrink-0"
          >
            {isRecreating ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <>
                <Trash2 className="w-3 h-3 mr-1" />
                Recriar
              </>
            )}
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Status Principal */}
      {renderStatus()}

      {/* Alerta de Erro */}
      {renderErrorAlert()}

      {/* Contador */}
      {renderCountdown()}

      {/* Métodos de Conexão */}
      {(state.qrCode || state.pairingCode) && state.connectionState === 'is_connecting' && !state.isRenewing && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Método do Código (Preferido) */}
          {state.pairingCode && (
            <Card className="relative overflow-hidden border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100">
              <div className="absolute top-3 right-3">
                <Badge className="bg-emerald-600 text-white text-xs font-medium">
                  Recomendado
                </Badge>
              </div>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center space-x-2 text-emerald-800">
                  <Smartphone className="w-5 h-5" />
                  <span>Código de Acesso</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-emerald-700 leading-relaxed">
                    1. Abra o WhatsApp no seu celular<br/>
                    2. Toque em <strong>⋮</strong> → <strong>Dispositivos conectados</strong><br/>
                    3. Toque em <strong>Conectar um dispositivo</strong><br/>
                    4. Toque em <strong>Conectar com código</strong>
                  </p>
                </div>
                <div className="bg-white border-2 border-emerald-300 rounded-lg p-4 text-center">
                  <div className="text-3xl font-mono font-bold text-emerald-800 tracking-wider mb-2 select-all">
                    {state.pairingCode}
                  </div>
                  <div className="flex items-center justify-center space-x-2 text-xs text-emerald-600 mb-3">
                    <Check className="w-3 h-3" />
                    <span>8 dígitos válidos</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyPairingCode}
                    className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Copiar código
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Método QR Code */}
          {state.qrCode && (
            <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center space-x-2 text-blue-800">
                  <QrCode className="w-5 h-5" />
                  <span>QR Code</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-blue-700 leading-relaxed">
                    1. Abra o WhatsApp no seu celular<br/>
                    2. Toque em <strong>⋮</strong> → <strong>Dispositivos conectados</strong><br/>
                    3. Toque em <strong>Conectar um dispositivo</strong><br/>
                    4. Aponte a câmera para o QR Code
                  </p>
                </div>
                <div className="bg-white border-2 border-blue-300 rounded-lg p-4 flex justify-center">
                  <img 
                    src={state.qrCode} 
                    alt="QR Code para conectar WhatsApp" 
                    className="w-40 h-40 object-contain rounded-lg" 
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Dica de Uso */}
      {(state.qrCode || state.pairingCode) && state.connectionState === 'is_connecting' && !state.isRenewing && (
        <div className="text-center space-y-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600 font-medium">
            💡 Use qualquer um dos métodos - ambos funcionam perfeitamente
          </p>
          <p className="text-xs text-gray-500">
            Os códigos são renovados automaticamente a cada 60 segundos para sua segurança
          </p>
          {state.generationAttempts > 0 && (
            <p className="text-xs text-blue-600">
              ⚡ Sistema com 3 tentativas automáticas para máxima confiabilidade
            </p>
          )}
        </div>
      )}
    </div>
  );
};
