
// ABOUTME: Landing page da Summi com foco na funcionalidade principal do WhatsApp.
// ABOUTME: Interface limpa sem menções a trial, seguindo modelo "ziptalk".

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Shield, Zap, Clock, CheckCircle, ArrowRight } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

const LandingPage = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-gradient-to-br from-summi-green/5 to-summi-secondary/5">
      {/* Header Navigation */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-summi-green/20 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-summi-gradient rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-summi-gray-900">Summi</span>
          </div>

          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/login')}
              className="text-summi-gray-700 hover:text-summi-green"
            >
              Entrar
            </Button>
            <Button 
              onClick={() => navigate('/register')}
              className="bg-summi-gradient hover:opacity-90 text-white"
            >
              Começar Agora
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section - Mobile Optimized */}
      <section className="py-12 md:py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto">
            
            {/* Main Headline */}
            <h1 className={`font-bold text-summi-gray-900 mb-4 ${
              isMobile ? 'text-3xl leading-tight' : 'text-5xl md:text-6xl'
            }`}>
              Transforme suas conversas do{' '}
              <span className="bg-summi-gradient bg-clip-text text-transparent">
                WhatsApp
              </span>
              {' '}em insights
            </h1>

            {/* Subtitle */}
            <p className={`text-summi-gray-600 mb-8 ${
              isMobile ? 'text-lg px-2' : 'text-xl max-w-3xl mx-auto'
            }`}>
              Conecte seu WhatsApp e tenha análises inteligentes das suas conversas
            </p>

            {/* Primary CTA - Prominent on Mobile */}
            <div className={`mb-12 ${isMobile ? 'px-4' : ''}`}>
              <Button 
                onClick={() => navigate('/register')}
                className={`bg-summi-gradient hover:opacity-90 text-white font-semibold shadow-lg hover:shadow-xl transition-all ${
                  isMobile ? 'w-full py-4 text-lg' : 'px-8 py-4 text-lg'
                }`}
              >
                Conectar WhatsApp Agora
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>

            {/* Value Highlights - Compact on Mobile */}
            <div className={`grid gap-6 mb-16 ${
              isMobile ? 'grid-cols-1 px-4' : 'md:grid-cols-3'
            }`}>
              <div className="flex items-center justify-center space-x-3 p-4 bg-white/60 rounded-lg border border-summi-green/20">
                <div className="w-10 h-10 bg-summi-green/10 rounded-full flex items-center justify-center">
                  <Zap className="w-5 h-5 text-summi-green" />
                </div>
                <span className="font-medium text-summi-gray-800">
                  Análise Automática
                </span>
              </div>

              <div className="flex items-center justify-center space-x-3 p-4 bg-white/60 rounded-lg border border-summi-green/20">
                <div className="w-10 h-10 bg-summi-green/10 rounded-full flex items-center justify-center">
                  <Shield className="w-5 h-5 text-summi-green" />
                </div>
                <span className="font-medium text-summi-gray-800">
                  100% Seguro
                </span>
              </div>

              <div className="flex items-center justify-center space-x-3 p-4 bg-white/60 rounded-lg border border-summi-green/20">
                <div className="w-10 h-10 bg-summi-green/10 rounded-full flex items-center justify-center">
                  <Clock className="w-5 h-5 text-summi-green" />
                </div>
                <span className="font-medium text-summi-gray-800">
                  Tempo Real
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-white/60">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-summi-gray-900 mb-4">
              Como Funciona
            </h2>
            <p className="text-xl text-summi-gray-600 max-w-2xl mx-auto">
              Três passos simples para começar a usar
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <Card className="text-center border-summi-green/20 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-summi-gradient rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-lg">1</span>
                </div>
                <h3 className="font-semibold text-summi-gray-900 mb-2">Criar Conta</h3>
                <p className="text-summi-gray-600">
                  Cadastre-se com seu email
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-summi-green/20 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-summi-gradient rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-lg">2</span>
                </div>
                <h3 className="font-semibold text-summi-gray-900 mb-2">Conectar WhatsApp</h3>
                <p className="text-summi-gray-600">
                  Escaneie o QR Code para conectar
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-summi-green/20 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-summi-gradient rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-lg">3</span>
                </div>
                <h3 className="font-semibold text-summi-gray-900 mb-2">Receber Insights</h3>
                <p className="text-summi-gray-600">
                  Veja análises das suas conversas
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-summi-gray-900 mb-4">
              Recursos Principais
            </h2>
            <p className="text-xl text-summi-gray-600">
              Tudo que você precisa para entender suas conversas
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-summi-green/20 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <MessageSquare className="w-8 h-8 text-summi-green mb-4" />
                <h3 className="font-semibold text-summi-gray-900 mb-2">
                  Análise de Conversas
                </h3>
                <p className="text-summi-gray-600">
                  Identifique padrões e tendências nas suas mensagens
                </p>
              </CardContent>
            </Card>

            <Card className="border-summi-green/20 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <Zap className="w-8 h-8 text-summi-green mb-4" />
                <h3 className="font-semibold text-summi-gray-900 mb-2">
                  Processamento Automático
                </h3>
                <p className="text-summi-gray-600">
                  Análise em tempo real das mensagens recebidas
                </p>
              </CardContent>
            </Card>

            <Card className="border-summi-green/20 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <Shield className="w-8 h-8 text-summi-green mb-4" />
                <h3 className="font-semibold text-summi-gray-900 mb-2">
                  Segurança Total
                </h3>
                <p className="text-summi-gray-600">
                  Seus dados são protegidos com criptografia de ponta
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-summi-gradient text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Pronto para começar?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Conecte seu WhatsApp e descubra insights valiosos
          </p>
          <Button 
            onClick={() => navigate('/register')}
            variant="secondary"
            className="bg-white text-summi-green hover:bg-gray-50 px-8 py-3 text-lg font-semibold"
          >
            Começar Agora
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-summi-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-summi-gradient rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">Summi</span>
              </div>
              <p className="text-gray-400">
                Análise inteligente de conversas do WhatsApp
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Produto</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Recursos</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Como Funciona</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Empresa</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Sobre</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <button 
                    onClick={() => navigate('/privacy')}
                    className="hover:text-white transition-colors"
                  >
                    Privacidade
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => navigate('/lgpd')}
                    className="hover:text-white transition-colors"
                  >
                    LGPD
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => navigate('/terms')}
                    className="hover:text-white transition-colors"
                  >
                    Termos
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 Summi. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
