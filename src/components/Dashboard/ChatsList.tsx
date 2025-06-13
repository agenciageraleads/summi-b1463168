import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MessageCircle, Clock, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Chat {
  id: string;
  nome: string;
  remote_jid: string;
  prioridade: string; // Alterado para aceitar qualquer string
  conversa: any[];
  modificado_em: string;
  contexto?: string;
}

export const ChatsList = () => {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchChats = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('id_usuario', user.id)
        .order('modificado_em', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Erro ao buscar chats:', error);
        return;
      }

      // Transformar dados para garantir tipos corretos
      const transformedData = (data || []).map(chat => ({
        ...chat,
        conversa: Array.isArray(chat.conversa) ? chat.conversa : [],
        prioridade: chat.prioridade || 'normal' // Garantir que sempre tenha um valor
      }));

      setChats(transformedData);
    } catch (error) {
      console.error('Erro inesperado ao buscar chats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChats();
  }, [user]);

  // Função para normalizar prioridade para os valores esperados
  const normalizePriority = (prioridade: string): 'urgente' | 'importante' | 'normal' => {
    const normalized = prioridade.toLowerCase();
    if (normalized === 'urgente') return 'urgente';
    if (normalized === 'importante') return 'importante';
    return 'normal';
  };

  const getPriorityColor = (prioridade: string) => {
    const normalized = normalizePriority(prioridade);
    switch (normalized) {
      case 'urgente':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'importante':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityIcon = (prioridade: string) => {
    const normalized = normalizePriority(prioridade);
    switch (normalized) {
      case 'urgente':
        return <AlertCircle className="w-3 h-3" />;
      case 'importante':
        return <Clock className="w-3 h-3" />;
      default:
        return <MessageCircle className="w-3 h-3" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageCircle className="w-5 h-5" />
            <span>Mensagens Recentes</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (chats.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageCircle className="w-5 h-5" />
            <span>Mensagens Recentes</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">Nenhuma mensagem encontrada</p>
            <p className="text-sm text-gray-400 mt-1">
              Conecte seu WhatsApp para ver as mensagens
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MessageCircle className="w-5 h-5" />
          <span>Mensagens Recentes</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-3">
            {chats.map((chat) => (
              <div
                key={chat.id}
                className="p-3 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-sm">{chat.nome}</span>
                    <Badge className={`text-xs ${getPriorityColor(chat.prioridade)}`}>
                      <div className="flex items-center space-x-1">
                        {getPriorityIcon(chat.prioridade)}
                        <span className="capitalize">{normalizePriority(chat.prioridade)}</span>
                      </div>
                    </Badge>
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(chat.modificado_em), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </span>
                </div>
                
                {chat.contexto && (
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {chat.contexto}
                  </p>
                )}
                
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500">
                    {chat.conversa?.length || 0} mensagem(s)
                  </span>
                  <span className="text-xs text-gray-400">
                    {chat.remote_jid}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
