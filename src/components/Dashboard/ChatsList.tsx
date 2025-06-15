
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MessageCircle, Clock, AlertCircle, MessageSquare, RotateCcw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMessageAnalysis } from '@/hooks/useMessageAnalysis';

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
  const { isAnalyzing, startAnalysis } = useMessageAnalysis();
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchChats = async () => {
    if (!user) return;

    try {
      console.log('[CHATS] Buscando TODOS os chats para usuário:', user.id);
      
      // Buscar TODOS os chats (removido o filtro de prioridade)
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('id_usuario', user.id)
        .order('modificado_em', { ascending: false })
        .limit(20); // Aumentar limite já que vamos mostrar todos

      if (error) {
        console.error('[CHATS] Erro ao buscar chats:', error);
        return;
      }

      console.log('[CHATS] Dados brutos retornados:', data);

      // Transformar dados sem mexer na conversa
      const transformedData = (data || []).map(chat => ({
        ...chat,
        prioridade: chat.prioridade || '0'
      }));

      // Ordenar: Com prioridade primeiro, depois por data
      const sortedChats = transformedData.sort((a, b) => {
        const priorityA = parseInt(a.prioridade);
        const priorityB = parseInt(b.prioridade);
        
        // Se ambos têm prioridade, ordenar por prioridade
        if (priorityA > 0 && priorityB > 0) {
          const getOrder = (priority: number) => {
            if (priority === 3) return 3; // Urgente
            if (priority === 2) return 2; // Importante
            return 1; // Não importante (0 ou 1)
          };
          
          return getOrder(priorityB) - getOrder(priorityA);
        }
        
        // Se apenas um tem prioridade, ele vem primeiro
        if (priorityA > 0 && priorityB === 0) return -1;
        if (priorityB > 0 && priorityA === 0) return 1;
        
        // Se nenhum tem prioridade, ordenar por data
        return new Date(b.modificado_em).getTime() - new Date(a.modificado_em).getTime();
      });

      setChats(sortedChats);
      console.log('[CHATS] Carregados', sortedChats.length, 'chats ordenados');
    } catch (error) {
      console.error('[CHATS] Erro inesperado:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChats();
  }, [user]);

  // Função para chamar análise e recarregar após conclusão
  const handleAnalyzeMessages = () => {
    startAnalysis(() => {
      // Callback executado após 60s - recarregar chats
      fetchChats();
    });
  };

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
    } else if (priority === 1) {
      return {
        label: 'Não Importante',
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: <MessageCircle className="w-3 h-3" />
      };
    } else {
      return {
        label: 'Não Analisada',
        color: 'bg-blue-100 text-blue-800 border-blue-200',
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
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageCircle className="w-5 h-5" />
              <span>Mensagens Recentes</span>
            </div>
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
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageCircle className="w-5 h-5" />
              <span>Mensagens Recentes</span>
            </div>
            <Button
              onClick={handleAnalyzeMessages}
              disabled={isAnalyzing}
              size="sm"
              variant="outline"
              className="flex items-center space-x-2"
            >
              <RotateCcw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
              <span>{isAnalyzing ? 'Analisando...' : 'Analisar Mensagens'}</span>
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">Nenhuma mensagem encontrada</p>
            <p className="text-sm text-gray-400 mt-1">
              Clique em "Analisar Mensagens" para classificar suas conversas
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MessageCircle className="w-5 h-5" />
            <span>Mensagens Recentes</span>
          </div>
          <Button
            onClick={handleAnalyzeMessages}
            disabled={isAnalyzing}
            size="sm"
            variant="outline"
            className="flex items-center space-x-2"
          >
            <RotateCcw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span>{isAnalyzing ? 'Analisando...' : 'Analisar Mensagens'}</span>
          </Button>
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
                  className="p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-sm">{chat.nome}</span>
                      <Badge className={`text-xs ${priorityInfo.color}`}>
                        <div className="flex items-center space-x-1">
                          {priorityInfo.icon}
                          <span>{priorityInfo.label}</span>
                        </div>
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex items-center space-x-1 text-xs px-2 py-1 h-auto"
                      onClick={() => window.open(`https://wa.me/${whatsappNumber}`, '_blank')}
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>Responder</span>
                    </Button>
                  </div>
                  
                  {chat.contexto && (
                    <div className="mb-2">
                      <p className="text-xs text-gray-700 bg-gray-50 p-2 rounded border-l-2 border-gray-300 line-clamp-2">
                        {chat.contexto}
                      </p>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{formattedNumber}</span>
                    <span>
                      {formatDistanceToNow(new Date(chat.modificado_em), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
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
