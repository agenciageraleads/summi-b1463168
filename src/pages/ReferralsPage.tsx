import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Copy, Gift, Users, Calendar, Share2, MessageCircle, Share } from 'lucide-react';
import { useReferrals } from '@/hooks/useReferrals';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SEO } from '@/components/SEO';
import { useTranslation } from 'react-i18next';

const ReferralsPage = () => {
  const { t } = useTranslation();
  const { referralData, isLoading, copyReferralLink } = useReferrals();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!referralData) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">{t('error_loading_referrals', { defaultValue: 'Erro ao carregar dados de indicação' })}</p>
        </div>
      </DashboardLayout>
    );
  }

  // Criar link mais curto e amigável
  const shortReferralCode = referralData.referralCode;
  const shortReferralLink = `${window.location.origin}/r/${shortReferralCode}`;

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(`👋 Olá! Estou testando a Summi, uma assistente de IA incrível para o WhatsApp que transcreve áudios e resume conversas automaticamente.\n\nUse meu código *${shortReferralCode}* e ganhe 3 dias extras de teste grátis!\n\nBaixe aqui: ${shortReferralLink}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Summi - Assistente com IA para WhatsApp',
          text: `Ganhe 3 dias extras grátis na Summi! Use meu código: ${shortReferralCode}`,
          url: shortReferralLink,
        });
      } catch (err) {
        console.error('Erro ao compartilhar:', err);
      }
    } else {
      copyReferralLink();
    }
  };

  return (
    <DashboardLayout>
      <SEO
        title={t('referrals')}
        description={t('referrals_desc')}
        author="Summi"
        noIndex
      />
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('referrals')}</h1>
          <h2 className="text-muted-foreground font-normal text-lg">
            {t('referrals_subtitle')}
          </h2>
        </div>

        {/* Oferta Principal */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="text-4xl">🎉</div>
              <h2 className="text-2xl font-bold text-blue-900">
                {t('invite_friends_earn_together')}
              </h2>
              <p className="text-blue-700 text-lg">
                {t('referral_bonus_desc', { bonusDays: referralData.bonusPerReferralDays })}
              </p>
              <div className="flex items-center justify-center gap-6 text-sm text-blue-600">
                <div className="flex items-center gap-2 bg-white/50 px-3 py-2 rounded-lg">
                  <Calendar className="h-4 w-4" />
                  <span>{t('friend_bonus_label')}</span>
                </div>
                <div className="flex items-center gap-2 bg-white/50 px-3 py-2 rounded-lg">
                  <Gift className="h-4 w-4" />
                  <span>{t('your_bonus_label', { bonusDays: referralData.bonusPerReferralDays })}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Link de Indicação Melhorado */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              {t('your_referral_link_title')}
            </h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg border-2 border-dashed border-gray-300">
              <div className="text-center space-y-3">
                <div className="text-2xl font-mono font-bold text-primary bg-white px-4 py-2 rounded-lg inline-block border">
                  {shortReferralCode}
                </div>
                <p className="text-sm text-gray-600">{t('your_referral_code_hint')}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <div className="flex-1 p-3 bg-gray-50 border rounded-md text-sm font-mono break-all flex items-center">
                {shortReferralLink}
              </div>
              <Button
                onClick={copyReferralLink}
                variant="outline"
                className="flex-shrink-0 h-auto active:scale-[0.97] transition-transform"
              >
                <Copy className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">{t('copy')}</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <Button
                onClick={handleShareWhatsApp}
                className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white active:scale-[0.97] transition-transform h-12"
              >
                <MessageCircle className="h-5 w-5 mr-2" />
                {t('send_whatsapp')}
              </Button>

              <Button
                onClick={handleNativeShare}
                variant="outline"
                className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 active:scale-[0.97] transition-transform h-12"
              >
                <Share className="h-5 w-5 mr-2" />
                {t('more_options')}
              </Button>
            </div>

            <p className="text-xs text-gray-500 text-center">
              {t('share_referral_desc')}
            </p>
          </CardContent>
        </Card>

        {/* Estatísticas */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Users className="h-4 w-4" />
                {t('total_referrals_label')}
              </h2>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">
                  {referralData.totalReferrals}
                </div>
                <div className="text-sm text-gray-600">
                  {referralData.totalReferrals === 1 ? t('person_referred') : t('people_referred')}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Gift className="h-4 w-4" />
                {t('bonus_days_earned_label')}
              </h2>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-4xl font-bold text-green-600 mb-2">
                  +{referralData.totalReferrals * referralData.bonusPerReferralDays}
                </div>
                <div className="text-sm text-gray-600">
                  {t('free_trial_days_label')}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Indicações */}
        {referralData.referralsList.length > 0 && (
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">{t('latest_referrals', { defaultValue: 'Últimas Indicações' })}</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {referralData.referralsList.slice(0, 5).map((referral) => (
                  <div key={referral.id} className="flex items-center justify-between p-3 bg-gray-50 border rounded-lg">
                    <div>
                      <p className="font-medium">{referral.nome}</p>
                      <p className="text-sm text-gray-500">{referral.email}</p>
                    </div>
                    <Badge variant="secondary">
                      {format(new Date(referral.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </Badge>
                  </div>
                ))}
              </div>
              {referralData.referralsList.length > 5 && (
                <p className="text-sm text-gray-500 text-center mt-3 pt-3 border-t">
                  {t('and_more_referrals', { defaultValue: `E mais ${referralData.referralsList.length - 5} indicações...` })}
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ReferralsPage;
