
// ABOUTME: Componente de status da conexão WhatsApp com design limpo estilo "ziptalk"
// ABOUTME: Exibe informações essenciais da conexão e botões de ação principais

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useProfile } from '@/hooks/useProfile';
import { useNavigate } from 'react-router-dom';
import { useWhatsAppManager } from '@/hooks/useWhatsAppManager';
import { useToast } from '@/hooks/use-toast';
import { Link, Zap, Settings, Unlink, Phone, CheckCircle, AlertCircle, WifiOff } from 'lucide-react';

export const WhatsAppStatusCard: React.FC = () => {
  const { profile } = useProfile();
  const navigate = useNavigate();
  const { state, handleDisconnect } = useWhatsAppManager();
  const { toast } = useToast();

  // Função para formatar o número de telefone
  const formatPhoneNumber = (numero: string) => {
    if (!numero) return '';
    const cleaned = numero.replace(/\D/g, '');
    if (cleaned.length === 13) {
      return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 5)} ${cleaned.slice(5, 9)}-${cleaned.slice(9)}`;
    }
    return numero;
  };

  // Função para obter a data da última atualização
  const getLastUpdate = () => {
    return new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Função para renderizar o status
  const renderStatus = () => {
    switch (state.connectionState) {
      case 'already_connected':
        return (
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium text-green-700">Ativo</span>
          </div>
        );
      case 'is_connecting':
      case 'needs_qr_code':
        return (
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <span className="text-sm font-medium text-yellow-700">Conectando</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="text-sm font-medium text-red-700">Erro</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            <span className="text-sm font-medium text-gray-600">Desconectado</span>
          </div>
        );
    }
  };

  const handleDisconnectClick = async () => {
    try {
      await handleDisconnect();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao desconectar",
        variant: "destructive"
      });
    }
  };

  const isConnected = state.connectionState === 'already_connected';

  return (
    <Card className="w-full max-w-md mx-auto border-gray-200 shadow-sm">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header com ícone e número */}
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Link className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-900">
                  {profile?.numero ? formatPhoneNumber(profile.numero) : 'Não configurado'}
                </span>
              </div>
            </div>
          </div>

          {/* Status e energia */}
          <div className="flex items-center justify-between">
            {renderStatus()}
            <div className="flex items-center space-x-1">
              <Zap className="w-4 h-4 text-yellow-500" />
              <span className="text-xs text-gray-500">Online</span>
            </div>
          </div>

          {/* Última atualização */}
          <div className="text-xs text-gray-500">
            Última atualização: {getLastUpdate()}
          </div>

          {/* Botões de ação */}
          <div className="flex space-x-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => navigate('/settings')}
            >
              <Settings className="w-4 h-4 mr-2" />
              Preferências
            </Button>
            
            {isConnected && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={handleDisconnectClick}
                disabled={state.isLoading}
              >
                <Unlink className="w-4 h-4 mr-2" />
                Desconectar
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
