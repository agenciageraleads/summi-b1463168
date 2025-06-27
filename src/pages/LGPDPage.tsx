
// ABOUTME: Página dedicada às informações sobre LGPD (Lei Geral de Proteção de Dados).
// ABOUTME: Contém informações sobre como a Summi trata e protege os dados dos usuários.

import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Eye, Lock, UserCheck, FileText, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
        <div className="text-center mb-12">
          <Shield className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            LGPD - Lei Geral de Proteção de Dados
          </h1>
          <p className="text-xl text-gray-600">
            Como a Summi protege e trata seus dados pessoais
          </p>
        </div>

        <div className="space-y-8">
          {/* Introdução */}
          <Card className="border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-green-600" />
                Nosso Compromisso com a LGPD
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none">
              <p>
                A Summi está em total conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018). 
                Respeitamos seus direitos e garantimos a proteção adequada de seus dados pessoais.
              </p>
            </CardContent>
          </Card>

          {/* Dados Coletados */}
          <Card className="border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-green-600" />
                Quais Dados Coletamos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Dados de Cadastro:</h4>
                  <ul className="list-disc list-inside text-gray-600 space-y-1">
                    <li>Nome completo</li>
                    <li>Endereço de email</li>
                    <li>Número de telefone</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Dados de Uso:</h4>
                  <ul className="list-disc list-inside text-gray-600 space-y-1">
                    <li>Mensagens do WhatsApp para análise (quando autorizado)</li>
                    <li>Preferências de configuração</li>
                    <li>Estatísticas de uso (anonimizadas)</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Finalidade */}
          <Card className="border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-green-600" />
                Para Que Usamos Seus Dados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside text-gray-600 space-y-2">
                <li>Fornecer os serviços de análise e transcrição de mensagens</li>
                <li>Melhorar a experiência do usuário</li>
                <li>Enviar comunicações importantes sobre o serviço</li>
                <li>Cumprir obrigações legais e regulamentares</li>
                <li>Personalizar sua experiência na plataforma</li>
              </ul>
            </CardContent>
          </Card>

          {/* Segurança */}
          <Card className="border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-green-600" />
                Como Protegemos Seus Dados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside text-gray-600 space-y-2">
                <li>Criptografia de ponta a ponta para todas as comunicações</li>
                <li>Armazenamento seguro em servidores certificados</li>
                <li>Acesso restrito aos dados apenas para funcionários autorizados</li>
                <li>Monitoramento contínuo de segurança</li>
                <li>Backups seguros e recuperação de desastres</li>
              </ul>
            </CardContent>
          </Card>

          {/* Seus Direitos */}
          <Card className="border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-600" />
                Seus Direitos Sob a LGPD
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Você tem o direito de:</h4>
                  <ul className="list-disc list-inside text-gray-600 space-y-1">
                    <li>Confirmar a existência de tratamento</li>
                    <li>Acessar seus dados</li>
                    <li>Corrigir dados incompletos ou inexatos</li>
                    <li>Anonimizar ou excluir dados</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Também pode:</h4>
                  <ul className="list-disc list-inside text-gray-600 space-y-1">
                    <li>Solicitar portabilidade dos dados</li>
                    <li>Eliminar dados tratados com consentimento</li>
                    <li>Revogar o consentimento</li>
                    <li>Solicitar revisão de decisões automatizadas</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Retenção */}
          <Card className="border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-green-600" />
                Retenção de Dados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Mantemos seus dados apenas pelo tempo necessário para cumprir as finalidades descritas, 
                respeitando prazos legais mínimos quando aplicáveis.
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>Dados de cadastro: enquanto a conta estiver ativa</li>
                <li>Mensagens analisadas: até 90 dias após o processamento</li>
                <li>Logs de sistema: até 1 ano para fins de segurança</li>
              </ul>
            </CardContent>
          </Card>

          {/* Contato */}
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle>Entre em Contato</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Para exercer seus direitos ou esclarecer dúvidas sobre o tratamento de dados:
              </p>
              <div className="space-y-2">
                <p><strong>Email:</strong> privacidade@summi.com.br</p>
                <p><strong>Encarregado de Dados:</strong> Equipe de Proteção de Dados</p>
                <p><strong>Prazo de Resposta:</strong> Até 15 dias úteis</p>
              </div>
            </CardContent>
          </Card>

          {/* Atualização */}
          <div className="text-center text-gray-500 text-sm">
            <p>Última atualização: Janeiro de 2025</p>
            <p>Esta página será atualizada sempre que houver mudanças relevantes.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LGPDPage;
