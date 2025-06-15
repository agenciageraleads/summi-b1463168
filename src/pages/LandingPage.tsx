import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Check, MessageSquare, Mic, FileText, BarChart3, Bell, Shield, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-summi-gray-50 to-white">
      {/* Navigation */}
      <nav className="border-b border-summi-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-summi-green rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <span className="text-2xl font-bold text-summi-green">Summi</span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#recursos" className="text-summi-gray-600 hover:text-summi-green transition-colors">
                Recursos
              </a>
              <a href="#como-funciona" className="text-summi-gray-600 hover:text-summi-green transition-colors">
                Como Funciona
              </a>
              <a href="#precos" className="text-summi-gray-600 hover:text-summi-green transition-colors">
                Preços
              </a>
              <a href="#faq" className="text-summi-gray-600 hover:text-summi-green transition-colors">
                FAQ
              </a>
            </div>

            {/* CTA Buttons */}
            <div className="flex items-center space-x-4">
              <Link to="/login">
                <Button variant="ghost" className="text-summi-gray-600 hover:text-summi-green">
                  Entrar
                </Button>
              </Link>
              <Link to="/register">
                <Button className="bg-summi-gradient hover:opacity-90 text-white shadow-lg">
                  Começar Grátis
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <Badge className="mb-6 bg-summi-green/10 text-summi-green border-summi-green/20">
              IA Avançada para WhatsApp
            </Badge>
            
            <h1 className="text-5xl lg:text-7xl font-bold text-summi-gray-900 mb-6">
              Automatize seu{" "}
              <span className="bg-summi-gradient bg-clip-text text-transparent">
                WhatsApp
              </span>{" "}
              com IA
            </h1>
            
            <p className="text-xl text-summi-gray-600 mb-8 leading-relaxed">
              Summi analisa e prioriza suas conversas de WhatsApp para que você não perca nenhuma oportunidade. 
              <em className="block mt-2 text-sm text-summi-gray-500">
                *A funcionalidade de responder automaticamente aos usuários está em desenvolvimento e será liberada em breve.
              </em>
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Link to="/register">
                <Button size="lg" className="bg-summi-gradient hover:opacity-90 text-white shadow-xl px-8 py-4 text-lg">
                  Começar Grátis
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </div>

            <div className="flex flex-wrap justify-center gap-8 text-sm text-summi-gray-500">
              <div className="flex items-center">
                <Check className="w-4 h-4 text-summi-green mr-2" />
                7 dias grátis
              </div>
              <div className="flex items-center">
                <Check className="w-4 h-4 text-summi-green mr-2" />
                Sem cartão de crédito
              </div>
              <div className="flex items-center">
                <Check className="w-4 h-4 text-summi-green mr-2" />
                Configuração em 5 min
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recursos Section */}
      <section id="recursos" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-summi-gray-900 mb-4">
              Summi da Hora
            </h2>
            <p className="text-xl text-summi-gray-600 max-w-3xl mx-auto">
              Nossa assistente Summi analisa suas conversas de WhatsApp e entrega resumos periódicos 
              com as informações mais importantes.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-summi-gray-200 hover:border-summi-green/30 transition-all duration-300 hover:shadow-lg">
              <CardHeader>
                <MessageSquare className="w-12 h-12 text-summi-green mb-4" />
                <CardTitle className="text-summi-gray-900">Resumo de Mensagens Importantes</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-summi-gray-600">
                  Receba resumos periódicos das mensagens mais importantes, organizados por temas prioritários.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-summi-gray-200 hover:border-summi-green/30 transition-all duration-300 hover:shadow-lg">
              <CardHeader>
                <Mic className="w-12 h-12 text-summi-green mb-4" />
                <CardTitle className="text-summi-gray-900">Transcrição de Áudios</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-summi-gray-600">
                  Transforme automaticamente todos os áudios recebidos em texto para busca e análise posterior.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-summi-gray-200 hover:border-summi-green/30 transition-all duration-300 hover:shadow-lg">
              <CardHeader>
                <FileText className="w-12 h-12 text-summi-green mb-4" />
                <CardTitle className="text-summi-gray-900">Resumo de Áudios</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-summi-gray-600">
                  Obtenha resumos inteligentes de mensagens de áudio longas para economizar tempo.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-summi-gray-200 hover:border-summi-green/30 transition-all duration-300 hover:shadow-lg">
              <CardHeader>
                <BarChart3 className="w-12 h-12 text-summi-green mb-4" />
                <CardTitle className="text-summi-gray-900">Análise de Conversas</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-summi-gray-600">
                  Acompanhe métricas e estatísticas para otimizar suas interações.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-summi-gray-200 hover:border-summi-green/30 transition-all duration-300 hover:shadow-lg">
              <CardHeader>
                <Bell className="w-12 h-12 text-summi-green mb-4" />
                <CardTitle className="text-summi-gray-900">Alertas Prioritários</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-summi-gray-600">
                  Receba notificações para palavras-chave importantes definidas por você.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-summi-gray-200 hover:border-summi-green/30 transition-all duration-300 hover:shadow-lg">
              <CardHeader>
                <Shield className="w-12 h-12 text-summi-green mb-4" />
                <CardTitle className="text-summi-gray-900">Privacidade Garantida</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-summi-gray-600">
                  Seus dados são criptografados e nunca compartilhados com terceiros.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="precos" className="py-20 bg-summi-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-summi-gray-900 mb-4">
              Um plano simples, todas as funcionalidades
            </h2>
            <p className="text-xl text-summi-gray-600">
              Comece com 7 dias de teste gratuito. Cancele quando quiser.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="border-summi-gray-200 hover:shadow-xl transition-all duration-300">
              <CardHeader className="text-center pb-8">
                <CardTitle className="text-2xl text-summi-gray-900">Plano Mensal</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-summi-gray-900">R$ 29,90</span>
                  <span className="text-summi-gray-500 ml-2">por mês</span>
                </div>
                <CardDescription className="mt-2 text-summi-gray-600">
                  Acesso completo com a flexibilidade do pagamento mensal.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Link to="/register">
                  <Button className="w-full bg-summi-gradient hover:opacity-90 text-white">
                    Assinar Plano Mensal
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-summi-green shadow-lg relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-summi-green text-white">Melhor Oferta</Badge>
              </div>
              <CardHeader className="text-center pb-8">
                <CardTitle className="text-2xl text-summi-gray-900">Plano Anual</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-summi-gray-900">R$ 19,90</span>
                  <span className="text-summi-gray-500 ml-2">por mês</span>
                </div>
                <div className="text-sm text-summi-green font-medium">
                  33% de desconto • Cobrado anualmente
                </div>
                <CardDescription className="mt-2 text-summi-gray-600">
                  O melhor custo-benefício com desconto anual.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Link to="/register">
                  <Button className="w-full bg-summi-green hover:bg-summi-green/90 text-white">
                    Assinar Plano Anual
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          <p className="text-center text-summi-gray-500 mt-8">
            Ambos os planos incluem todas as funcionalidades e suporte prioritário.
          </p>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-summi-gray-900 mb-4">
              Perguntas Frequentes
            </h2>
            <p className="text-xl text-summi-gray-600">
              Tire suas dúvidas sobre o Summi e como nossa IA pode transformar sua gestão do WhatsApp.
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="item-1" className="border border-summi-gray-200 rounded-lg px-6">
              <AccordionTrigger className="text-left hover:no-underline">
                <span className="text-lg font-medium text-summi-gray-900">
                  Como o Summi funciona com meu WhatsApp?
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-summi-gray-600 pb-4">
                O Summi se conecta ao seu WhatsApp através de uma API segura e analisa suas conversas em tempo real. 
                Nossa IA identifica mensagens importantes, transcreve áudios e gera resumos personalizados que são 
                entregues periodicamente no horário que você escolher.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="border border-summi-gray-200 rounded-lg px-6">
              <AccordionTrigger className="text-left hover:no-underline">
                <span className="text-lg font-medium text-summi-gray-900">
                  Meus dados estão seguros?
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-summi-gray-600 pb-4">
                Sim! Levamos a privacidade muito a sério. Todas as suas conversas são criptografadas end-to-end, 
                nunca armazenamos o conteúdo das suas mensagens permanentemente, e jamais compartilhamos seus dados 
                com terceiros. Estamos em conformidade com a LGPD e outras regulamentações de proteção de dados.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="border border-summi-gray-200 rounded-lg px-6">
              <AccordionTrigger className="text-left hover:no-underline">
                <span className="text-lg font-medium text-summi-gray-900">
                  O Summi responde mensagens automaticamente?
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-summi-gray-600 pb-4">
                Atualmente, o Summi foca em análise e resumos das suas conversas. A funcionalidade de resposta 
                automática está em desenvolvimento e será liberada em breve. Por enquanto, nossa IA te ajuda a 
                priorizar e organizar suas mensagens mais importantes.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="border border-summi-gray-200 rounded-lg px-6">
              <AccordionTrigger className="text-left hover:no-underline">
                <span className="text-lg font-medium text-summi-gray-900">
                  Como funciona o período de teste gratuito?
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-summi-gray-600 pb-4">
                Oferecemos 7 dias de teste gratuito com acesso completo a todas as funcionalidades. 
                Não é necessário cartão de crédito para começar. Após o período de teste, você pode 
                escolher entre nossos planos mensais ou anuais.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5" className="border border-summi-gray-200 rounded-lg px-6">
              <AccordionTrigger className="text-left hover:no-underline">
                <span className="text-lg font-medium text-summi-gray-900">
                  Posso usar o Summi em múltiplos números de WhatsApp?
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-summi-gray-600 pb-4">
                Atualmente, cada conta do Summi suporta um número de WhatsApp. Se você precisar gerenciar 
                múltiplos números, será necessário criar contas separadas para cada um. Estamos trabalhando 
                em uma solução para empresas que precisam gerenciar múltiplos números.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-6" className="border border-summi-gray-200 rounded-lg px-6">
              <AccordionTrigger className="text-left hover:no-underline">
                <span className="text-lg font-medium text-summi-gray-900">
                  Como cancelo minha assinatura?
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-summi-gray-600 pb-4">
                Você pode cancelar sua assinatura a qualquer momento através das configurações da sua conta. 
                O cancelamento é imediato e você continuará tendo acesso aos recursos até o final do período 
                já pago. Não há taxas de cancelamento ou multas.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-7" className="border border-summi-gray-200 rounded-lg px-6">
              <AccordionTrigger className="text-left hover:no-underline">
                <span className="text-lg font-medium text-summi-gray-900">
                  O Summi funciona com WhatsApp Business?
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-summi-gray-600 pb-4">
                Sim! O Summi é compatível tanto com WhatsApp pessoal quanto com WhatsApp Business. 
                Na verdade, é especialmente útil para quem usa WhatsApp Business, ajudando a organizar 
                e priorizar conversas com clientes de forma mais eficiente.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-8" className="border border-summi-gray-200 rounded-lg px-6">
              <AccordionTrigger className="text-left hover:no-underline">
                <span className="text-lg font-medium text-summi-gray-900">
                  Preciso instalar algum aplicativo no meu celular?
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-summi-gray-600 pb-4">
                Não! O Summi funciona 100% na web. Você apenas precisa escanear um QR Code uma única vez 
                para conectar seu WhatsApp, similar a como você faria para usar o WhatsApp Web. 
                Depois disso, tudo funciona automaticamente.
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="text-center mt-12">
            <p className="text-summi-gray-600 mb-6">
              Ainda tem dúvidas? Entre em contato conosco!
            </p>
            <Link to="/register">
              <Button size="lg" className="bg-summi-gradient hover:opacity-90 text-white">
                Começar Teste Gratuito
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-summi-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-summi-green rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">S</span>
                </div>
                <span className="text-xl font-bold">Summi</span>
              </div>
              <p className="text-summi-gray-400">
                Sua assistente de IA para WhatsApp Business.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Links Rápidos</h4>
              <ul className="space-y-2 text-summi-gray-400">
                <li><a href="#recursos" className="hover:text-white transition-colors">Funcionalidades</a></li>
                <li><a href="#precos" className="hover:text-white transition-colors">Planos</a></li>
                <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Suporte</h4>
              <ul className="space-y-2 text-summi-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Contato</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Documentação</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Status do Sistema</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-summi-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Termos de Uso</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Política de Privacidade</a></li>
                <li><a href="#" className="hover:text-white transition-colors">LGPD</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-summi-gray-800 mt-12 pt-8 text-center text-summi-gray-400">
            <p>&copy; 2025 Summi. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
