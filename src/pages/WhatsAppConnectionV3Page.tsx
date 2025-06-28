
// ABOUTME: Página principal de conexão WhatsApp usando nova arquitetura V2
// ABOUTME: Interface limpa e focada com sistema robusto de Edge Functions
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { WhatsAppManagerV2 } from '@/components/WhatsApp/WhatsAppManagerV2';

const WhatsAppConnectionV3Page = () => {
  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            WhatsApp Business
          </h1>
          <p className="text-muted-foreground">
            Conecte seu WhatsApp de forma rápida e segura
          </p>
        </div>

        {/* Main Connection Manager V2 */}
        <WhatsAppManagerV2 />

        {/* Features destacadas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl mb-2">⚡</div>
            <h3 className="font-semibold text-sm">Conexão Rápida</h3>
            <p className="text-xs text-gray-600">Código de pareamento instantâneo</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl mb-2">🔒</div>
            <h3 className="font-semibold text-sm">Seguro</h3>
            <p className="text-xs text-gray-600">Conexão criptografada</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl mb-2">🤖</div>
            <h3 className="font-semibold text-sm">Automação</h3>
            <p className="text-xs text-gray-600">Respostas inteligentes</p>
          </div>
        </div>

        {/* Help Section */}
        <div className="text-center pt-6 border-t">
          <p className="text-sm text-muted-foreground">
            Precisa de ajuda? Entre em contato com nosso suporte
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default WhatsAppConnectionV3Page;
