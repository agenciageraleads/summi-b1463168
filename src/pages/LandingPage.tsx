
// ABOUTME: Landing page principal da Summi com seções otimizadas para conversão.
// ABOUTME: Inclui hero section aprimorada, destaques de valor e estratégia de trial de 30 dias.

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Check, MessageSquare, Mic, FileText, BarChart3, Bell, Shield, ArrowRight, QrCode, Settings, Zap, Store, Target, Briefcase, Headphones, User, Clock, Brain, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

const LandingPage = () => {
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white">
      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10">
                <img src="/lovable-uploads/8d37281c-dfb2-4e98-93c9-888cccd6a706.png" alt="Summi Logo" className="w-full h-full object-contain" />
              </div>
              <span className="text-2xl font-bold text-green-600">Summi</span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#para-quem" className="text-gray-600 hover:text-green-600 transition-colors">
                Para Quem
              </a>
              <a href="#recursos" className="text-gray-600 hover:text-green-600 transition-colors">
                Recursos
              </a>
              <a href="#como-funciona" className="text-gray-600 hover:text-green-600 transition-colors">
                Como Funciona
              </a>
              <a href="#precos" className="text-gray-600 hover:text-green-600 transition-colors">
                Preços
              </a>
              <a href="#faq" className="text-gray-600 hover:text-green-600 transition-colors">
                FAQ
              </a>
            </div>

            {/* CTA Buttons */}
            <div className="flex items-center space-x-4">
              <Link to="/login">
                <Button variant="ghost" className="text-gray-600 hover:text-green-600">
                  Entrar
                </Button>
              </Link>
              <Link to="/register">
                <Button className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg">
                  Conectar Agora
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section - Otimizada para Mobile-First */}
      <section className={`${isMobile ? 'py-8' : 'py-20 lg:py-[92px]'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <Badge className="mb-4 bg-green-100 text-green-700 border-green-200">
              IA Avançada para WhatsApp
            </Badge>
            
            <h1 className={`${isMobile ? 'text-3xl' : 'text-5xl lg:text-7xl'} font-bold text-gray-900 mb-4`}>
              Automatize seu{" "}
              <br />
              <span className="bg-gradient-to-r from-green-500 to-green-700 bg-clip-text text-transparent">
                WhatsApp com IA
              </span>
            </h1>
            
            <p className={`${isMobile ? 'text-lg mb-6' : 'text-xl mb-8'} text-gray-600 leading-relaxed`}>
              Summi analisa e prioriza suas conversas de WhatsApp para que você não perca nenhuma oportunidade.
            </p>

            {/* CTA Principal - Posicionado estrategicamente */}
            <div className={`${isMobile ? 'mb-8' : 'mb-12'}`}>
              <Link to="/register">
                <Button 
                  size="lg" 
                  className={`${isMobile ? 'w-full py-4 text-xl font-semibold' : 'px-8 py-4 text-lg'} bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-xl`}
                >
                  Conectar Agora
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </div>

            {/* Aviso destacado sobre teste gratuito - Mais visível */}
            <div className={`bg-green-50 border border-green-200 rounded-lg ${isMobile ? 'p-3 mb-8' : 'p-4 mb-12'} max-w-2xl mx-auto`}>
              <p className={`text-green-800 font-medium ${isMobile ? 'text-base' : 'text-lg'}`}>
                🎉 <strong>30 dias grátis</strong> para testar todas as funcionalidades
              </p>
              <p className={`text-green-700 ${isMobile ? 'text-xs' : 'text-sm'} mt-1`}>
                Ativação imediata • Sem compromisso • Comece agora mesmo
              </p>
            </div>

            {/* Destaques de Valor - Compactos para mobile */}
            <div className={`grid ${isMobile ? 'md:grid-cols-1 gap-4' : 'md:grid-cols-3 gap-6'} ${isMobile ? 'mb-8' : 'mb-12'} max-w-4xl mx-auto`}>
              <div className={`flex ${isMobile ? 'flex-row items-center' : 'flex-col items-center'} text-center ${isMobile ? 'p-4' : 'p-6'} bg-white/50 rounded-xl border border-green-100`}>
                <div className={`${isMobile ? 'w-12 h-12 mr-4' : 'w-16 h-16 mb-4'} bg-green-100 rounded-full flex items-center justify-center`}>
                  <Mic className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} text-green-600`} />
                </div>
                <div>
                  <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-gray-900 ${isMobile ? 'mb-1' : 'mb-2'}`}>Transcreva áudios longos em segundos</h3>
                  <p className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>Transforme mensagens de voz em texto instantaneamente</p>
                </div>
              </div>

              <div className={`flex ${isMobile ? 'flex-row items-center' : 'flex-col items-center'} text-center ${isMobile ? 'p-4' : 'p-6'} bg-white/50 rounded-xl border border-green-100`}>
                <div className={`${isMobile ? 'w-12 h-12 mr-4' : 'w-16 h-16 mb-4'} bg-green-100 rounded-full flex items-center justify-center`}>
                  <Brain className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} text-green-600`} />
                </div>
                <div>
                  <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-gray-900 ${isMobile ? 'mb-1' : 'mb-2'}`}>Resuma conversas e extraia insights</h3>
                  <p className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>IA identifica informações importantes automaticamente</p>
                </div>
              </div>

              <div className={`flex ${isMobile ? 'flex-row items-center' : 'flex-col items-center'} text-center ${isMobile ? 'p-4' : 'p-6'} bg-white/50 rounded-xl border border-green-100`}>
                <div className={`${isMobile ? 'w-12 h-12 mr-4' : 'w-16 h-16 mb-4'} bg-green-100 rounded-full flex items-center justify-center`}>
                  <TrendingUp className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} text-green-600`} />
                </div>
                <div>
                  <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-gray-900 ${isMobile ? 'mb-1' : 'mb-2'}`}>Receba relatórios das conversas importantes</h3>
                  <p className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>Acompanhe métricas e nunca perca oportunidades</p>
                </div>
              </div>
            </div>

            {/* Informações de credibilidade */}
            <div className={`flex flex-wrap justify-center gap-6 ${isMobile ? 'text-xs' : 'text-sm'} text-gray-500`}>
              <div className="flex items-center">
                <Check className="w-4 h-4 text-green-600 mr-2" />
                Configuração em 5 min
              </div>
              <div className="flex items-center">
                <Check className="w-4 h-4 text-green-600 mr-2" />
                30 dias grátis
              </div>
              <div className="flex items-center">
                <Check className="w-4 h-4 text-green-600 mr-2" />
                Ativação imediata
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Para Quem É Section */}
      <section id="para-quem" className="py-16 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">A Summi é perfeita para você que...</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="text-center border-gray-200 hover:border-green-300 transition-all duration-300 hover:shadow-lg">
              <CardHeader className="pb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Store className="w-8 h-8 text-green-600" />
                </div>
                <CardDescription className="text-gray-700 text-sm leading-relaxed">
                  É <strong>Empreendedor ou Dono de Negócio</strong> e sente que o WhatsApp é mais um chefe do que uma ferramenta.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center border-gray-200 hover:border-green-300 transition-all duration-300 hover:shadow-lg">
              <CardHeader className="pb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-green-600" />
                </div>
                <CardDescription className="text-gray-700 text-sm leading-relaxed">
                  É <strong>Vendedor ou do Time Comercial</strong> e precisa de velocidade para bater metas e não perder leads para a concorrência.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center border-gray-200 hover:border-green-300 transition-all duration-300 hover:shadow-lg">
              <CardHeader className="pb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Briefcase className="w-8 h-8 text-green-600" />
                </div>
                <CardDescription className="text-gray-700 text-sm leading-relaxed">
                  É <strong>Profissional Liberal, Consultor ou de Agência</strong> e precisa organizar as demandas dos clientes para garantir entregas perfeitas.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center border-gray-200 hover:border-green-300 transition-all duration-300 hover:shadow-lg">
              <CardHeader className="pb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Headphones className="w-8 h-8 text-green-600" />
                </div>
                <CardDescription className="text-gray-700 text-sm leading-relaxed">
                  Trabalha com <strong>Atendimento ou Suporte</strong> e precisa identificar problemas urgentes antes que virem uma crise.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Antes e Depois Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Sua rotina no WhatsApp vai mudar do caos para o controle
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* Antes da Summi */}
            <div className="text-center">
              <div className="text-6xl mb-6">😥</div>
              <h3 className="text-2xl font-bold text-gray-500 mb-8">Antes da Summi</h3>
              <div className="space-y-4">
                <div className="p-4 bg-gray-100 rounded-lg border-l-4 border-gray-400">
                  <p className="text-gray-600 line-through">Áudios longos roubando seu tempo</p>
                </div>
                <div className="p-4 bg-gray-100 rounded-lg border-l-4 border-gray-400">
                  <p className="text-gray-600 line-through">Leads importantes perdidos na bagunça</p>
                </div>
                <div className="p-4 bg-gray-100 rounded-lg border-l-4 border-gray-400">
                  <p className="text-gray-600 line-through">Respostas lentas e perda de vendas</p>
                </div>
                <div className="p-4 bg-gray-100 rounded-lg border-l-4 border-gray-400">
                  <p className="text-gray-600 line-through">Ansiedade a cada nova notificação</p>
                </div>
                <div className="p-4 bg-gray-100 rounded-lg border-l-4 border-gray-400">
                  <p className="text-gray-600 line-through">Sensação de estar sempre atrasado</p>
                </div>
              </div>
            </div>

            {/* Com a Summi */}
            <div className="text-center">
              <div className="text-6xl mb-6">😎</div>
              <h3 className="text-2xl font-bold text-green-600 mb-8">Com a Summi</h3>
              <div className="space-y-4">
                <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                  <p className="text-green-700 font-semibold">Resumos de áudio lidos em segundos</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                  <p className="text-green-700 font-semibold">Prioridades claras e visão do que importa</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                  <p className="text-green-700 font-semibold">Agilidade para responder e vender mais</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                  <p className="text-green-700 font-semibold">Controle e paz de espírito</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                  <p className="text-green-700 font-semibold">Sensação de estar sempre no comando</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Como Funciona Section */}
      <section id="como-funciona" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Como Funciona</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Em apenas 3 passos simples, você terá sua assistente de IA funcionando no WhatsApp
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Passo 1 */}
            <Card className="text-center border-gray-200 hover:border-green-300 transition-all duration-300 hover:shadow-lg">
              <CardHeader className="pb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <QrCode className="w-8 h-8 text-green-600" />
                </div>
                <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                  1
                </div>
                <CardTitle className="text-gray-900 text-xl">Conecte seu WhatsApp</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600 text-base">
                  Escaneie o QR Code para conectar seu WhatsApp de forma segura com a Summi. É rápido e simples!
                </CardDescription>
              </CardContent>
            </Card>

            {/* Passo 2 */}
            <Card className="text-center border-gray-200 hover:border-green-300 transition-all duration-300 hover:shadow-lg">
              <CardHeader className="pb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Settings className="w-8 h-8 text-green-600" />
                </div>
                <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                  2
                </div>
                <CardTitle className="text-gray-900 text-xl">Configure sua Assistente</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600 text-base">
                  Defina palavras-chave e parâmetros importantes. Ensine a Summi como trabalhar especificamente para você.
                </CardDescription>
              </CardContent>
            </Card>

            {/* Passo 3 */}
            <Card className="text-center border-gray-200 hover:border-green-300 transition-all duration-300 hover:shadow-lg">
              <CardHeader className="pb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-green-600" />
                </div>
                <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                  3
                </div>
                <CardTitle className="text-gray-900 text-xl">Aumente sua Produtividade</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600 text-base">
                  Use o WhatsApp com a Summi como sua assistente pessoal e nunca mais perca mensagens importantes!
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Recursos Section */}
      <section id="recursos" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Recursos</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Nossa assistente Summi analisa suas conversas de WhatsApp e entrega resumos periódicos 
              com as informações mais importantes.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-gray-200 hover:border-green-300 transition-all duration-300 hover:shadow-lg">
              <CardHeader>
                <MessageSquare className="w-12 h-12 text-green-600 mb-4" />
                <CardTitle className="text-gray-900">Resumo de Mensagens Importantes</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600">
                  Receba resumos periódicos das mensagens mais importantes, organizados por temas prioritários.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-gray-200 hover:border-green-300 transition-all duration-300 hover:shadow-lg">
              <CardHeader>
                <Mic className="w-12 h-12 text-green-600 mb-4" />
                <CardTitle className="text-gray-900">Transcrição de Áudios</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600">
                  Transforme automaticamente todos os áudios recebidos em texto para busca e análise posterior.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-gray-200 hover:border-green-300 transition-all duration-300 hover:shadow-lg">
              <CardHeader>
                <FileText className="w-12 h-12 text-green-600 mb-4" />
                <CardTitle className="text-gray-900">Resumo de Áudios</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600">
                  Obtenha resumos inteligentes de mensagens de áudio longas para economizar tempo.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-gray-200 hover:border-green-300 transition-all duration-300 hover:shadow-lg">
              <CardHeader>
                <BarChart3 className="w-12 h-12 text-green-600 mb-4" />
                <CardTitle className="text-gray-900">Análise de Conversas</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600">
                  Acompanhe métricas e estatísticas para otimizar suas interações.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-gray-200 hover:border-green-300 transition-all duration-300 hover:shadow-lg">
              <CardHeader>
                <Bell className="w-12 h-12 text-green-600 mb-4" />
                <CardTitle className="text-gray-900">Alertas Prioritários</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600">
                  Receba notificações para palavras-chave importantes definidas por você.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-gray-200 hover:border-green-300 transition-all duration-300 hover:shadow-lg">
              <CardHeader>
                <Shield className="w-12 h-12 text-green-600 mb-4" />
                <CardTitle className="text-gray-900">Privacidade Garantida</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600">
                  Seus dados são criptografados e nunca compartilhados com terceiros.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Prova Social (Testemunhos) Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Veja quem já retomou o controle do seu WhatsApp
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Testemunho 1 - Empreendedor */}
            <Card className="border-gray-200 hover:border-green-300 transition-all duration-300 hover:shadow-lg bg-white">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-green-600" />
                </div>
                <CardTitle className="text-lg text-gray-900">Ricardo M.</CardTitle>
                <CardDescription className="text-green-600 font-medium">Dono de E-commerce</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-6xl text-green-200 mb-4 text-center">"</div>
                <CardDescription className="text-gray-700 text-center italic text-base leading-relaxed">
                  Eu perdi vendas porque não dava conta do volume. Com a Summi, eu sei exatamente qual lead responder primeiro. Deixou de ser um caos para virar uma máquina de vendas. A paz de espírito não tem preço.
                </CardDescription>
              </CardContent>
            </Card>

            {/* Testemunho 2 - Vendedora */}
            <Card className="border-gray-200 hover:border-green-300 transition-all duration-300 hover:shadow-lg bg-white">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-green-600" />
                </div>
                <CardTitle className="text-lg text-gray-900">Juliana P.</CardTitle>
                <CardDescription className="text-green-600 font-medium">Vendedora Autônoma</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-6xl text-green-200 mb-4 text-center">"</div>
                <CardDescription className="text-gray-700 text-center italic text-base leading-relaxed">
                  Odeio ouvir áudio. Cada minuto era uma comissão que podia estar perdendo. Agora eu leio o resumo em segundos e respondo antes de todo mundo. Minha agilidade, e meu bolso, agradecem.
                </CardDescription>
              </CardContent>
            </Card>

            {/* Testemunho 3 - Profissional Liberal */}
            <Card className="border-gray-200 hover:border-green-300 transition-all duration-300 hover:shadow-lg bg-white">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-green-600" />
                </div>
                <CardTitle className="text-lg text-gray-900">Marcos F.</CardTitle>
                <CardDescription className="text-green-600 font-medium">Arquiteto</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-6xl text-green-200 mb-4 text-center">"</div>
                <CardDescription className="text-gray-700 text-center italic text-base leading-relaxed">
                  Um detalhe perdido num áudio de cliente pode arruinar um projeto. A Summi me dá a segurança de que tudo que foi pedido está registrado e fácil de achar. Passa um profissionalismo enorme.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="precos" className="py-20 bg-green-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Planos Simples e Transparentes
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Escolha o plano ideal para suas necessidades e comece a usar hoje mesmo.
            </p>
            
            {/* Aviso importante sobre teste gratuito */}
            <div className="bg-white border-2 border-green-300 rounded-xl p-6 max-w-3xl mx-auto mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                🚀 Comece Grátis - Sem Riscos!
              </h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center justify-center space-x-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="text-gray-700">30 dias de teste completo</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="text-gray-700">Ativação imediata</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Plano Mensal */}
            <Card className="border-gray-200 hover:shadow-xl transition-all duration-300 relative">
              <CardHeader className="text-center pb-8">
                <CardTitle className="text-2xl text-gray-900">Plano Mensal</CardTitle>
                <div className="mt-6">
                  <span className="text-5xl font-bold text-gray-900">R$ 29,90</span>
                  <span className="text-gray-500 ml-2 text-lg">por mês</span>
                </div>
                <CardDescription className="mt-4 text-gray-600 text-base text-center">Flexibilidade total com pagamento mensal.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center text-sm text-gray-700">
                    <Check className="w-4 h-4 text-green-600 mr-3" />
                    <span>Transcrição de áudio enviado</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-700">
                    <Check className="w-4 h-4 text-green-600 mr-3" />
                    <span>Transcrição de áudio recebido</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-700">
                    <Check className="w-4 h-4 text-green-600 mr-3" />
                    <span>Resumo de áudios longos</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-700">
                    <Check className="w-4 h-4 text-green-600 mr-3" />
                    <span>Análise e resumo de conversas importantes</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-700">
                    <Check className="w-4 h-4 text-green-600 mr-3" />
                    <span>Resumo em áudio das conversas importantes</span>
                  </div>
                  <div className="flex items-center text-sm text-green-700 font-medium">
                    <Check className="w-4 h-4 text-green-600 mr-3" />
                    <span>30 dias para testar</span>
                  </div>
                </div>
                
                <Link to="/register" className="block">
                  <Button className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-3 text-lg">
                    Conectar Agora
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Plano Anual */}
            <Card className="border-green-500 shadow-2xl relative bg-gradient-to-br from-white to-green-50 transform scale-105">
              {/* Badge de melhor oferta */}
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 z-10">
                <Badge className="bg-green-600 text-white px-6 py-2 text-sm font-semibold shadow-lg">
                  🏆 MELHOR OFERTA
                </Badge>
              </div>
              
              {/* Badge de desconto no canto */}
              <div className="absolute top-4 right-4">
                <Badge className="bg-red-500 text-white px-3 py-1 text-xs font-bold">
                  ECONOMIZE 33%
                </Badge>
              </div>

              <CardHeader className="text-center pb-8 pt-8">
                <CardTitle className="text-2xl text-gray-900">Plano Anual</CardTitle>
                <div className="mt-6">
                  <div className="flex items-center justify-center space-x-2">
                    <span className="text-gray-400 line-through text-sm">R$ 29,90</span>
                    <span className="text-5xl font-bold text-green-600">R$ 19,90</span>
                  </div>
                  <span className="text-gray-500 text-lg">por mês</span>
                  
                  <div className="mt-4 p-3 bg-green-100 rounded-lg border border-green-200">
                    <p className="text-green-800 font-semibold text-lg">
                      💰 Economia de R$ 119,88 por ano!
                    </p>
                    <p className="text-green-700 text-sm">
                      Equivale a mais de 4 meses grátis
                    </p>
                  </div>
                </div>
                
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center text-sm text-gray-700">
                    <Check className="w-4 h-4 text-green-600 mr-3" />
                    <span>Transcrição de áudio enviado</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-700">
                    <Check className="w-4 h-4 text-green-600 mr-3" />
                    <span>Transcrição de áudio recebido</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-700">
                    <Check className="w-4 h-4 text-green-600 mr-3" />
                    <span>Resumo de áudios longos</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-700">
                    <Check className="w-4 h-4 text-green-600 mr-3" />
                    <span>Análise e resumo de conversas importantes</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-700">
                    <Check className="w-4 h-4 text-green-600 mr-3" />
                    <span>Resumo em áudio das conversas importantes</span>
                  </div>
                  <div className="flex items-center text-sm text-green-700 font-medium">
                    <Check className="w-4 h-4 text-green-600 mr-3" />
                    <span>30 dias para testar</span>
                  </div>
                  <div className="flex items-center text-sm text-green-700 font-medium">
                    <Check className="w-4 h-4 text-green-600 mr-3" />
                    <span><strong>33% de desconto garantido</strong></span>
                  </div>
                  <div className="flex items-center text-sm text-green-700 font-medium">
                    <Check className="w-4 h-4 text-green-600 mr-3" />
                    <span>🎁 Suporte premium prioritário</span>
                  </div>
                </div>
                
                <Link to="/register" className="block">
                  <Button className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-lg shadow-lg transform hover:scale-[1.02] transition-all">
                    Conectar Agora
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Informações adicionais aprimoradas */}
          <div className="text-center mt-12 space-y-6">
            <p className="text-gray-500">
              💳 Aceitamos todos os cartões de crédito • 🔐 Pagamento 100% seguro via Stripe
            </p>
            
            <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500">
              <div className="flex items-center">
                <Check className="w-4 h-4 text-green-600 mr-2" />
                Ativação imediata
              </div>
              <div className="flex items-center">
                <Check className="w-4 h-4 text-green-600 mr-2" />
                Suporte em português
              </div>
              <div className="flex items-center">
                <Check className="w-4 h-4 text-green-600 mr-2" />
                Sem compromisso
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Perguntas Frequentes
            </h2>
            <p className="text-xl text-gray-600">
              Tire suas dúvidas sobre o Summi e como nossa IA pode transformar sua gestão do WhatsApp.
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="item-1" className="border border-gray-200 rounded-lg px-6">
              <AccordionTrigger className="text-left hover:no-underline">
                <span className="text-lg font-medium text-gray-900">
                  A Summi é segura? Minhas conversas ficam protegidas?
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-gray-600 pb-4">
                Sim! A segurança dos seus dados é nossa prioridade máxima. Utilizamos criptografia de ponta a ponta, 
                não armazenamos o conteúdo das suas mensagens permanentemente, e seguimos rigorosamente as diretrizes 
                da LGPD. Seus dados jamais são compartilhados com terceiros e você tem controle total sobre suas informações.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="border border-gray-200 rounded-lg px-6">
              <AccordionTrigger className="text-left hover:no-underline">
                <span className="text-lg font-medium text-gray-900">
                  É complicado de instalar? Preciso entender de tecnologia?
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-gray-600 pb-4">
                Não! A instalação é super simples e leva apenas alguns minutos. Você só precisa escanear um QR Code 
                (igual ao WhatsApp Web) e seguir algumas etapas básicas de configuração. Nossa interface é intuitiva 
                e oferecemos suporte completo durante todo o processo.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="border border-gray-200 rounded-lg px-6">
              <AccordionTrigger className="text-left hover:no-underline">
                <span className="text-lg font-medium text-gray-900">
                  Funciona no meu celular e no WhatsApp Business?
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-gray-600 pb-4">
                Sim! A Summi é totalmente compatível com WhatsApp pessoal e WhatsApp Business. Funciona em qualquer 
                dispositivo através do navegador - você não precisa instalar nenhum aplicativo adicional no seu celular. 
                É perfeito para quem usa o WhatsApp Business profissionalmente.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="border border-gray-200 rounded-lg px-6">
              <AccordionTrigger className="text-left hover:no-underline">
                <span className="text-lg font-medium text-gray-900">
                  O que acontece depois que o teste grátis acaba?
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-gray-600 pb-4">
                Após os 30 dias de teste gratuito, você pode escolher um dos nossos planos ou simplesmente não fazer nada 
                - não cobramos automaticamente. Se decidir continuar, você escolhe entre o plano mensal (R$ 29,90) ou 
                anual (R$ 19,90/mês) com 33% de desconto.
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="text-center mt-12">
            <p className="text-gray-600 mb-6">
              Ainda tem dúvidas? Entre em contato conosco!
            </p>
            <Link to="/register">
              <Button size="lg" className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white">
                Conectar Agora
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-white py-16 bg-emerald-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8">
                  <img src="/lovable-uploads/8d37281c-dfb2-4e98-93c9-888cccd6a706.png" alt="Summi Logo" className="w-full h-full object-contain" />
                </div>
                <span className="text-xl font-bold">Summi</span>
              </div>
              <p className="text-gray-400">
                Sua assistente de IA para WhatsApp Business.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Links Rápidos</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#recursos" className="hover:text-white transition-colors">Funcionalidades</a></li>
                <li><a href="#precos" className="hover:text-white transition-colors">Planos</a></li>
                <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Produto</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#como-funciona" className="hover:text-white transition-colors">Como Funciona</a></li>
                <li><a href="#recursos" className="hover:text-white transition-colors">Recursos</a></li>
                <li><Link to="/register" className="hover:text-white transition-colors">Conectar Agora</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/terms" className="hover:text-white transition-colors">Termos de Uso</Link></li>
                <li><Link to="/privacy" className="hover:text-white transition-colors">Política de Privacidade</Link></li>
                <li><Link to="/lgpd" className="hover:text-white transition-colors">LGPD</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2025 Summi. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
