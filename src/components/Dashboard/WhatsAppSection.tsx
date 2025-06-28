
// ABOUTME: Seção unificada do WhatsApp no dashboard
// ABOUTME: Componente consolidado que integra status e gerenciamento de conexão
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';
import { WhatsAppManagerV2 } from '@/components/WhatsApp/WhatsAppManagerV2';

export const WhatsAppSection: React.FC = () => {
  return (
    <Card className="w-full bg-white border border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MessageSquare className="w-5 h-5" />
          <span>WhatsApp Business</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <WhatsAppManagerV2 />
      </CardContent>
    </Card>
  );
};
