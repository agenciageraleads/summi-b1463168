
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Copy, Gift, Users, Calendar, Share2 } from 'lucide-react';
import { useReferrals } from '@/hooks/useReferrals';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ReferralsPage = () => {
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
          <p className="text-muted-foreground">Erro ao carregar dados de indicação</p>
        </div>
      </DashboardLayout>
    );
  }

  // Criar link mais curto e amigável
  const shortReferralCode = referralData.referralCode;
  const shortReferralLink = `${window.location.origin}/r/${shortReferralCode}`;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Indique e Ganhe</h1>
          <p className="text-muted-foreground">
            Convide amigos e ganhem dias extras de teste gratuito juntos!
          </p>
        </div>

        {/* Oferta Principal */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="text-4xl">🎉</div>
              <h2 className="text-2xl font-bold text-blue-900">
                Convide amigos e ganhem juntos!
              </h2>
              <p className="text-blue-700 text-lg">
                Seu amigo ganha <strong>+3 dias extras</strong> de teste gratuito e você também!
              </p>
              <div className="flex items-center justify-center gap-6 text-sm text-blue-600">
                <div className="flex items-center gap-2 bg-white/50 px-3 py-2 rounded-lg">
                  <Calendar className="h-4 w-4" />
                  <span>Amigo: 10 dias de teste</span>
                </div>
                <div className="flex items-center gap-2 bg-white/50 px-3 py-2 rounded-lg">
                  <Gift className="h-4 w-4" />
                  <span>Você: +3 dias extras</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Link de Indicação Melhorado */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Seu Link de Indicação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg border-2 border-dashed border-gray-300">
              <div className="text-center space-y-3">
                <div className="text-2xl font-mono font-bold text-primary bg-white px-4 py-2 rounded-lg inline-block border">
                  {shortReferralCode}
                </div>
                <p className="text-sm text-gray-600">Seu código de indicação</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <div className="flex-1 p-3 bg-gray-50 border rounded-md text-sm font-mono break-all">
                {shortReferralLink}
              </div>
              <Button 
                onClick={copyReferralLink}
                variant="outline" 
                size="sm"
                className="flex-shrink-0"
              >
                <Copy className="h-4 w-4 mr-1" />
                Copiar
              </Button>
            </div>
            <p className="text-xs text-gray-500 text-center">
              Compartilhe este link com seus amigos para que eles ganhem dias extras de teste
            </p>
          </CardContent>
        </Card>

        {/* Estatísticas */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total de Indicações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">
                  {referralData.totalReferrals}
                </div>
                <div className="text-sm text-gray-600">
                  {referralData.totalReferrals === 1 ? 'pessoa indicada' : 'pessoas indicadas'}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-4 w-4" />
                Dias Extras Ganhos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-4xl font-bold text-green-600 mb-2">
                  +{referralData.totalReferrals * 3}
                </div>
                <div className="text-sm text-gray-600">
                  dias de teste gratuito
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Indicações */}
        {referralData.referralsList.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Últimas Indicações</CardTitle>
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
                  E mais {referralData.referralsList.length - 5} indicações...
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
