// ABOUTME: Página para gerenciamento de anúncios administrativos
// ABOUTME: Permite criar, visualizar e acompanhar entregas de mensagens para usuários

import React, { useState, useEffect } from 'react';
import { AdminRoute } from '@/components/Admin/AdminRoute';
import { AdminLayout } from '@/components/Admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RefreshCw, Send, Plus, Mail, MessageSquare, Eye, Clock, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Announcement {
  id: string;
  title: string;
  message: string;
  status: string;
  send_via_email: boolean;
  send_via_whatsapp: boolean;
  recipients_count: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
  sent_at: string | null;
  created_by: string;
}

interface Delivery {
  id: string;
  announcement_id: string;
  user_id: string;
  delivery_method: string;
  status: string;
  error_message: string | null;
  sent_at: string | null;
}

const AdminAnnouncementsPage = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const { toast } = useToast();

  // Form state
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sendViaEmail, setSendViaEmail] = useState(true);
  const [sendViaWhatsapp, setSendViaWhatsapp] = useState(false);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Erro ao buscar anúncios:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar anúncios",
        variant: "destructive"
      });
    }
  };

  const fetchDeliveries = async (announcementId: string) => {
    try {
      const { data, error } = await supabase
        .from('announcement_deliveries')
        .select('*')
        .eq('announcement_id', announcementId)
        .order('sent_at', { ascending: false });

      if (error) throw error;
      setDeliveries(data || []);
    } catch (error) {
      console.error('Erro ao buscar entregas:', error);
    }
  };

  const createAnnouncement = async () => {
    if (!title.trim() || !message.trim()) {
      toast({
        title: "Erro",
        description: "Título e mensagem são obrigatórios",
        variant: "destructive"
      });
      return;
    }

    if (!sendViaEmail && !sendViaWhatsapp) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos um método de envio",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-announcement', {
        body: {
          title: title.trim(),
          message: message.trim(),
          send_via_email: sendViaEmail,
          send_via_whatsapp: sendViaWhatsapp
        }
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Anúncio criado com sucesso!"
      });

      // Reset form
      setTitle('');
      setMessage('');
      setSendViaEmail(true);
      setSendViaWhatsapp(false);

      fetchAnnouncements();
    } catch (error) {
      console.error('Erro ao criar anúncio:', error);
      toast({
        title: "Erro",
        description: "Falha ao criar anúncio",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const sendAnnouncement = async (announcementId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('send-announcement', {
        body: { announcement_id: announcementId }
      });

      if (error) throw error;

      toast({
        title: "Enviando",
        description: "Anúncio sendo enviado em segundo plano"
      });

      fetchAnnouncements();
    } catch (error) {
      console.error('Erro ao enviar anúncio:', error);
      toast({
        title: "Erro",
        description: "Falha ao enviar anúncio",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { variant: 'secondary' as const, label: 'Rascunho', icon: Clock },
      sending: { variant: 'default' as const, label: 'Enviando', icon: Send },
      sent: { variant: 'default' as const, label: 'Enviado', icon: CheckCircle },
      failed: { variant: 'destructive' as const, label: 'Falhou', icon: XCircle }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  useEffect(() => {
    fetchAnnouncements();
    setIsLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    return (
      <AdminRoute>
        <AdminLayout>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </AdminLayout>
      </AdminRoute>
    );
  }

  return (
    <AdminRoute>
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                <MessageSquare className="h-8 w-8 text-primary" />
                Anúncios Administrativos 📢
              </h1>
              <p className="text-gray-600">
                Crie e gerencie mensagens para todos os usuários
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={fetchAnnouncements} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
            </div>
          </div>

          {/* Create Announcement Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Criar Novo Anúncio
              </CardTitle>
              <CardDescription>
                Envie mensagens importantes para todos os usuários da plataforma
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Título do anúncio..."
                  maxLength={200}
                />
              </div>

              <div>
                <Label htmlFor="message">Mensagem</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Conteúdo da mensagem..."
                  rows={4}
                  maxLength={1000}
                />
                <p className="text-sm text-gray-500 mt-1">
                  {message.length}/1000 caracteres
                </p>
              </div>

              <div className="flex gap-6">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="email"
                    checked={sendViaEmail}
                    onCheckedChange={setSendViaEmail}
                  />
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Enviar por Email
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="whatsapp"
                    checked={sendViaWhatsapp}
                    onCheckedChange={setSendViaWhatsapp}
                  />
                  <Label htmlFor="whatsapp" className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Enviar por WhatsApp
                  </Label>
                </div>
              </div>

              <Button
                onClick={createAnnouncement}
                disabled={isCreating}
                className="w-full"
              >
                {isCreating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Anúncio
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Announcements List */}
          <div className="grid gap-4">
            {announcements.map((announcement) => (
              <Card key={announcement.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <CardTitle className="text-lg">{announcement.title}</CardTitle>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(announcement.status)}
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
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {announcement.status === 'draft' && (
                        <Button
                          size="sm"
                          onClick={() => sendAnnouncement(announcement.id)}
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Enviar
                        </Button>
                      )}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedAnnouncement(announcement);
                              fetchDeliveries(announcement.id);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Detalhes
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>{selectedAnnouncement?.title}</DialogTitle>
                            <DialogDescription>
                              Detalhes do anúncio e status de entrega
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>Mensagem:</Label>
                              <p className="text-sm bg-gray-50 p-3 rounded">
                                {selectedAnnouncement?.message}
                              </p>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-center">
                              <div>
                                <p className="text-2xl font-bold text-blue-600">
                                  {selectedAnnouncement?.recipients_count || 0}
                                </p>
                                <p className="text-sm text-gray-600">Total Recipients</p>
                              </div>
                              <div>
                                <p className="text-2xl font-bold text-green-600">
                                  {selectedAnnouncement?.sent_count || 0}
                                </p>
                                <p className="text-sm text-gray-600">Enviados</p>
                              </div>
                              <div>
                                <p className="text-2xl font-bold text-red-600">
                                  {selectedAnnouncement?.failed_count || 0}
                                </p>
                                <p className="text-sm text-gray-600">Falharam</p>
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-3">{announcement.message.substring(0, 150)}...</p>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>
                      Criado em: {new Date(announcement.created_at).toLocaleDateString('pt-BR')}
                    </span>
                    {announcement.sent_at && (
                      <span>
                        Enviado em: {new Date(announcement.sent_at).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {announcements.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Nenhum anúncio criado ainda</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </AdminLayout>
    </AdminRoute>
  );
};

export default AdminAnnouncementsPage;