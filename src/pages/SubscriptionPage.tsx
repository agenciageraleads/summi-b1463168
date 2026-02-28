
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { useSubscription } from '@/hooks/useSubscription';
import { Check, Crown, Calendar, CreditCard, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getPlanActivePriceLabel, getPlanLabel, normalizePlanType } from '@/lib/subscriptionPlans';

const SubscriptionPage = () => {
  const { subscription, isLoading, createCheckout, manageSubscription } = useSubscription();
  const { toast } = useToast();
  const currentPlanType = normalizePlanType(subscription.plan_type, subscription.stripe_price_id);
  const currentPlanLabel = getPlanLabel(currentPlanType);
  const currentPlanPriceLabel = getPlanActivePriceLabel(currentPlanType);

  const handleSubscribe = async (planType: 'monthly' | 'annual') => {
    try {
      await createCheckout(planType);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível iniciar o processo de assinatura',
        variant: 'destructive'
      });
    }
  };

  const handleManageSubscription = async () => {
    try {
      await manageSubscription();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível abrir o portal de gerenciamento',
        variant: 'destructive'
      });
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-summi-green"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-summi-gray-900">Assinatura</h1>
          <p className="text-summi-gray-600 mt-2">
            Gerencie sua assinatura e acesse todas as funcionalidades da Summi
          </p>
        </div>

        {/* Funcionalidades da Summi */}
        <Card className="bg-gradient-to-r from-summi-green/10 to-blue-50 border-summi-green/20">
          <CardHeader>
            <CardTitle className="text-xl text-summi-gray-900 flex items-center space-x-2">
              <Crown className="w-5 h-5 text-summi-green" />
              <span>O que você pode fazer com a Summi</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <Check className="w-4 h-4 text-summi-green mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-summi-gray-900 text-sm">Transcrição de áudios</p>
                    <p className="text-xs text-summi-gray-600">Transforme áudios em texto automaticamente</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Check className="w-4 h-4 text-summi-green mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-summi-gray-900 text-sm">Resumo de conversas</p>
                    <p className="text-xs text-summi-gray-600">Análise inteligente das mensagens importantes</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Check className="w-4 h-4 text-summi-green mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-summi-gray-900 text-sm">Alertas prioritários</p>
                    <p className="text-xs text-summi-gray-600">Notificações para palavras-chave importantes</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <Check className="w-4 h-4 text-summi-green mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-summi-gray-900 text-sm">Resumo em áudio</p>
                    <p className="text-xs text-summi-gray-600">Ouça o resumo das conversas importantes</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Check className="w-4 h-4 text-summi-green mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-summi-gray-900 text-sm">Privacidade garantida</p>
                    <p className="text-xs text-summi-gray-600">Dados criptografados e seguros</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Check className="w-4 h-4 text-summi-green mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-summi-gray-900 text-sm">Cancele quando quiser</p>
                    <p className="text-xs text-summi-gray-600">Sem compromisso ou taxas de cancelamento</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Aviso de cancelamento pendente */}
        {subscription.subscribed && subscription.cancel_at_period_end && (
          <Card className="border-yellow-400 bg-yellow-50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-yellow-700">
                <AlertTriangle className="w-5 h-5" />
                <span>Assinatura será cancelada</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-yellow-800">
                Sua assinatura foi cancelada e será encerrada em{' '}
                <strong>
                  {subscription.subscription_end
                    ? new Date(subscription.subscription_end).toLocaleDateString('pt-BR')
                    : '—'}
                </strong>
                . Até lá, você continua com acesso completo.
              </p>
              <Button
                onClick={handleManageSubscription}
                className="w-full bg-summi-green hover:bg-summi-green/90 text-white"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Reativar Assinatura
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Status da Assinatura Atual - só mostra se ativa e NÃO cancelada */}
        {subscription.subscribed && !subscription.cancel_at_period_end && (
          <Card className="border-summi-green bg-summi-green/5">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-summi-green">
                <Crown className="w-5 h-5" />
                <span>Assinatura Ativa</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-summi-gray-900">
                    {currentPlanLabel ? `Plano ${currentPlanLabel}` : 'Assinatura ativa'}
                  </p>
                  {currentPlanPriceLabel && <p className="text-sm text-summi-gray-600">{currentPlanPriceLabel}</p>}
                </div>
                <Badge className="bg-summi-green text-white">Ativo</Badge>
              </div>

              {subscription.subscription_end && (
                <div className="flex items-center space-x-2 text-sm text-summi-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>
                    Próxima cobrança: {new Date(subscription.subscription_end).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              )}

              <Button
                onClick={handleManageSubscription}
                variant="outline"
                className="w-full border-summi-green text-summi-green hover:bg-summi-green hover:text-white"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Gerenciar Assinatura
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Planos Disponíveis */}
        <div>
          <h2 className="text-2xl font-semibold text-summi-gray-900 mb-6">
            {subscription.subscribed ? 'Alterar Plano' : 'Escolher Plano'}
          </h2>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
            <Card className={`border-2 transition-all duration-300 hover:shadow-lg ${currentPlanType === 'monthly' ? 'border-summi-green bg-summi-green/5' : 'border-summi-gray-200'
              }`}>
              <CardHeader className="text-center">
                <CardTitle className="text-xl text-summi-gray-900">Plano Mensal</CardTitle>
                <div className="mt-4">
                  <span className="text-3xl font-bold text-summi-gray-900">R$ 47,90</span>
                  <span className="text-summi-gray-500 ml-2">por mês</span>
                </div>
                <CardDescription className="mt-2">
                  Flexibilidade com pagamento mensal + 7 dias grátis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-summi-green" />
                    <span className="text-sm text-summi-gray-600">Todas as funcionalidades</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-summi-green" />
                    <span className="text-sm text-summi-gray-600">Suporte prioritário</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-summi-green" />
                    <span className="text-sm text-summi-gray-600">Cancelar quando quiser</span>
                  </li>
                </ul>

                {currentPlanType !== 'monthly' && (
                  <Button
                    onClick={() => handleSubscribe('monthly')}
                    className="w-full bg-summi-gradient hover:opacity-90 text-white"
                    disabled={subscription.subscribed && currentPlanType === 'monthly'}
                  >
                    {subscription.subscribed ? 'Alterar para Mensal' : 'Assinar Mensal'}
                  </Button>
                )}

                {currentPlanType === 'monthly' && (
                  <div className="text-center py-2">
                    <Badge className="bg-summi-green text-white">Plano Atual</Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className={`border-2 transition-all duration-300 hover:shadow-lg relative ${currentPlanType === 'annual' ? 'border-summi-green bg-summi-green/5' : 'border-summi-gray-200'
              }`}>
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-summi-green text-white">Melhor Oferta</Badge>
              </div>
              <CardHeader className="text-center">
                <CardTitle className="text-xl text-summi-gray-900">Plano Anual</CardTitle>
                <div className="mt-4">
                  <span className="text-3xl font-bold text-summi-gray-900">R$ 29,90</span>
                  <span className="text-summi-gray-500 ml-2">por mês</span>
                </div>
                <div className="text-sm text-summi-green font-medium">
                  37% de desconto • R$ 358,80/ano
                </div>
                <CardDescription className="mt-2">
                  Melhor custo-benefício + 30 dias grátis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-summi-green" />
                    <span className="text-sm text-summi-gray-600">Todas as funcionalidades</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-summi-green" />
                    <span className="text-sm text-summi-gray-600">Suporte prioritário</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-summi-green" />
                    <span className="text-sm text-summi-gray-600">Economia de R$ 216/ano</span>
                  </li>
                </ul>

                {currentPlanType !== 'annual' && (
                  <Button
                    onClick={() => handleSubscribe('annual')}
                    className="w-full bg-summi-green hover:bg-summi-green/90 text-white"
                    disabled={subscription.subscribed && currentPlanType === 'annual'}
                  >
                    {subscription.subscribed ? 'Alterar para Anual' : 'Assinar Anual'}
                  </Button>
                )}

                {currentPlanType === 'annual' && (
                  <div className="text-center py-2">
                    <Badge className="bg-summi-green text-white">Plano Atual</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {!subscription.subscribed && (
          <Card className="bg-summi-gray-50 border-summi-gray-200">
            <CardContent className="pt-6">
              <div className="text-center">
                <h3 className="font-semibold text-summi-gray-900 mb-2">
                  🎉 Complete seu cadastro
                </h3>
                <p className="text-sm text-summi-gray-600">
                  Adicione seu cartão e ganhe <strong>7 dias grátis</strong> no plano mensal ou <strong>30 dias grátis</strong> no plano anual.
                  <br />
                  <strong>Cancele quando quiser, sem taxas ou compromisso.</strong>
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SubscriptionPage;
