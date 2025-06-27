
// ABOUTME: Página da Política de Privacidade da Summi.
// ABOUTME: Contém informações detalhadas sobre coleta, uso e proteção de dados.

import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Database, Users, AlertCircle, Mail, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
        <div className="text-center mb-12">
          <Shield className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Política de Privacidade
          </h1>
          <p className="text-xl text-gray-600">
            Como coletamos, usamos e protegemos suas informações
          </p>
        </div>

        <div className="space-y-8">
          {/* Introdução */}
          <Card className="border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-600" />
                Nossa Responsabilidade
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>
                Esta Política de Privacidade descreve como a Summi ("nós", "nosso" ou "empresa") 
                coleta, usa, processa e protege suas informações pessoais quando você utiliza 
                nossos serviços de análise inteligente para WhatsApp.
              </p>
              <p className="mt-4">
                Ao usar nossos serviços, você concorda com as práticas descritas nesta política.
              </p>
            </CardContent>
          </Card>

          {/* Informações Coletadas */}
          <Card className="border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-green-600" />
                Informações que Coletamos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-3">1. Informações de Conta</h4>
                  <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
                    <li>Nome completo</li>
                    <li>Endereço de email</li>
                    <li>Número de telefone</li>
                    <li>Senha (criptografada)</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-3">2. Dados do WhatsApp</h4>
                  <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
                    <li>Mensagens de texto (para análise)</li>
                    <li>Mensagens de áudio (para transcrição)</li>
                    <li>Metadados das conversas (data, hora, participantes)</li>
                    <li>Configurações de monitoramento</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">3. Informações de Uso</h4>
                  <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
                    <li>Logs de acesso e atividade</li>
                    <li>Preferências e configurações</li>
                    <li>Estatísticas de uso (anonimizadas)</li>
                    <li>Informações de dispositivo e navegador</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Como Usamos */}
          <Card className="border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-green-600" />
                Como Usamos suas Informações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Prestação de Serviços:</h4>
                  <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
                    <li>Análise e resumo de conversas do WhatsApp</li>
                    <li>Transcrição de mensagens de áudio</li>
                    <li>Geração de insights e relatórios</li>
                    <li>Identificação de mensagens prioritárias</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Melhoria dos Serviços:</h4>
                  <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
                    <li>Desenvolvimento de novos recursos</li>
                    <li>Otimização de algoritmos de IA</li>
                    <li>Análise de desempenho e uso</li>
                    <li>Correção de bugs e problemas</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Comunicação:</h4>
                  <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
                    <li>Notificações sobre o serviço</li>
                    <li>Atualizações e novidades</li>
                    <li>Suporte técnico</li>
                    <li>Informações de cobrança (quando aplicável)</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Compartilhamento */}
          <Card className="border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-green-600" />
                Compartilhamento de Informações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-yellow-800 mb-1">Princípio Fundamental</h4>
                    <p className="text-yellow-700 text-sm">
                      Não vendemos, alugamos ou compartilhamos suas informações pessoais com terceiros 
                      para fins comerciais.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Compartilhamos informações apenas quando:</h4>
                  <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
                    <li>Você nos autoriza expressamente</li>
                    <li>Exigido por lei ou autoridade competente</li>
                    <li>Necessário para proteção legal (fraude, segurança)</li>
                    <li>Com prestadores de serviço essenciais (sempre com contratos de confidencialidade)</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Prestadores de Serviço:</h4>
                  <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
                    <li>Provedores de hospedagem (AWS, Google Cloud)</li>
                    <li>Processadores de pagamento (Stripe)</li>
                    <li>Serviços de email transacional</li>
                    <li>Ferramentas de análise (dados anonimizados)</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Segurança */}
          <Card className="border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-600" />
                Medidas de Segurança
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Proteção Técnica:</h4>
                  <ul className="list-disc list-inside text-gray-600 space-y-1">
                    <li>Criptografia SSL/TLS</li>
                    <li>Criptografia de dados em repouso</li>
                    <li>Autenticação de dois fatores</li>
                    <li>Monitoramento 24/7</li>
                    <li>Backups seguros</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-3">Proteção Administrativa:</h4>
                  <ul className="list-disc list-inside text-gray-600 space-y-1">
                    <li>Acesso restrito por função</li>
                    <li>Treinamento de equipe</li>
                    <li>Auditorias regulares</li>
                    <li>Políticas de segurança</li>
                    <li>Contratos de confidencialidade</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Retenção */}
          <Card className="border-green-200">
            <CardHeader>
              <CardTitle>Retenção de Dados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-600">
                  Mantemos suas informações apenas pelo tempo necessário para fornecer nossos serviços 
                  e cumprir obrigações legais:
                </p>
                <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
                  <li><strong>Dados da conta:</strong> Enquanto sua conta estiver ativa</li>
                  <li><strong>Mensagens analisadas:</strong> Até 90 dias após o processamento</li>
                  <li><strong>Logs de sistema:</strong> Até 1 ano para fins de segurança</li>
                  <li><strong>Dados de cobrança:</strong> Conforme exigido por lei (até 5 anos)</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Seus Direitos */}
          <Card className="border-green-200">
            <CardHeader>
              <CardTitle>Seus Direitos e Controles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-600">Você tem o direito de:</p>
                <div className="grid md:grid-cols-2 gap-4">
                  <ul className="list-disc list-inside text-gray-600 space-y-1">
                    <li>Acessar seus dados pessoais</li>
                    <li>Corrigir informações incorretas</li>
                    <li>Excluir sua conta e dados</li>
                    <li>Exportar seus dados</li>
                  </ul>
                  <ul className="list-disc list-inside text-gray-600 space-y-1">
                    <li>Revogar consentimentos</li>
                    <li>Limitar o processamento</li>
                    <li>Apresentar reclamações</li>
                    <li>Atualizar preferências</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contato */}
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-green-600" />
                Entre em Contato
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Para dúvidas sobre esta política ou para exercer seus direitos:
              </p>
              <div className="space-y-2">
                <p><strong>Email de Privacidade:</strong> privacidade@summi.com.br</p>
                <p><strong>Suporte Geral:</strong> suporte@summi.com.br</p>
                <p><strong>Tempo de Resposta:</strong> Até 48 horas para questões de privacidade</p>
              </div>
            </CardContent>
          </Card>

          {/* Atualizações */}
          <Card className="border-green-200">
            <CardHeader>
              <CardTitle>Atualizações desta Política</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Podemos atualizar esta política periodicamente. Mudanças significativas serão 
                comunicadas por email e/ou aviso em nosso serviço.
              </p>
              <p className="text-gray-600">
                Recomendamos revisar esta política regularmente para se manter informado sobre 
                como protegemos suas informações.
              </p>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center text-gray-500 text-sm border-t pt-8">
            <p><strong>Última atualização:</strong> Janeiro de 2025</p>
            <p>Versão 1.0 - Esta política é efetiva a partir da data de sua publicação.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
