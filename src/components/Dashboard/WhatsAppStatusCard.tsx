
// ABOUTME: Componente principal de status do WhatsApp no estilo "ziptalk".
// ABOUTME: Interface limpa focada na conexão, sem menções a assinatura.

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useProfile } from '@/hooks/useProfile';
import { useWhatsAppManager } from '@/hooks/useWhatsAppManager';
import { useNavigate } from 'react-router-dom';
import { 
  Phone, 
  Link2, 
  Settings, 
  Power, 
  Zap, 
  Circle,
  Clock,
  CheckCircle2
} from 'lucide-react';

export const WhatsAppStatusCard = () => {
  const { profile } = useProfile();
  const { state, handleDisconnect } = useWhatsAppManager();
  const navigate = useNavigate();

  const isConnected = state.connectionState === 'already_connected';
  
  // Formatar número de telefone para display
  const formatPhoneNumber = (numero: string) => {
    if (!numero) return '';
    const cleaned = numero.replace(/\D/g, '');
    if (cleaned.length === 13) {
      return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 5)} ${cleaned.slice(5, 9)}-${cleaned.slice(9)}`;
    }
    return numero;
  };

  const getLastUpdate = () => {
    const now = new Date();
    return now.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <Card className="w-full max-w-md mx-auto border-2 border-gray-100 hover:border-green-200 transition-all duration-300">
      <CardContent className="p-6">
        {/* Header com número e status */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Phone className="w-8 h-8 text-gray-700" />
              {isConnected && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                  <Link2 className="w-2.5 h-2.5 text-white" />
                </div>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500">WhatsApp</p>
              <p className="font-semibold text-gray-900">
                {profile?.numero ? formatPhoneNumber(profile.numero) : 'Não conectado'}
              </p>
            </div>
          </div>
          
          {/* Status Badge */}
          {isConnected ? (
            <Badge className="bg-green-100 text-green-800 border-green-200 px-3 py-1">
              <Circle className="w-2 h-2 mr-1 fill-current" />
              Ativo
            </Badge>
          ) : (
            <Badge variant="outline" className="border-gray-300 text-gray-600 px-3 py-1">
              <Circle className="w-2 h-2 mr-1" />
              Inativo
            </Badge>
          )}
        </div>

        {/* Status Visual Principal */}
        <div className="text-center mb-6">
          <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-3 ${
            isConnected 
              ? 'bg-green-100 border-4 border-green-200' 
              : 'bg-gray-100 border-4 border-gray-200'
          }`}>
            {isConnected ? (
              <Zap className="w-8 h-8 text-green-600" />
            ) : (
              <Power className="w-8 h-8 text-gray-400" />
            )}
          </div>
          
          <h3 className="font-semibold text-lg text-gray-900 mb-1">
            {isConnected ? 'Summi Ativo' : 'Aguardando Conexão'}
          </h3>
          
          <p className="text-sm text-gray-500">
            {isConnected 
              ? 'Monitorando suas conversas' 
              : 'Conecte seu WhatsApp para começar'
            }
          </p>
        </div>

        {/* Informações Adicionais */}
        {isConnected && (
          <div className="bg-green-50 rounded-lg p-3 mb-6">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-green-800">Última atualização</span>
              </div>
              <span className="text-green-700 font-medium">
                {getLastUpdate()}
              </span>
            </div>
          </div>
        )}

        {/* Botões de Ação */}
        <div className="space-y-3">
          {isConnected ? (
            <>
              <Button
                onClick={() => navigate('/settings')}
                variant="outline"
                className="w-full flex items-center justify-center space-x-2 border-gray-300 hover:border-green-300 hover:text-green-600"
              >
                <Settings className="w-4 h-4" />
                <span>Preferências</span>
              </Button>
              
              <Button
                onClick={handleDisconnect}
                variant="outline"
                className="w-full flex items-center justify-center space-x-2 border-red-300 text-red-600 hover:border-red-400 hover:bg-red-50"
              >
                <Power className="w-4 h-4" />
                <span>Desconectar</span>
              </Button>
            </>
          ) : (
            <Button
              onClick={() => navigate('/whatsapp-connection')}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              <Link2 className="w-4 h-4 mr-2" />
              Conectar WhatsApp
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
