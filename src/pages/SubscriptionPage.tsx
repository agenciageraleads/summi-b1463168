
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { useSubscription } from '@/hooks/useSubscription';
import { Check, Crown, Calendar, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const SubscriptionPage = () => {
  const { subscription, isLoading, createCheckout, manageSubscription } = useSubscription();
  const { toast } = useToast();

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

        {/* Status da Assinatura Atual */}
        {subscription.subscribed && (
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
                    Plano {subscription.plan_type === 'monthly' ? 'Mensal' : 'Anual'}
                  </p>
                  <p className="text-sm text-summi-gray-600">
                    {subscription.plan_type === 'monthly' ? 'R$ 29,90/mês' : 'R$ 19,90/mês (cobrado anualmente)'}
                  </p>
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
            <Card className={`border-2 transition-all duration-300 hover:shadow-lg ${
              subscription.plan_type === 'monthly' ? 'border-summi-green bg-summi-green/5' : 'border-summi-gray-200'
            }`}>
              <CardHeader className="text-center">
                <CardTitle className="text-xl text-summi-gray-900">Plano Mensal</CardTitle>
                <div className="mt-4">
                  <span className="text-3xl font-bold text-summi-gray-900">R$ 29,90</span>
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
                
                {subscription.plan_type !== 'monthly' && (
                  <Button 
                    onClick={() => handleSubscribe('monthly')}
                    className="w-full bg-summi-gradient hover:opacity-90 text-white"
                    disabled={subscription.subscribed && subscription.plan_type === 'monthly'}
                  >
                    {subscription.subscribed ? 'Alterar para Mensal' : 'Assinar Mensal'}
                  </Button>
                )}
                
                {subscription.plan_type === 'monthly' && (
                  <div className="text-center py-2">
                    <Badge className="bg-summi-green text-white">Plano Atual</Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className={`border-2 transition-all duration-300 hover:shadow-lg relative ${
              subscription.plan_type === 'annual' ? 'border-summi-green bg-summi-green/5' : 'border-summi-gray-200'
            }`}>
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-summi-green text-white">Melhor Oferta</Badge>
              </div>
              <CardHeader className="text-center">
                <CardTitle className="text-xl text-summi-gray-900">Plano Anual</CardTitle>
                <div className="mt-4">
                  <span className="text-3xl font-bold text-summi-gray-900">R$ 19,90</span>
                  <span className="text-summi-gray-500 ml-2">por mês</span>
                </div>
                <div className="text-sm text-summi-green font-medium">
                  33% de desconto • R$ 238,80/ano
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
                    <span className="text-sm text-summi-gray-600">Economia de R$ 120/ano</span>
                  </li>
                </ul>
                
                {subscription.plan_type !== 'annual' && (
                  <Button 
                    onClick={() => handleSubscribe('annual')}
                    className="w-full bg-summi-green hover:bg-summi-green/90 text-white"
                    disabled={subscription.subscribed && subscription.plan_type === 'annual'}
                  >
                    {subscription.subscribed ? 'Alterar para Anual' : 'Assinar Anual'}
                  </Button>
                )}
                
                {subscription.plan_type === 'annual' && (
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
                  Cancele quando quiser, sem taxas.
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
