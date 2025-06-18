
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Nova página dedicada à LGPD
const LGPDPage = () => {
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
            Lei Geral de Proteção de Dados (LGPD)
          </h1>
          <p className="text-summi-gray-600">
            Como a Summi trata seus dados pessoais
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-summi-green">
              Tratamento de Dados Pessoais - LGPD
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-sm">
            <section>
              <h3 className="font-semibold text-summi-gray-900 mb-2">1. Quais dados coletamos</h3>
              <p className="text-summi-gray-700 mb-3">A Summi coleta e processa os seguintes tipos de dados:</p>
              <ul className="list-disc ml-6 space-y-1 text-summi-gray-700">
                <li><strong>Dados de cadastro:</strong> nome, e-mail, telefone</li>
                <li><strong>Dados de conversas:</strong> mensagens de texto e áudio do WhatsApp</li>
                <li><strong>Dados de uso:</strong> logs de acesso, preferências de configuração</li>
                <li><strong>Dados de pagamento:</strong> informações processadas via Stripe (não armazenamos dados de cartão)</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-summi-gray-900 mb-2">2. Finalidade do tratamento</h3>
              <p className="text-summi-gray-700 mb-3">Seus dados são utilizados para:</p>
              <ul className="list-disc ml-6 space-y-1 text-summi-gray-700">
                <li>Fornecer os serviços de análise e automação de mensagens</li>
                <li>Processar e transcrever áudios</li>
                <li>Gerar resumos e classificações de conversas</li>
                <li>Gerenciar sua conta e assinatura</li>
                <li>Melhorar nossos serviços</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-summi-gray-900 mb-2">3. Base legal</h3>
              <p className="text-summi-gray-700">
                O tratamento dos seus dados baseia-se no <strong>consentimento</strong> fornecido ao aceitar 
                nossos termos de uso e na <strong>execução de contrato</strong> para prestação dos serviços contratados.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-summi-gray-900 mb-2">4. Compartilhamento de dados</h3>
              <p className="text-summi-gray-700 mb-3">Seus dados podem ser compartilhados apenas com:</p>
              <ul className="list-disc ml-6 space-y-1 text-summi-gray-700">
                <li><strong>Prestadores de serviço:</strong> Stripe (pagamentos), serviços de IA (OpenAI/similar)</li>
                <li><strong>Autoridades:</strong> quando exigido por lei</li>
                <li><strong>Nunca comercializamos</strong> ou vendemos seus dados pessoais</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-summi-gray-900 mb-2">5. Seus direitos</h3>
              <p className="text-summi-gray-700 mb-3">Você tem direito a:</p>
              <ul className="list-disc ml-6 space-y-1 text-summi-gray-700">
                <li><strong>Acesso:</strong> saber quais dados temos sobre você</li>
                <li><strong>Correção:</strong> corrigir dados incorretos</li>
                <li><strong>Exclusão:</strong> solicitar remoção dos seus dados</li>
                <li><strong>Portabilidade:</strong> receber seus dados em formato estruturado</li>
                <li><strong>Revogação:</strong> retirar seu consentimento a qualquer momento</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-summi-gray-900 mb-2">6. Segurança</h3>
              <p className="text-summi-gray-700">
                Implementamos medidas técnicas e organizacionais adequadas para proteger seus dados, 
                incluindo criptografia, controle de acesso e monitoramento de segurança.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-summi-gray-900 mb-2">7. Retenção</h3>
              <p className="text-summi-gray-700">
                Mantemos seus dados apenas pelo tempo necessário para cumprir as finalidades descritas 
                ou conforme exigido por lei. Dados de conversas são mantidos temporariamente para 
                funcionamento do sistema.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-summi-gray-900 mb-2">8. Contato do Encarregado</h3>
              <p className="text-summi-gray-700">
                Para exercer seus direitos ou esclarecer dúvidas sobre o tratamento de dados, 
                entre em contato através dos canais de suporte da plataforma.
              </p>
            </section>

            <div className="bg-summi-green/10 p-4 rounded-lg border border-summi-green/20 mt-6">
              <h4 className="font-semibold text-summi-green mb-2">Importante:</h4>
              <p className="text-summi-gray-700">
                Esta política pode ser atualizada periodicamente. Manteremos você informado sobre mudanças significativas.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LGPDPage;
