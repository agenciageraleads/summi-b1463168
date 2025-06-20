
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Megaphone, Send, Plus, Mail, MessageSquare, Users, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Announcement {
  id: string;
  title: string;
  message: string;
  send_via_whatsapp: boolean;
  send_via_email: boolean;
  created_at: string;
  sent_at?: string;
  status: 'draft' | 'sending' | 'sent' | 'failed';
  recipients_count: number;
  sent_count: number;
  failed_count: number;
}

export const AnnouncementsManager: React.FC = () => {
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    send_via_whatsapp: false,
    send_via_email: false,
  });

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-announcements', {
        body: { action: 'list' },
      });

      if (error) throw error;

      if (data.success) {
        setAnnouncements(data.announcements || []);
      }
    } catch (error) {
      console.error('Erro ao carregar anúncios:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar anúncios",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createAnnouncement = async () => {
    if (!formData.title.trim() || !formData.message.trim()) {
      toast({
        title: "Erro",
        description: "Título e mensagem são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    if (!formData.send_via_whatsapp && !formData.send_via_email) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos um método de envio",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('admin-announcements', {
        body: {
          action: 'create',
          ...formData,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Sucesso",
          description: "Anúncio criado com sucesso",
        });
        setFormData({
          title: '',
          message: '',
          send_via_whatsapp: false,
          send_via_email: false,
        });
        setShowCreateDialog(false);
        loadAnnouncements();
      }
    } catch (error) {
      console.error('Erro ao criar anúncio:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar anúncio",
        variant: "destructive",
      });
    }
  };

  const sendAnnouncement = async (announcementId: string) => {
    setIsSending(announcementId);
    try {
      const { data, error } = await supabase.functions.invoke('admin-announcements', {
        body: {
          action: 'send',
          announcement_id: announcementId,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Anúncio Enviado",
          description: `Enviado para ${data.sent_count} usuários. ${data.failed_count} falhas.`,
        });
        loadAnnouncements();
      }
    } catch (error) {
      console.error('Erro ao enviar anúncio:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar anúncio",
        variant: "destructive",
      });
    } finally {
      setIsSending(null);
    }
  };

  const getStatusBadge = (announcement: Announcement) => {
    switch (announcement.status) {
      case 'draft':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Rascunho</Badge>;
      case 'sending':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Enviando</Badge>;
      case 'sent':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Enviado</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Falhou</Badge>;
      default:
        return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-blue-600" />
            Anúncios Administrativos
          </h2>
          <p className="text-gray-600">Envie anúncios para todos os usuários via email ou WhatsApp</p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Criar Anúncio
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Criar Novo Anúncio</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Título</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Título do anúncio"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Mensagem</label>
                <Textarea
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Conteúdo do anúncio"
                  rows={6}
                />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-medium">Métodos de Envio</label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="email"
                    checked={formData.send_via_email}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, send_via_email: checked as boolean }))
                    }
                  />
                  <label htmlFor="email" className="text-sm flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Enviar por Email
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="whatsapp"
                    checked={formData.send_via_whatsapp}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, send_via_whatsapp: checked as boolean }))
                    }
                  />
                  <label htmlFor="whatsapp" className="text-sm flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Enviar por WhatsApp
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={createAnnouncement}>
                  Criar Anúncio
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de Anúncios */}
      <div className="space-y-4">
        {announcements.length > 0 ? (
          announcements.map((announcement) => (
            <Card key={announcement.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{announcement.title}</CardTitle>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDistanceToNow(new Date(announcement.created_at), { 
                          addSuffix: true, 
                          locale: ptBR 
                        })}
                      </span>
                      {announcement.sent_at && (
                        <span className="flex items-center gap-1">
                          <Send className="h-4 w-4" />
                          Enviado {formatDistanceToNow(new Date(announcement.sent_at), { 
                            addSuffix: true, 
                            locale: ptBR 
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(announcement)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 mb-4">{announcement.message}</p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{announcement.recipients_count} destinatários</span>
                    </div>
                    {announcement.status === 'sent' && (
                      <>
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span>{announcement.sent_count} enviados</span>
                        </div>
                        {announcement.failed_count > 0 && (
                          <div className="flex items-center gap-1 text-red-600">
                            <XCircle className="h-4 w-4" />
                            <span>{announcement.failed_count} falhas</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {announcement.send_via_email && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        Email
                      </Badge>
                    )}
                    {announcement.send_via_whatsapp && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        WhatsApp
                      </Badge>
                    )}
                    
                    {announcement.status === 'draft' && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" disabled={isSending === announcement.id}>
                            {isSending === announcement.id ? (
                              <>
                                <Clock className="h-4 w-4 mr-2 animate-spin" />
                                Enviando...
                              </>
                            ) : (
                              <>
                                <Send className="h-4 w-4 mr-2" />
                                Enviar
                              </>
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar Envio</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja enviar este anúncio para todos os usuários? 
                              Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => sendAnnouncement(announcement.id)}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              Enviar Anúncio
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Megaphone className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum anúncio criado</h3>
              <p className="text-gray-500 mb-4">
                Crie seu primeiro anúncio para comunicar com todos os usuários
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Anúncio
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
