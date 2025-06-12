
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const DashboardPage = () => {
  // Mock data for the chart
  const chartData = [
    { day: 'Dom', messages: 45 },
    { day: 'Seg', messages: 92 },
    { day: 'Ter', messages: 156 },
    { day: 'Qua', messages: 178 },
    { day: 'Qui', messages: 134 },
    { day: 'Sex', messages: 189 },
    { day: 'Sáb', messages: 67 },
  ];

  const metrics = [
    {
      title: 'Conversas Ativas',
      value: '23',
      change: '+15%',
      changeType: 'positive',
      icon: '💬'
    },
    {
      title: 'Leads Qualificados',
      value: '47',
      change: '+23%',
      changeType: 'positive',
      icon: '🎯'
    },
    {
      title: 'Tempo Médio de Resposta',
      value: '1.2s',
      change: '-12%',
      changeType: 'positive',
      icon: '⚡'
    },
    {
      title: 'NPS Score',
      value: '8.7',
      change: '+0.3',
      changeType: 'positive',
      icon: '⭐'
    }
  ];

  const recentConversations = [
    {
      id: 1,
      name: 'Carlos Silva',
      phone: '(11) 99999-1234',
      status: 'qualificada',
      lastMessage: 'Tenho interesse no plano Pro',
      time: '2 min',
      score: 85
    },
    {
      id: 2,
      name: 'Marina Santos',
      phone: '(21) 98888-5678',
      status: 'aberta',
      lastMessage: 'Qual o preço do serviço?',
      time: '5 min',
      score: 72
    },
    {
      id: 3,
      name: 'João Oliveira',
      phone: '(31) 97777-9012',
      status: 'encerrada',
      lastMessage: 'Obrigado pelo atendimento!',
      time: '1h',
      score: 45
    },
    {
      id: 4,
      name: 'Ana Costa',
      phone: '(41) 96666-3456',
      status: 'qualificada',
      lastMessage: 'Posso agendar uma demonstração?',
      time: '2h',
      score: 91
    },
    {
      id: 5,
      name: 'Pedro Lima',
      phone: '(51) 95555-7890',
      status: 'aberta',
      lastMessage: 'Preciso de mais informações',
      time: '3h',
      score: 68
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'qualificada':
        return 'bg-summi-green text-white';
      case 'aberta':
        return 'bg-yellow-500 text-white';
      case 'encerrada':
        return 'bg-summi-gray-500 text-white';
      default:
        return 'bg-summi-gray-300 text-summi-gray-700';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-summi-green font-semibold';
    if (score >= 60) return 'text-yellow-600 font-semibold';
    return 'text-red-500 font-semibold';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((metric, index) => (
            <Card key={metric.title} className="card-hover" style={{ animationDelay: `${index * 100}ms` }}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-summi-gray-600">{metric.title}</p>
                    <p className="text-2xl font-bold text-summi-gray-900">{metric.value}</p>
                    <p className={`text-sm ${
                      metric.changeType === 'positive' ? 'text-summi-green' : 'text-red-500'
                    }`}>
                      {metric.change} vs. semana passada
                    </p>
                  </div>
                  <div className="text-3xl">{metric.icon}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Chart */}
        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>📈</span>
              <span>Volume de Mensagens - Últimos 7 dias</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="day" 
                    stroke="#64748b"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="#64748b"
                    fontSize={12}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="messages" 
                    stroke="#004AAD" 
                    strokeWidth={3}
                    dot={{ fill: '#004AAD', strokeWidth: 2, r: 6 }}
                    activeDot={{ r: 8, fill: '#00B074' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Conversations */}
        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span>💬</span>
                <span>Conversas Recentes</span>
              </div>
              <button className="text-summi-blue hover:text-summi-blue-dark text-sm font-medium">
                Ver todas →
              </button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentConversations.map((conversation, index) => (
                <div 
                  key={conversation.id}
                  className="flex items-center justify-between p-4 bg-summi-gray-50 rounded-lg hover:bg-summi-gray-100 transition-colors cursor-pointer"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="w-10 h-10 bg-summi-blue rounded-full flex items-center justify-center">
                      <span className="text-white font-medium text-sm">
                        {conversation.name.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-summi-gray-900">{conversation.name}</h4>
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(conversation.status)}`}>
                          {conversation.status}
                        </span>
                      </div>
                      <p className="text-sm text-summi-gray-600">{conversation.phone}</p>
                      <p className="text-sm text-summi-gray-700 mt-1">{conversation.lastMessage}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-summi-gray-500">{conversation.time}</p>
                    <p className={`text-sm font-medium ${getScoreColor(conversation.score)}`}>
                      Score: {conversation.score}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default DashboardPage;
