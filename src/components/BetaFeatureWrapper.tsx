
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useBetaFeatures } from '@/hooks/useBetaFeatures';
import { BetaBadge } from '@/components/BetaBadge';
import { Lock, Mail } from 'lucide-react';

interface BetaFeatureWrapperProps {
  children: React.ReactNode;
  featureName: string;
  title: string;
  description: string;
  showBadge?: boolean;
}

// Wrapper para funcionalidades beta
export const BetaFeatureWrapper: React.FC<BetaFeatureWrapperProps> = ({
  children,
  featureName,
  title,
  description,
  showBadge = true
}) => {
  const { isBetaUser, hasFeatureAccess, isLoading } = useBetaFeatures();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Se o usuário tem acesso à funcionalidade, renderiza normalmente
  if (hasFeatureAccess(featureName)) {
    return (
      <div className="relative">
        {showBadge && (
          <div className="absolute top-2 right-2 z-10">
            <BetaBadge size="sm" />
          </div>
        )}
        {children}
      </div>
    );
  }

  // Se não tem acesso, exibe a tela de bloqueio
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-gray-400" />
          {title}
          <BetaBadge size="sm" />
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center py-8">
        <div className="max-w-md mx-auto">
          <div className="mb-4">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <TestTube className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Funcionalidade Beta
            </h3>
            <p className="text-gray-600 mb-6">
              {description}
            </p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 mb-2">
              Esta funcionalidade está disponível apenas para usuários beta.
            </p>
            <p className="text-sm text-gray-500">
              Entre em contato conosco para solicitar acesso ao programa beta.
            </p>
          </div>

          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => window.location.href = 'mailto:contato@summi.com.br?subject=Solicitar Acesso Beta'}
          >
            <Mail className="h-4 w-4 mr-2" />
            Solicitar Acesso Beta
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
