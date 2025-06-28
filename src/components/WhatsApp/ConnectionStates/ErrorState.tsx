
// ABOUTME: Componente para estado de erro - exibe erro e opções de recuperação
// ABOUTME: Permite tentar novamente ou resetar completamente
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, RefreshCw, RotateCcw } from 'lucide-react';

interface ErrorStateProps {
  error: string;
  message: string;
  onRetry: () => void;
  onReset: () => void;
  isLoading: boolean;
}

export const ErrorState = ({
  error,
  message,
  onRetry,
  onReset,
  isLoading
}: ErrorStateProps) => {
  return (
    <Card className="card-hover border-2 border-red-200">
      <CardContent className="p-6 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Erro na Conexão
        </h3>
        
        <p className="text-muted-foreground mb-2">
          {message}
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
            <p className="text-sm text-red-700">
              {error}
            </p>
          </div>
        )}

        <div className="flex space-x-3 justify-center">
          <Button
            onClick={onRetry}
            disabled={isLoading}
            variant="outline"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Tentar Novamente
          </Button>
          
          <Button
            onClick={onReset}
            disabled={isLoading}
            variant="ghost"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Recomeçar
          </Button>
        </div>

        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            Se o problema persistir, entre em contato com o suporte
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
