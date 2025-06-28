
// ABOUTME: Página principal de conexão WhatsApp usando nova arquitetura de componentes
// ABOUTME: Interface limpa e focada com máquina de estados
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { WhatsAppManager } from '@/components/WhatsApp/WhatsAppManager';

const WhatsAppConnectionV2Page = () => {
  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            WhatsApp Business
          </h1>
          <p className="text-muted-foreground">
            Conecte seu WhatsApp para receber e gerenciar mensagens
          </p>
        </div>

        {/* Main Connection Manager */}
        <WhatsAppManager />

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

export default WhatsAppConnectionV2Page;
