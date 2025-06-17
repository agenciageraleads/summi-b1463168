
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TermsOfServiceProps {
  isModal?: boolean;
}

export const TermsOfService: React.FC<TermsOfServiceProps> = ({ isModal = false }) => {
  const containerClass = isModal 
    ? "max-h-96 overflow-y-auto p-4" 
    : "container mx-auto px-4 py-8 max-w-4xl";

  return (
    <div className={containerClass}>
      {!isModal && (
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-summi-gray-900 mb-2">
            Termos de Uso - Summi
          </h1>
          <p className="text-summi-gray-600">
            Última atualização: 17 de junho de 2025
          </p>
        </div>
      )}

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-summi-green">
            Termos de Uso da Plataforma Summi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-sm">
          <section>
            <h3 className="font-semibold text-summi-gray-900 mb-2">1. Aceitação dos Termos</h3>
            <p className="text-summi-gray-700">
              Ao utilizar a plataforma Summi, você concorda com estes termos de uso e autoriza 
              nossa ferramenta a realizar as seguintes ações em seu nome:
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-summi-gray-900 mb-2">2. Autorização de Funcionalidades</h3>
            <div className="space-y-3">
              <div>
                <h4 className="font-medium text-summi-gray-800">2.1 Integração com WhatsApp</h4>
                <p className="text-summi-gray-700">
                  Você autoriza a Summi a conectar-se ao seu WhatsApp Business para:
                </p>
                <ul className="list-disc ml-6 mt-2 space-y-1 text-summi-gray-700">
                  <li>Receber e processar mensagens</li>
                  <li>Enviar respostas automáticas baseadas em IA</li>
                  <li>Analisar conversas para identificar prioridades</li>
                  <li>Transcrever áudios recebidos e enviados</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-summi-gray-800">2.2 Processamento de Dados</h4>
                <p className="text-summi-gray-700">
                  Você autoriza a Summi a:
                </p>
                <ul className="list-disc ml-6 mt-2 space-y-1 text-summi-gray-700">
                  <li>Processar o conteúdo das mensagens usando inteligência artificial</li>
                  <li>Armazenar conversas para análise e melhoria do serviço</li>
                  <li>Gerar resumos e contextos das conversas</li>
                  <li>Classificar mensagens por urgência e importância</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-summi-gray-800">2.3 Respostas Automáticas</h4>
                <p className="text-summi-gray-700">
                  Você autoriza a Summi a enviar respostas automáticas em seu nome, baseadas:
                </p>
                <ul className="list-disc ml-6 mt-2 space-y-1 text-summi-gray-700">
                  <li>Nas configurações de temas importantes definidas por você</li>
                  <li>No contexto da conversa analisado pela IA</li>
                  <li>Nos horários de funcionamento configurados</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h3 className="font-semibold text-summi-gray-900 mb-2">3. Responsabilidades do Usuário</h3>
            <ul className="list-disc ml-6 space-y-1 text-summi-gray-700">
              <li>Manter suas credenciais de acesso seguras</li>
              <li>Configurar adequadamente os temas e horários de funcionamento</li>
              <li>Revisar periodicamente as respostas automáticas geradas</li>
              <li>Informar sobre problemas ou funcionamento inadequado</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-summi-gray-900 mb-2">4. Privacidade e Segurança</h3>
            <p className="text-summi-gray-700">
              Seus dados são tratados com máxima segurança. Não compartilhamos informações 
              pessoais com terceiros, exceto quando necessário para o funcionamento da plataforma 
              ou quando exigido por lei.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-summi-gray-900 mb-2">5. Limitações de Responsabilidade</h3>
            <p className="text-summi-gray-700">
              A Summi fornece o serviço "como está". Embora nos esforcemos para máxima precisão, 
              não garantimos que as respostas automáticas sejam sempre perfeitas. Recomendamos 
              monitoramento regular das conversas.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-summi-gray-900 mb-2">6. Modificações</h3>
            <p className="text-summi-gray-700">
              Podemos atualizar estes termos periodicamente. Usuários serão notificados sobre 
              mudanças significativas e precisarão aceitar novamente os termos atualizados.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-summi-gray-900 mb-2">7. Contato</h3>
            <p className="text-summi-gray-700">
              Para dúvidas sobre estes termos, entre em contato através da nossa plataforma 
              ou pelos canais de suporte disponíveis.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
};
