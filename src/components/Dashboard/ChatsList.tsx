
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { Chat } from '@/hooks/useChats';
import { MessageCircle, Clock, AlertCircle, MessageSquare, RotateCcw, Trash2, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface ChatsListProps {
  chats: Chat[];
  isLoading: boolean;
  isAnalyzing: boolean;
  onAnalyzeMessages: () => void;
  onDeleteChat: (chatId: string) => Promise<boolean>;
  onDeleteAllChats: () => Promise<boolean>;
}

export const ChatsList: React.FC<ChatsListProps> = ({
  chats,
  isLoading,
  isAnalyzing,
  onAnalyzeMessages,
  onDeleteChat,
  onDeleteAllChats,
}) => {
  const { toast } = useToast();
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  // Função para deletar uma conversa individual
  const handleDeleteChat = async (chatId: string, chatName: string) => {
    const success = await onDeleteChat(chatId);
    if (success) {
      toast({
        title: "Conversa removida",
        description: `A conversa com ${chatName} foi removida com sucesso.`,
      });
    } else {
      toast({
        title: "Erro",
        description: "Não foi possível remover a conversa. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Função para deletar todas as conversas
  const handleDeleteAllChats = async () => {
    setIsDeletingAll(true);
    const success = await onDeleteAllChats();
    
    if (success) {
      toast({
        title: "Todas as conversas foram removidas",
        description: "Todas as suas conversas foram marcadas como resolvidas.",
      });
    } else {
      toast({
        title: "Erro",
        description: "Não foi possível remover as conversas. Tente novamente.",
        variant: "destructive",
      });
    }
    setIsDeletingAll(false);
  };

  const handleAnalyzeMessages = () => {
    onAnalyzeMessages();
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
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2">
            <MessageCircle className="w-5 h-5" />
            <span>Conversas</span>
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
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center space-x-2">
              <MessageCircle className="w-5 h-5" />
              <span>Conversas</span>
            </CardTitle>
            <Button
              onClick={handleAnalyzeMessages}
              disabled={isAnalyzing}
              size="sm"
              variant="outline"
              className="flex items-center space-x-2"
            >
              <RotateCcw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
              <span>{isAnalyzing ? 'Analisando...' : 'Analisar'}</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">Nenhuma conversa encontrada</p>
            <p className="text-sm text-gray-400 mt-1">
              Clique em "Analisar" para classificar suas conversas
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            <span>Conversas</span>
            <Badge variant="secondary">{chats.length}</Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleDeleteAllChats}
              disabled={isDeletingAll || chats.length === 0}
              size="sm"
              variant="outline"
              className="flex items-center space-x-2 text-green-600 hover:text-green-700"
            >
              <CheckCheck className={`w-4 h-4 ${isDeletingAll ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isDeletingAll ? 'Removendo...' : 'Resolver tudo'}</span>
            </Button>
            <Button
              onClick={handleAnalyzeMessages}
              disabled={isAnalyzing}
              size="sm"
              variant="outline"
              className="flex items-center space-x-2"
            >
              <RotateCcw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
              <span>{isAnalyzing ? 'Analisando...' : 'Analisar'}</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[420px]">
          <div className="space-y-2">
            {chats.map((chat) => {
              const priorityInfo = getPriorityInfo(chat.prioridade);
              const formattedNumber = formatPhoneNumber(chat.remote_jid);
              const whatsappNumber = getWhatsAppNumber(chat.remote_jid);
              
              return (
                <div
                  key={chat.id}
                  className="flex items-start justify-between gap-3 rounded-lg border p-2 hover:bg-muted/50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium text-sm">{chat.nome}</span>
                      <Badge className={`text-xs ${priorityInfo.color}`}>
                        <span className="flex items-center gap-1">
                          {priorityInfo.icon}
                          {priorityInfo.label}
                        </span>
                      </Badge>
                    </div>

                    {chat.contexto && (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                        {chat.contexto}
                      </p>
                    )}

                    <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="truncate">{formattedNumber}</span>
                      <span className="shrink-0">
                        {formatDistanceToNow(new Date(chat.modificado_em), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteChat(chat.id, chat.nome)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Remover</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => window.open(`https://wa.me/${whatsappNumber}`, '_blank')}
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Responder</TooltipContent>
                    </Tooltip>
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
