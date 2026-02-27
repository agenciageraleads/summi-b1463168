
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminStats } from '@/hooks/useAdmin';
import { Users, UserCheck, Clock, Wifi, WifiOff, MessageSquare, MessageCircle } from 'lucide-react';

interface StatsCardsProps {
  stats: AdminStats;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  const cards = [
    {
      title: 'Total de Usuários',
      value: stats.totalUsers,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Assinantes Ativos',
      value: stats.totalSubscribers,
      icon: UserCheck,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Em Trial',
      value: stats.trialUsers,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
    {
      title: 'Conectados',
      value: stats.connectedUsers,
      icon: Wifi,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
    },
    {
      title: 'Desconectados',
      value: stats.disconnectedUsers,
      icon: WifiOff,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
    {
      title: 'Total de Chats',
      value: stats.totalChats,
      icon: MessageSquare,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
    },
    {
      title: 'Feedbacks',
      value: stats.totalFeedback,
      icon: MessageCircle,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {card.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {card.value.toLocaleString('pt-BR')}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
