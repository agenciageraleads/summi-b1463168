
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Copy, Gift, Users, Calendar } from 'lucide-react';
import { useReferrals } from '@/hooks/useReferrals';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ReferralSection: React.FC = () => {
  const { referralData, isLoading, copyReferralLink } = useReferrals();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Indique e Ganhe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">Carregando...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!referralData) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5" />
          Indique e Ganhe
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Oferta Principal */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              🎉 Convide amigos e ganhem juntos!
            </h3>
            <p className="text-blue-700 mb-4">
              Seu amigo ganha <strong>+3 dias extras</strong> de teste gratuito e você também!
            </p>
            <div className="flex items-center justify-center gap-4 text-sm text-blue-600">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>Amigo: 10 dias de teste</span>
              </div>
              <div className="flex items-center gap-1">
                <Gift className="h-4 w-4" />
                <span>Você: +3 dias extras</span>
              </div>
            </div>
          </div>
        </div>

        {/* Link de Indicação */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Seu Link de Indicação</h4>
          <div className="flex gap-2">
            <div className="flex-1 p-3 bg-gray-50 border rounded-md text-sm font-mono break-all">
              {referralData.referralLink}
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
          <p className="text-xs text-gray-500">
            Compartilhe este link com seus amigos para que eles ganhem dias extras de teste
          </p>
        </div>

        <Separator />

        {/* Estatísticas */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900 flex items-center gap-2">
            <Users className="h-4 w-4" />
            Suas Indicações
          </h4>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {referralData.totalReferrals}
              </div>
              <div className="text-sm text-gray-600">
                {referralData.totalReferrals === 1 ? 'pessoa indicada' : 'pessoas indicadas'}
              </div>
            </div>
          </div>

          {/* Lista de Indicações */}
          {referralData.referralsList.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Últimas indicações:</p>
              <div className="space-y-2">
                {referralData.referralsList.slice(0, 5).map((referral) => (
                  <div key={referral.id} className="flex items-center justify-between p-2 bg-white border rounded-md">
                    <div>
                      <p className="text-sm font-medium">{referral.nome}</p>
                      <p className="text-xs text-gray-500">{referral.email}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {format(new Date(referral.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </Badge>
                  </div>
                ))}
              </div>
              {referralData.referralsList.length > 5 && (
                <p className="text-xs text-gray-500 text-center">
                  E mais {referralData.referralsList.length - 5} indicações...
                </p>
              )}
            </div>
          )}
        </div>

        {/* Código de Indicação */}
        <div className="text-center pt-4 border-t">
          <p className="text-xs text-gray-500">
            Seu código de indicação: <strong className="font-mono">{referralData.referralCode}</strong>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReferralSection;
