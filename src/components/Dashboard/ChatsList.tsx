
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MessageCircle, Clock, AlertCircle, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Chat {
  id: string;
  nome: string;
  remote_jid: string;
  prioridade: string;
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
      // Buscar apenas chats que foram analisados (prioridade não é null)
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('id_usuario', user.id)
        .not('prioridade', 'is', null) // Filtrar apenas os analisados
        .order('prioridade', { ascending: false }) // Ordenar por prioridade (descrescente)
        .order('modificado_em', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Erro ao buscar chats:', error);
        return;
      }

      // Transformar dados e ordenar por prioridade customizada
      const transformedData = (data || []).map(chat => ({
        ...chat,
        conversa: Array.isArray(chat.conversa) ? chat.conversa : [],
        prioridade: chat.prioridade || '0'
      }));

      // Ordenar: 3 (urgente), 2 (importante), 0-1 (não importante)
      const sortedChats = transformedData.sort((a, b) => {
        const priorityA = parseInt(a.prioridade);
        const priorityB = parseInt(b.prioridade);
        
        // Mapear prioridades para ordem de classificação
        const getOrder = (priority: number) => {
          if (priority === 3) return 3; // Urgente
          if (priority === 2) return 2; // Importante
          return 1; // Não importante (0 ou 1)
        };
        
        return getOrder(priorityB) - getOrder(priorityA);
      });

      setChats(sortedChats);
    } catch (error) {
      console.error('Erro inesperado ao buscar chats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChats();
  }, [user]);

  // Função para classificar prioridade baseada no valor numérico
  const getPriorityInfo = (prioridade: string) => {
    const priority = parseInt(prioridade);
    
    if (priority === 3) {
      return {
        label: 'Urgente',
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: <AlertCircle className="w-3 h-3" />
      };
    } else if (priority === 2) {
      return {
        label: 'Importante',
        color: 'bg-amber-100 text-amber-800 border-amber-200',
        icon: <Clock className="w-3 h-3" />
      };
    } else {
      return {
        label: 'Não Importante',
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: <MessageCircle className="w-3 h-3" />
      };
    }
  };

  // Função para formatar número de telefone
  const formatPhoneNumber = (remoteJid: string) => {
    // Extrair apenas os números do remote_jid
    const numbers = remoteJid.replace(/\D/g, '');
    
    // Se tem 13 dígitos (55 + DDD + número), formatar como brasileiro
    if (numbers.length === 13 && numbers.startsWith('55')) {
      const ddd = numbers.slice(2, 4);
      const firstPart = numbers.slice(4, 9);
      const secondPart = numbers.slice(9, 13);
      return `+55 (${ddd}) ${firstPart}-${secondPart}`;
    }
    
    // Se tem 12 dígitos (55 + DDD + número sem 9), formatar como brasileiro
    if (numbers.length === 12 && numbers.startsWith('55')) {
      const ddd = numbers.slice(2, 4);
      const firstPart = numbers.slice(4, 8);
      const secondPart = numbers.slice(8, 12);
      return `+55 (${ddd}) ${firstPart}-${secondPart}`;
    }
    
    // Para outros formatos, retornar com + no início
    return `+${numbers}`;
  };

  // Função para extrair número limpo para WhatsApp
  const getWhatsAppNumber = (remoteJid: string) => {
    return remoteJid.replace(/\D/g, '');
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
            <p className="text-gray-500">Nenhuma mensagem analisada encontrada</p>
            <p className="text-sm text-gray-400 mt-1">
              Aguarde a análise das mensagens para vê-las aqui
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
            {chats.map((chat) => {
              const priorityInfo = getPriorityInfo(chat.prioridade);
              const formattedNumber = formatPhoneNumber(chat.remote_jid);
              const whatsappNumber = getWhatsAppNumber(chat.remote_jid);
              
              return (
                <div
                  key={chat.id}
                  className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-sm">{chat.nome}</span>
                      <Badge className={`text-xs ${priorityInfo.color}`}>
                        <div className="flex items-center space-x-1">
                          {priorityInfo.icon}
                          <span>{priorityInfo.label}</span>
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
                  
                  {/* Contexto da conversa */}
                  {chat.contexto && (
                    <div className="mb-3">
                      <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded border-l-2 border-gray-300">
                        {chat.contexto}
                      </p>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col space-y-1">
                      <span className="text-xs text-gray-500">
                        {formattedNumber}
                      </span>
                      <span className="text-xs text-gray-400">
                        {chat.conversa?.length || 0} mensagem(s)
                      </span>
                    </div>
                    
                    {/* Botão de responder */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex items-center space-x-1"
                      onClick={() => window.open(`https://wa.me/${whatsappNumber}`, '_blank')}
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>Responder</span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
