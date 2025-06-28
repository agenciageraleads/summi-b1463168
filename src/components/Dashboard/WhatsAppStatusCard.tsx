
// ABOUTME: Componente de status da conexão WhatsApp redesenhado no estilo "ziptalk"
// ABOUTME: Interface limpa focada apenas no status da conexão e ações principais

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useProfile } from '@/hooks/useProfile';
import { useNavigate } from 'react-router-dom';
import { useWhatsAppManager } from '@/hooks/useWhatsAppManager';
import { 
  Link, 
  Zap, 
  Settings, 
  Power,
  Phone
} from 'lucide-react';

export const WhatsAppStatusCard: React.FC = () => {
  const { profile } = useProfile();
  const navigate = useNavigate();
  const { state, handleDisconnect } = useWhatsAppManager();

  // Formatar número de telefone para exibição
  const formatPhoneNumber = (phone: string) => {
    if (!phone) return '';
    // Formato: +55 (62) 8243-5286
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 13) {
      return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 5)}${cleaned.slice(5, 9)}-${cleaned.slice(9)}`;
    }
    return phone;
  };

  // Data da última atualização
  const getLastUpdate = () => {
    const now = new Date();
    return now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const isConnected = state.connectionState === 'already_connected';
  const phoneNumber = profile?.numero ? formatPhoneNumber(profile.numero) : '';

  return (
    <Card className="w-full bg-gradient-to-r from-gray-900 to-gray-800 text-white border-0 shadow-xl">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          {/* Lado esquerdo - Número e Status */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <Phone className="w-6 h-6 text-gray-300" />
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <span className="text-lg font-medium">
                    {phoneNumber || 'Não conectado'}
                  </span>
                  <Link className="w-4 h-4 text-gray-400" />
                  {isConnected && (
                    <Badge className="bg-green-500 text-white border-0 px-3 py-1">
                      Ativo
                    </Badge>
                  )}
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-400">
                  <span>Última atualização: {getLastUpdate()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Lado direito - Ícone de energia e botões */}
          <div className="flex items-center space-x-4">
            {isConnected && (
              <Zap className="w-6 h-6 text-green-400" />
            )}
            
            <div className="flex space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/settings')}
                className="bg-transparent border-gray-500 text-white hover:bg-gray-700 flex items-center space-x-2"
              >
                <Settings className="w-4 h-4" />
                <span>Preferências</span>
              </Button>
              
              {isConnected && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnect}
                  className="bg-transparent border-red-500 text-red-400 hover:bg-red-500/10 flex items-center space-x-2"
                >
                  <Power className="w-4 h-4" />
                  <span>Desconectar</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
