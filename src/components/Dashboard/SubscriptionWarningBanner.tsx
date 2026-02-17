// ABOUTME: Banner de aviso exibido no dashboard quando a assinatura tem cancelamento pendente.
// ABOUTME: Mostra a data de expiração e um link para reativar a assinatura.

import { AlertTriangle } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export const SubscriptionWarningBanner = () => {
  const { subscription, isLoading } = useSubscription();
  const navigate = useNavigate();

  if (isLoading || !subscription.subscribed || !subscription.cancel_at_period_end) {
    return null;
  }

  const endDate = subscription.subscription_end
    ? new Date(subscription.subscription_end).toLocaleDateString('pt-BR')
    : '—';

  return (
    <div className="rounded-lg border border-yellow-400 bg-yellow-50 p-4 flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
        <p className="text-sm text-yellow-800">
          Sua assinatura será encerrada em <strong>{endDate}</strong>. Reative para não perder o acesso.
        </p>
      </div>
      <Button
        size="sm"
        onClick={() => navigate('/subscription')}
        className="bg-summi-green hover:bg-summi-green/90 text-white flex-shrink-0"
      >
        Reativar Assinatura
      </Button>
    </div>
  );
};
