
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const LandingPage = () => {
  const features = [
    {
      icon: '🤖',
      title: 'Assistente IA 24/7',
      description: 'Sua assistente virtual responde clientes automaticamente, qualifica leads e nunca dorme.'
    },
    {
      icon: '🎯',
      title: 'Qualificação Inteligente',
      description: 'Coleta informações dos clientes automaticamente e prioriza leads quentes para sua equipe.'
    },
    {
      icon: '📊',
      title: 'Dashboard em Tempo Real',
      description: 'Acompanhe todas as conversas, métricas e performance do seu atendimento em um só lugar.'
    },
    {
      icon: '🔗',
      title: 'Integração Simples',
      description: 'Conecta com seu WhatsApp Business em segundos. Sem configurações complexas.'
    }
  ];

  const testimonials = [
    {
      name: 'Carlos Silva',
      company: 'Distribuidora Elétrica Silva',
      text: 'A Summi aumentou nossa conversão em 40% e nossa equipe economiza 15 horas por semana.',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
    },
    {
      name: 'Marina Santos',
      company: 'Materiais de Construção Santos',
      text: 'Nossos clientes adoram o atendimento rápido. A Summi nunca deixa ninguém sem resposta.',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b4e0?w=150'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-summi-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-summi-blue rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <span className="text-xl font-bold text-summi-blue">Summi</span>
            </div>
            
            <nav className="hidden md:flex space-x-8">
              <a href="#recursos" className="text-summi-gray-600 hover:text-summi-blue transition-colors">
                Recursos
              </a>
              <a href="#como-funciona" className="text-summi-gray-600 hover:text-summi-blue transition-colors">
                Como Funciona
              </a>
              <a href="#depoimentos" className="text-summi-gray-600 hover:text-summi-blue transition-colors">
                Depoimentos
              </a>
            </nav>
            
            <Link to="/login">
              <Button variant="outline" className="border-summi-blue text-summi-blue hover:bg-summi-blue hover:text-white">
                Entrar
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="gradient-bg text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="animate-fade-in">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Sua Assistente de IA<br />
              <span className="text-summi-green">para WhatsApp Business</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100 max-w-3xl mx-auto">
              Automatize seu atendimento, qualifique leads 24/7 e aumente suas vendas 
              com a assistente virtual mais inteligente do mercado
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <Button size="lg" className="bg-summi-green hover:bg-summi-green-dark text-white px-8 py-4 text-lg">
                  🚀 Começar Grátis Agora
                </Button>
              </Link>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-white text-white hover:bg-white hover:text-summi-blue px-8 py-4 text-lg"
              >
                📱 Ver Como Funciona
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="recursos" className="py-20 bg-summi-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-summi-gray-900 mb-4">
              Tudo que você precisa para
              <span className="text-gradient"> vender mais</span>
            </h2>
            <p className="text-xl text-summi-gray-600 max-w-2xl mx-auto">
              Uma assistente virtual completa que trabalha 24/7 para o seu negócio
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div 
                key={feature.title}
                className={`bg-white p-6 rounded-xl shadow-lg card-hover animate-fade-in`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-summi-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-summi-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="como-funciona" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-summi-gray-900 mb-4">
              Como a Summi funciona
            </h2>
            <p className="text-xl text-summi-gray-600">
              Simples, rápido e eficiente
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-summi-blue rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-xl">1</span>
              </div>
              <h3 className="text-xl font-semibold text-summi-gray-900 mb-3">
                Conecte seu WhatsApp
              </h3>
              <p className="text-summi-gray-600">
                Escaneie um QR Code e pronto! Sua Summi está conectada ao seu WhatsApp Business.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-summi-blue rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-xl">2</span>
              </div>
              <h3 className="text-xl font-semibold text-summi-gray-900 mb-3">
                Configure sua assistente
              </h3>
              <p className="text-summi-gray-600">
                Defina suas preferências e deixe a IA aprender sobre seu negócio automaticamente.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-summi-green rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-xl">3</span>
              </div>
              <h3 className="text-xl font-semibold text-summi-gray-900 mb-3">
                Venda mais automaticamente
              </h3>
              <p className="text-summi-gray-600">
                Sua assistente responde clientes, qualifica leads e melhora suas vendas 24/7.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="depoimentos" className="py-20 bg-summi-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-summi-gray-900 mb-4">
              Empresas que confiam na Summi
            </h2>
            <p className="text-xl text-summi-gray-600">
              Veja o que nossos clientes dizem sobre os resultados
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <div 
                key={testimonial.name}
                className={`bg-white p-6 rounded-xl shadow-lg animate-fade-in`}
                style={{ animationDelay: `${index * 200}ms` }}
              >
                <p className="text-summi-gray-700 mb-4 italic text-lg">
                  "{testimonial.text}"
                </p>
                <div className="flex items-center space-x-3">
                  <img 
                    src={testimonial.avatar} 
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-semibold text-summi-gray-900">{testimonial.name}</p>
                    <p className="text-summi-gray-600">{testimonial.company}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="gradient-bg text-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Pronto para ter sua assistente de IA?
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            Junte-se a centenas de empresas que já automatizaram suas vendas com a Summi
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <Button size="lg" className="bg-summi-green hover:bg-summi-green-dark text-white px-8 py-4 text-lg">
                Começar Agora - É Grátis!
              </Button>
            </Link>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-white text-white hover:bg-white hover:text-summi-blue px-8 py-4 text-lg"
            >
              Falar com Especialista
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-summi-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-summi-blue rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">S</span>
                </div>
                <span className="text-xl font-bold">Summi</span>
              </div>
              <p className="text-summi-gray-400">
                Sua assistente de IA para WhatsApp Business. Automatize vendas, qualifique leads e atenda 24/7.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Produto</h4>
              <ul className="space-y-2 text-summi-gray-400">
                <li><a href="#recursos" className="hover:text-white transition-colors">Recursos</a></li>
                <li><a href="#como-funciona" className="hover:text-white transition-colors">Como Funciona</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integrações</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Suporte</h4>
              <ul className="space-y-2 text-summi-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Central de Ajuda</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contato</a></li>
                <li><a href="#" className="hover:text-white transition-colors">WhatsApp</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-summi-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Privacidade</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Termos de Uso</a></li>
                <li><a href="#" className="hover:text-white transition-colors">LGPD</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-summi-gray-700 pt-8 mt-8 text-center text-summi-gray-400">
            <p>&copy; 2024 Summi. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
