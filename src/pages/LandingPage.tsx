
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const LandingPage = () => {
  const features = [
    {
      icon: '🤖',
      title: 'Automação de Respostas',
      description: 'Resposta inteligente 24/7 para seus clientes no WhatsApp com IA avançada.'
    },
    {
      icon: '🎯',
      title: 'Qualificação de Leads',
      description: 'Coleta dados automaticamente e pontua leads para otimizar suas vendas.'
    },
    {
      icon: '📊',
      title: 'Relatórios em Tempo Real',
      description: 'Acompanhe métricas de conversão, NPS e performance em tempo real.'
    },
    {
      icon: '🔗',
      title: 'Integrações',
      description: 'Conecte facilmente com seu CRM via API, webhooks e ferramentas existentes.'
    }
  ];

  const testimonials = [
    {
      name: 'Carlos Silva',
      company: 'TechStart Ltda',
      text: 'A Summi aumentou nossa conversão em 40% e economizou 15 horas semanais da equipe.',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
    },
    {
      name: 'Marina Santos',
      company: 'Digital Solutions',
      text: 'Implementação rápida e resultados imediatos. Nossos clientes adoram o atendimento.',
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
              <a href="#precos" className="text-summi-gray-600 hover:text-summi-blue transition-colors">
                Preços
              </a>
              <a href="#suporte" className="text-summi-gray-600 hover:text-summi-blue transition-colors">
                Suporte
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
              Automatize seu WhatsApp<br />
              <span className="text-summi-green">e Multiplique suas Vendas</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100 max-w-3xl mx-auto">
              Summi é sua assistente de IA que qualifica leads, responde clientes 24/7 
              e integra perfeitamente com seu CRM
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <Button size="lg" className="bg-summi-green hover:bg-summi-green-dark text-white px-8 py-4 text-lg">
                  🚀 Teste Grátis por 14 Dias
                </Button>
              </Link>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-white text-white hover:bg-white hover:text-summi-blue px-8 py-4 text-lg"
              >
                📹 Ver Demo
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
              Recursos inteligentes que transformam conversas em vendas
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

      {/* Testimonials */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-summi-gray-900 mb-4">
              Empresas que confiam na Summi
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <div 
                key={testimonial.name}
                className={`bg-summi-gray-50 p-6 rounded-xl animate-fade-in`}
                style={{ animationDelay: `${index * 200}ms` }}
              >
                <p className="text-summi-gray-700 mb-4 italic">
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
            Pronto para revolucionar seu atendimento?
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            Junte-se a centenas de empresas que já automatizaram suas vendas
          </p>
          <Link to="/register">
            <Button size="lg" className="bg-summi-green hover:bg-summi-green-dark text-white px-8 py-4 text-lg">
              Começar Agora - É Grátis!
            </Button>
          </Link>
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
                Automatização inteligente para WhatsApp Business
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Produto</h4>
              <ul className="space-y-2 text-summi-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Recursos</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Preços</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Suporte</h4>
              <ul className="space-y-2 text-summi-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Central de Ajuda</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contato</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-summi-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Privacidade</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Termos</a></li>
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
