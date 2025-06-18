
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TermsOfServiceProps {
  isModal?: boolean;
}

// Componente atualizado com os novos termos de uso para MVP
export const TermsOfService: React.FC<TermsOfServiceProps> = ({ isModal = false }) => {
  const containerClass = isModal 
    ? "max-h-96 overflow-y-auto p-4" 
    : "container mx-auto px-4 py-8 max-w-4xl";

  return (
    <div className={containerClass}>
      {!isModal && (
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-summi-gray-900 mb-2">
            Termos de Uso da Plataforma Summi (Versão MVP)
          </h1>
          <p className="text-summi-gray-600">
            Última atualização: 18 de junho de 2025
          </p>
        </div>
      )}

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-summi-green">
            Termos de Uso da Plataforma Summi (Versão MVP)
          </CardTitle>
          <p className="text-sm text-summi-gray-600 mt-2">
            <strong>Importante:</strong> Ao utilizar a plataforma Summi em sua fase inicial (MVP - Produto Mínimo Viável), 
            você declara ter lido, compreendido e aceito integralmente as condições abaixo.
          </p>
        </CardHeader>
        <CardContent className="space-y-6 text-sm">
          <section>
            <h3 className="font-semibold text-summi-gray-900 mb-2">1. Natureza Experimental do Serviço</h3>
            <p className="text-summi-gray-700 mb-3">
              A plataforma Summi encontra-se em fase inicial de desenvolvimento (MVP), disponibilizada de forma 
              limitada e experimental a usuários interessados em testar as funcionalidades propostas. 
              Ao utilizar a plataforma neste estágio, o usuário reconhece e aceita que:
            </p>
            <ul className="list-disc ml-6 space-y-1 text-summi-gray-700">
              <li>Podem ocorrer falhas, instabilidades, interrupções e bugs não previstos</li>
              <li>As funcionalidades estão em constante evolução e podem ser alteradas ou descontinuadas a qualquer momento</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-summi-gray-900 mb-2">2. Funcionalidades e Autorização do Usuário</h3>
            <p className="text-summi-gray-700 mb-3">
              Ao aceitar estes termos, o usuário autoriza a plataforma a:
            </p>
            <ul className="list-disc ml-6 space-y-1 text-summi-gray-700">
              <li>Conectar-se à sua conta do WhatsApp Business</li>
              <li>Receber, processar e armazenar temporariamente mensagens de texto e áudio</li>
              <li>Transcrever áudios de voz</li>
              <li>Analisar conversas com uso de inteligência artificial para gerar resumos, priorizações e classificações de urgência e importância</li>
              <li>(Quando habilitado) Responder automaticamente mensagens com base em regras configuradas</li>
            </ul>
            <p className="text-summi-gray-700 mt-3">
              O usuário declara estar ciente de que todas as análises, classificações e respostas são feitas por 
              sistemas automatizados e, portanto, estão sujeitas a falhas de interpretação.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-summi-gray-900 mb-2">3. Uso de API Não Oficial e Riscos Associados</h3>
            <p className="text-summi-gray-700 mb-3">
              A integração com o WhatsApp ocorre por meio de tecnologia de API não oficial, sem qualquer vínculo, 
              certificação, homologação ou aprovação da empresa Meta Platforms Inc.
            </p>
            <p className="text-summi-gray-700 mb-3">
              O usuário está plenamente ciente e aceita que o uso de integrações não oficiais pode, 
              a critério exclusivo do WhatsApp, resultar em:
            </p>
            <ul className="list-disc ml-6 space-y-1 text-summi-gray-700 mb-3">
              <li>Suspensões temporárias de conta</li>
              <li>Restrições de funcionalidades</li>
              <li>Banimento parcial ou total do número de WhatsApp vinculado</li>
            </ul>
            <div className="bg-red-50 p-3 rounded-lg border border-red-200">
              <h4 className="font-medium text-red-800 mb-2">Isenção de Responsabilidade:</h4>
              <p className="text-red-700 text-sm">
                A Summi não possui controle sobre as decisões da Meta/WhatsApp e não se responsabiliza, 
                em nenhuma hipótese, por eventuais bloqueios, sanções, prejuízos, perdas comerciais ou 
                financeiras decorrentes de ações tomadas pelo WhatsApp sobre o número utilizado na integração.
              </p>
            </div>
          </section>

          <section>
            <h3 className="font-semibold text-summi-gray-900 mb-2">4. Responsabilidades do Usuário</h3>
            <p className="text-summi-gray-700 mb-3">O usuário compromete-se a:</p>
            <ul className="list-disc ml-6 space-y-1 text-summi-gray-700">
              <li>Manter sigilo e segurança de suas credenciais de acesso</li>
              <li>Configurar corretamente as opções e horários de funcionamento</li>
              <li>Acompanhar periodicamente as interações automatizadas</li>
              <li>Informar prontamente qualquer falha identificada durante o uso da ferramenta</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-summi-gray-900 mb-2">5. Limitação de Garantias e Responsabilidades</h3>
            <p className="text-summi-gray-700">
              A Summi é disponibilizada "como está" (as is), sem garantias de funcionamento contínuo, 
              estabilidade ou precisão absoluta. A responsabilidade pelo uso dos dados processados, 
              decisões baseadas nos resumos e eventuais consequências comerciais ou jurídicas decorrentes 
              das interações automatizadas recai exclusivamente sobre o usuário.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-summi-gray-900 mb-2">6. Privacidade e Tratamento de Dados</h3>
            <ul className="list-disc ml-6 space-y-1 text-summi-gray-700">
              <li>As mensagens processadas são armazenadas temporariamente com a única finalidade de viabilizar o funcionamento do sistema</li>
              <li>Não há compartilhamento, comercialização ou cessão dos dados processados a terceiros, salvo exigência legal ou operacional indispensável ao funcionamento</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-summi-gray-900 mb-2">7. Atualizações</h3>
            <p className="text-summi-gray-700">
              Estes termos poderão ser revisados e atualizados a qualquer tempo, sendo a versão vigente 
              aquela disponibilizada no momento do acesso.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-summi-gray-900 mb-2">8. Contato</h3>
            <p className="text-summi-gray-700">
              Em caso de dúvidas ou sugestões, o usuário poderá entrar em contato com a equipe responsável 
              diretamente pelos canais de suporte da plataforma.
            </p>
          </section>

          <div className="bg-summi-green/10 p-4 rounded-lg border border-summi-green/20 mt-6">
            <h4 className="font-semibold text-summi-green mb-2">Nota Final:</h4>
            <p className="text-summi-gray-700">
              Ao seguir com o cadastro, o usuário declara total ciência e aceitação de todas as condições aqui estabelecidas.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
