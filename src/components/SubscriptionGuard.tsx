// ABOUTME: Guardião de assinatura: garante cartão/assinatura antes de acessar rotas protegidas.
// ABOUTME: Redireciona para /subscription quando o usuário não estiver com assinatura válida (trial com cartão ou ativa).
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

export const SubscriptionGuard: React.FC<SubscriptionGuardProps> = ({ children }) => {
  const { subscription, isLoading } = useSubscription();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-summi-green"></div>
      </div>
    );
  }

  if (!subscription.subscribed) {
    return <Navigate to="/subscription" replace />;
  }

  return <>{children}</>;
};
