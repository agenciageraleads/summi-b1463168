
// ABOUTME: Componente para o estado inicial quando não há conexão WhatsApp
// ABOUTME: Exibe botão de conectar e informações básicas
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Smartphone, AlertCircle } from 'lucide-react';

interface NoConnectionStateProps {
  onConnect: () => void;
  isLoading: boolean;
  message: string;
  hasValidProfile: boolean;
}

export const NoConnectionState = ({ 
  onConnect, 
  isLoading, 
  message, 
  hasValidProfile 
}: NoConnectionStateProps) => {
  return (
    <Card className="card-hover">
      <CardContent className="p-6 text-center">
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Smartphone className="w-8 h-8 text-blue-500" />
        </div>
        
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Conecte seu WhatsApp
        </h3>
        
        <p className="text-muted-foreground mb-6">
          {message}
        </p>

        {!hasValidProfile && (
          <div className="flex items-center justify-center space-x-2 mb-4 p-3 bg-orange-50 rounded-lg">
            <AlertCircle className="w-4 h-4 text-orange-500" />
            <span className="text-sm text-orange-700">
              Complete seu perfil para continuar
            </span>
          </div>
        )}

        <Button 
          onClick={onConnect}
          disabled={isLoading || !hasValidProfile}
          size="lg"
          className="w-full max-w-xs"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
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
  );
};
