
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Nova página de Política de Privacidade
const PrivacyPolicyPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-summi-green/5 to-summi-secondary/5">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <Link to="/">
            <Button variant="ghost" className="text-summi-green hover:text-summi-secondary">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-summi-gray-900 mb-2">
            Política de Privacidade
          </h1>
          <p className="text-summi-gray-600">
            Como protegemos e utilizamos suas informações
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-summi-green">
              Política de Privacidade da Summi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-sm">
            <section>
              <h3 className="font-semibold text-summi-gray-900 mb-2">1. Informações que coletamos</h3>
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-summi-gray-800">1.1 Informações fornecidas diretamente</h4>
                  <ul className="list-disc ml-6 mt-2 space-y-1 text-summi-gray-700">
                    <li>Dados de cadastro: nome, e-mail, telefone</li>
                    <li>Informações de configuração da conta</li>
                    <li>Conteúdo de suporte e feedback</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-summi-gray-800">1.2 Informações coletadas automaticamente</h4>
                  <ul className="list-disc ml-6 mt-2 space-y-1 text-summi-gray-700">
                    <li>Mensagens do WhatsApp (texto e áudio)</li>
                    <li>Logs de uso da plataforma</li>
                    <li>Dados de navegação e dispositivo</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h3 className="font-semibold text-summi-gray-900 mb-2">2. Como usamos suas informações</h3>
              <ul className="list-disc ml-6 space-y-1 text-summi-gray-700">
                <li>Fornecer e melhorar nossos serviços</li>
                <li>Processar e analisar mensagens com IA</li>
                <li>Enviar respostas automáticas conforme configurado</li>
                <li>Comunicar sobre atualizações e mudanças</li>
                <li>Garantir segurança e prevenir fraudes</li>
                <li>Cumprir obrigações legais</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-summi-gray-900 mb-2">3. Compartilhamento de informações</h3>
              <p className="text-summi-gray-700 mb-3">Podemos compartilhar suas informações com:</p>
              <ul className="list-disc ml-6 space-y-1 text-summi-gray-700">
                <li><strong>Prestadores de serviço:</strong> para processamento de pagamentos, análise de dados e infraestrutura</li>
                <li><strong>Parceiros de IA:</strong> para processamento de mensagens (dados anonimizados quando possível)</li>
                <li><strong>Autoridades:</strong> quando exigido por lei ou processo legal</li>
              </ul>
              <p className="text-summi-gray-700 mt-3">
                <strong>Nunca vendemos</strong> suas informações pessoais para terceiros.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-summi-gray-900 mb-2">4. Segurança dos dados</h3>
              <p className="text-summi-gray-700 mb-3">Implementamos várias medidas de segurança:</p>
              <ul className="list-disc ml-6 space-y-1 text-summi-gray-700">
                <li>Criptografia em trânsito e em repouso</li>
                <li>Controles de acesso rigorosos</li>
                <li>Monitoramento contínuo de segurança</li>
                <li>Auditorias regulares de segurança</li>
                <li>Armazenamento temporário de dados sensíveis</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-summi-gray-900 mb-2">5. Retenção de dados</h3>
              <p className="text-summi-gray-700">
                Mantemos suas informações apenas pelo tempo necessário para fornecer nossos serviços 
                e cumprir obrigações legais. Mensagens são processadas e podem ser armazenadas 
                temporariamente para funcionamento do sistema.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-summi-gray-900 mb-2">6. Seus direitos e controles</h3>
              <p className="text-summi-gray-700 mb-3">Você pode:</p>
              <ul className="list-disc ml-6 space-y-1 text-summi-gray-700">
                <li>Acessar e baixar suas informações</li>
                <li>Corrigir informações imprecisas</li>
                <li>Solicitar exclusão de dados</li>
                <li>Controlar configurações de privacidade</li>
                <li>Desativar sua conta a qualquer momento</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-summi-gray-900 mb-2">7. Cookies e tecnologias similares</h3>
              <p className="text-summi-gray-700">
                Utilizamos cookies essenciais para funcionamento da plataforma e cookies de 
                análise para melhorar a experiência do usuário. Você pode controlar cookies 
                através das configurações do seu navegador.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-summi-gray-900 mb-2">8. Alterações nesta política</h3>
              <p className="text-summi-gray-700">
                Podemos atualizar esta política periodicamente. Notificaremos sobre mudanças 
                significativas através da plataforma ou por e-mail.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-summi-gray-900 mb-2">9. Contato</h3>
              <p className="text-summi-gray-700">
                Para questões sobre privacidade ou exercício de direitos, entre em contato 
                através dos canais de suporte da plataforma.
              </p>
            </section>

            <div className="bg-summi-green/10 p-4 rounded-lg border border-summi-green/20 mt-6">
              <h4 className="font-semibold text-summi-green mb-2">Transparência:</h4>
              <p className="text-summi-gray-700">
                Estamos comprometidos com a transparência sobre como coletamos, usamos e 
                protegemos suas informações. Esta política reflete nosso compromisso com sua privacidade.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
