
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTrialDays } from '@/hooks/useTrialDays';
import { Clock, Crown, AlertTriangle } from 'lucide-react';

interface TrialBannerProps {
  onUpgradeClick?: () => void;
}

export const TrialBanner = ({ onUpgradeClick }: TrialBannerProps) => {
  const { trialDaysLeft, isLoading, hasTrialExpired, isInTrial } = useTrialDays();

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-center">
            <div className="animate-pulse text-blue-600">Verificando período de teste...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isInTrial && !hasTrialExpired) {
    // Usuário tem assinatura ativa ou não está em trial
    return null;
  }

  if (hasTrialExpired) {
    return (
      <Card className="bg-gradient-to-r from-red-50 to-pink-50 border-red-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-red-800">Período de teste expirado</h3>
                <p className="text-sm text-red-600">
                  Faça upgrade para continuar usando todos os recursos
                </p>
              </div>
            </div>
            <Button 
              onClick={onUpgradeClick}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Crown className="w-4 h-4 mr-2" />
              Fazer Upgrade
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isInTrial) {
    const isUrgent = (trialDaysLeft || 0) <= 2;
    
    return (
      <Card className={`bg-gradient-to-r ${
        isUrgent 
          ? 'from-amber-50 to-orange-50 border-amber-200' 
          : 'from-blue-50 to-indigo-50 border-blue-200'
      }`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isUrgent ? 'bg-amber-100' : 'bg-blue-100'
              }`}>
                <Clock className={`w-5 h-5 ${isUrgent ? 'text-amber-600' : 'text-blue-600'}`} />
              </div>
              <div>
                <h3 className={`font-semibold ${isUrgent ? 'text-amber-800' : 'text-blue-800'}`}>
                  Período de teste
                </h3>
                <p className={`text-sm ${isUrgent ? 'text-amber-600' : 'text-blue-600'}`}>
                  {trialDaysLeft === 1 
                    ? 'Último dia do seu período de teste gratuito' 
                    : `${trialDaysLeft} dias restantes no seu período de teste`
                  }
                </p>
              </div>
            </div>
            <Button 
              onClick={onUpgradeClick}
              className={isUrgent 
                ? 'bg-amber-600 hover:bg-amber-700 text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
              }
            >
              <Crown className="w-4 h-4 mr-2" />
              Fazer Upgrade
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
};
