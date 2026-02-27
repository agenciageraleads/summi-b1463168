
import React from 'react';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { BetaFeatureWrapper } from '@/components/BetaFeatureWrapper';
import { GroupsMonitoring } from '@/components/Admin/GroupsMonitoring';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TestTube, Zap, Users } from 'lucide-react';

// Página dedicada para funcionalidades Beta
const BetaPage: React.FC = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Cabeçalho da página Beta */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <TestTube className="h-8 w-8 text-emerald-600" />
              Funcionalidades Beta
            </h1>
            <p className="text-gray-600">
              Acesso exclusivo às funcionalidades mais recentes da plataforma Summi
            </p>
          </div>
        </div>

        {/* Cards informativos sobre o programa Beta */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                Novidades
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Teste as funcionalidades mais recentes antes do lançamento oficial
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                Comunidade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Faça parte de um grupo seleto de usuários testadores
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <TestTube className="h-5 w-5 text-emerald-500" />
                Feedback
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Seu feedback ajuda a moldar o futuro da plataforma
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Monitoramento de Grupos - Funcionalidade Beta */}
        <BetaFeatureWrapper
          featureName="groups-monitoring"
          title="Monitoramento de Grupos WhatsApp"
          description="Monitore e gerencie grupos do WhatsApp diretamente pela plataforma Summi."
          showBadge={false}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Monitoramento de Grupos WhatsApp
                <span className="ml-auto text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full">
                  BETA
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <GroupsMonitoring />
            </CardContent>
          </Card>
        </BetaFeatureWrapper>
      </div>
    </DashboardLayout>
  );
};

export default BetaPage;
