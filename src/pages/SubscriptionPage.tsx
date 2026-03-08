import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { useSubscription } from '@/hooks/useSubscription';
import { Check, Crown, Calendar, CreditCard, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getPlanActivePriceLabel, getPlanLabel, normalizePlanType } from '@/lib/subscriptionPlans';
import { SEO } from '@/components/SEO';
import { useTranslation } from 'react-i18next';

const SubscriptionPage = () => {
  const { t } = useTranslation();
  const { subscription, isLoading, createCheckout, manageSubscription } = useSubscription();
  const { toast } = useToast();
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('caro_para_momento');
  const [cancelReasonDetails, setCancelReasonDetails] = useState('');
  const [isCancelLoading, setIsCancelLoading] = useState(false);
  const currentPlanType = normalizePlanType(subscription.plan_type, subscription.stripe_price_id);
  const currentPlanLabel = getPlanLabel(currentPlanType);
  const currentPlanPriceLabel = getPlanActivePriceLabel(currentPlanType);

  const handleSubscribe = async (planType: 'monthly' | 'annual') => {
    try {
      await createCheckout(planType);
    } catch (error) {
      toast({
        title: t('error'),
        description: t('checkout_error', { defaultValue: 'Não foi possível iniciar o processo de assinatura' }),
        variant: 'destructive'
      });
    }
  };

  const handleManageSubscription = async () => {
    try {
      await manageSubscription();
    } catch (error) {
      toast({
        title: t('error'),
        description: t('portal_error', { defaultValue: 'Não foi possível abrir o portal de gerenciamento' }),
        variant: 'destructive'
      });
    }
  };

  const handleCancelSubscription = async () => {
    try {
      setIsCancelLoading(true);
      await manageSubscription({
        intent: 'cancel',
        cancelReason,
        cancelReasonDetails,
      });
      setIsCancelDialogOpen(false);
      setCancelReasonDetails('');
      toast({
        title: t('portal_opened', { defaultValue: 'Portal aberto' }),
        description: t('cancel_portal_desc', { defaultValue: 'Seu motivo foi registrado. Se quiser, conclua o cancelamento no Stripe.' }),
      });
    } catch (error) {
      toast({
        title: t('error'),
        description: t('cancel_error', { defaultValue: 'Não foi possível abrir o portal de cancelamento' }),
        variant: 'destructive'
      });
    } finally {
      setIsCancelLoading(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <SEO title="Carregando..." description="Aguarde..." noIndex />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-summi-green"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <SEO
        title={t('subscription')}
        description={t('manage_subscription_subtitle')}
        noIndex
      />
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-summi-gray-900">{t('subscription')}</h1>
          <p className="text-summi-gray-600 mt-2">
            {t('manage_subscription_subtitle')}
          </p>
        </div>

        {/* Funcionalidades da Summi */}
        <Card className="bg-gradient-to-r from-summi-green/10 to-blue-50 border-summi-green/20">
          <CardHeader>
            <h2 className="text-xl font-semibold text-summi-gray-900 flex items-center space-x-2">
              <Crown className="w-5 h-5 text-summi-green" />
              <span>{t('what_you_can_do')}</span>
            </h2>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <Check className="w-4 h-4 text-summi-green mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-summi-gray-900 text-sm">{t('audio_transcription')}</h3>
                    <p className="text-xs text-summi-gray-600">{t('audio_transcription_desc')}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Check className="w-4 h-4 text-summi-green mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-summi-gray-900 text-sm">{t('chat_summary')}</h3>
                    <p className="text-xs text-summi-gray-600">{t('chat_summary_desc')}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Check className="w-4 h-4 text-summi-green mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-summi-gray-900 text-sm">{t('priority_alerts')}</h3>
                    <p className="text-xs text-summi-gray-600">{t('priority_alerts_desc')}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <Check className="w-4 h-4 text-summi-green mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-summi-gray-900 text-sm">{t('long_audio_summary')}</h3>
                    <p className="text-xs text-summi-gray-600">{t('long_audio_summary_desc')}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Check className="w-4 h-4 text-summi-green mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-summi-gray-900 text-sm">{t('guaranteed_privacy')}</h3>
                    <p className="text-xs text-summi-gray-600">{t('guaranteed_privacy_desc')}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Check className="w-4 h-4 text-summi-green mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-summi-gray-900 text-sm">{t('cancel_anytime')}</h3>
                    <p className="text-xs text-summi-gray-600">{t('cancel_anytime_desc')}</p>
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
              <h2 className="text-lg font-semibold flex items-center space-x-2 text-yellow-700">
                <AlertTriangle className="w-5 h-5" />
                <span>Assinatura será cancelada</span>
              </h2>
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
                role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.click(); }} onClick={handleManageSubscription}
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
              <h2 className="text-lg font-semibold flex items-center space-x-2 text-summi-green">
                <Crown className="w-5 h-5" />
                <span>Assinatura Ativa</span>
              </h2>
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
                role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.click(); }} onClick={handleManageSubscription}
                variant="outline"
                className="w-full border-summi-green text-summi-green hover:bg-summi-green hover:text-white"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Gerenciar Assinatura
              </Button>
              <Button
                role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.click(); }} onClick={() => setIsCancelDialogOpen(true)}
                variant="ghost"
                className="w-full text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                Cancelar Assinatura
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

                {String(currentPlanType) !== 'monthly' && (
                  <Button
                    role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.click(); }} onClick={() => handleSubscribe('monthly')}
                    className="w-full bg-summi-gradient hover:opacity-90 text-white"
                    disabled={subscription.subscribed && String(currentPlanType) === 'monthly'}
                  >
                    {subscription.subscribed ? 'Alterar para Mensal' : 'Assinar Mensal'}
                  </Button>
                )}

                {String(currentPlanType) === 'monthly' && (
                  <div className="text-center py-2">
                    <Badge className="bg-summi-green text-white">Plano Atual</Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className={`border-2 transition-all duration-300 hover:shadow-lg relative ${String(currentPlanType) === 'annual' ? 'border-summi-green bg-summi-green/5' : 'border-summi-gray-200'
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
                  Melhor custo-benefício + 7 dias grátis
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

                {String(currentPlanType) !== 'annual' && (
                  <Button
                    role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.click(); }} onClick={() => handleSubscribe('annual')}
                    className="w-full bg-summi-green hover:bg-summi-green/90 text-white"
                    disabled={subscription.subscribed && String(currentPlanType) === 'annual'}
                  >
                    {subscription.subscribed ? 'Alterar para Anual' : 'Assinar Anual'}
                  </Button>
                )}

                {String(currentPlanType) === 'annual' && (
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
                <h2 className="text-base font-semibold text-summi-gray-900 mb-2">
                  🎉 Complete seu cadastro
                </h2>
                <p className="text-sm text-summi-gray-600">
                  Adicione seu cartão e ganhe <strong>7 dias grátis</strong> no plano mensal ou <strong>7 dias grátis</strong> no plano anual.
                  <br />
                  <strong>Cancele quando quiser, sem taxas ou compromisso.</strong>
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Antes de cancelar</DialogTitle>
              <DialogDescription>
                Registre o principal motivo. Isso ajuda a melhorar o produto e medir churn com mais precisão.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-summi-gray-900">Motivo principal</h3>
                <Select value={cancelReason} onValueChange={setCancelReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="caro_para_momento">Ficou caro para este momento</SelectItem>
                    <SelectItem value="nao_uso_frequente">Não estou usando com frequência</SelectItem>
                    <SelectItem value="faltou_recurso">Faltou algum recurso importante</SelectItem>
                    <SelectItem value="problema_tecnico">Tive problema técnico</SelectItem>
                    <SelectItem value="outro">Outro motivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium text-summi-gray-900">Detalhes opcionais</h3>
                <Textarea
                  value={cancelReasonDetails}
                  onChange={(e) => setCancelReasonDetails(e.target.value)}
                  placeholder="Se quiser, explique melhor o contexto."
                  rows={4}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.click(); }} onClick={() => setIsCancelDialogOpen(false)}
                disabled={isCancelLoading}
              >
                {t('back')}
              </Button>
              <Button
                role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.click(); }} onClick={handleCancelSubscription}
                disabled={isCancelLoading}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                {isCancelLoading ? 'Abrindo portal...' : 'Continuar para cancelamento'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default SubscriptionPage;
