
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConnectionManager } from '@/components/WhatsApp/ConnectionManager';
import { MessageSquare } from 'lucide-react';

export const WhatsAppSection = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MessageSquare className="w-5 h-5 text-green-600" />
          <span>Conexão WhatsApp</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ConnectionManager />
      </CardContent>
    </Card>
  );
};
