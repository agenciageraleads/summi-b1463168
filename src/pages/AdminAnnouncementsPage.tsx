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
import { SEO } from '@/components/SEO';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
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
        title: t('error'),
        description: t('fetch_announcements_error', { defaultValue: 'Falha ao carregar anúncios' }),
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
        title: t('error'),
        description: t('title_message_required', { defaultValue: 'Título e mensagem são obrigatórios' }),
        variant: "destructive"
      });
      return;
    }

    if (!sendViaEmail && !sendViaWhatsapp) {
      toast({
        title: t('error'),
        description: t('select_delivery_method_error', { defaultValue: 'Selecione pelo menos um método de envio' }),
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);
    try {
      const { error } = await supabase.functions.invoke('create-announcement', {
        body: {
          title: title.trim(),
          message: message.trim(),
          send_via_email: sendViaEmail,
          send_via_whatsapp: sendViaWhatsapp
        }
      });

      if (error) throw error;

      toast({
        title: t('success'),
        description: t('announcement_created')
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
        title: t('error'),
        description: t('create_announcement_error'),
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const sendAnnouncement = async (announcementId: string) => {
    try {
      const { error } = await supabase.functions.invoke('send-announcement', {
        body: { announcement_id: announcementId }
      });

      if (error) throw error;

      toast({
        title: t('sending'),
        description: t('announcement_sending_background')
      });

      fetchAnnouncements();
    } catch (error) {
      console.error('Erro ao enviar anúncio:', error);
      toast({
        title: t('error'),
        description: t('send_announcement_error'),
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { variant: 'secondary' as const, label: t('draft'), icon: Clock },
      sending: { variant: 'default' as const, label: t('sending'), icon: Send },
      sent: { variant: 'default' as const, label: t('sent'), icon: CheckCircle },
      failed: { variant: 'destructive' as const, label: t('failed'), icon: XCircle }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.failed;
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
            <SEO
              title={t('loading')}
              description={t('please_wait')}
              noIndex
            />
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </AdminLayout>
      </AdminRoute>
    );
  }

  return (
    <AdminRoute>
      <AdminLayout>
        <SEO
          title={t('admin_announcements_title')}
          description={t('admin_announcements_desc')}
          noIndex
          author="Summi"
        />
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                <MessageSquare className="h-8 w-8 text-primary" />
                {t('admin_announcements_title')}
              </h1>
              <p className="text-gray-600">
                {t('admin_announcements_subtitle')}
              </p>
            </div>
            <div className="flex gap-2">
              <Button role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.click(); }} onClick={fetchAnnouncements} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('refresh')}
              </Button>
            </div>
          </div>

          {/* Create Announcement Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                {t('create_new_announcement')}
              </CardTitle>
              <CardDescription>
                {t('create_announcement_desc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">{t('title')}</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('announcement_title_placeholder')}
                  maxLength={200}
                />
              </div>

              <div>
                <Label htmlFor="message">{t('message')}</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t('announcement_message_placeholder')}
                  rows={4}
                  maxLength={1000}
                />
                <p className="text-sm text-gray-500 mt-1">
                  {message.length}/1000 {t('characters')}
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
                    {t('send_via_email')}
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
                    {t('send_via_whatsapp')}
                  </Label>
                </div>
              </div>

              <Button
                role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.click(); }} onClick={createAnnouncement}
                disabled={isCreating}
                className="w-full"
              >
                {isCreating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    {t('creating')}
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('create_announcement')}
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
                            {t('email')}
                          </Badge>
                        )}
                        {announcement.send_via_whatsapp && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {t('whatsapp')}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {announcement.status === 'draft' && (
                        <Button
                          size="sm"
                          role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.click(); }} onClick={() => sendAnnouncement(announcement.id)}
                        >
                          <Send className="h-4 w-4 mr-2" />
                          {t('send')}
                        </Button>
                      )}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.click(); }} onClick={() => {
                              setSelectedAnnouncement(announcement);
                              fetchDeliveries(announcement.id);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            {t('details')}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>{selectedAnnouncement?.title}</DialogTitle>
                            <DialogDescription>
                              {t('announcement_details_desc')}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <h3 className="font-semibold text-foreground">
                                {t('message')}:
                              </h3>
                              <div className="text-sm bg-gray-50 p-3 rounded">
                                {selectedAnnouncement?.message}
                                <br />
                                <h4 className="sr-only">{t('announcement_content_heading')}</h4>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-center">
                              <div>
                                <p className="text-2xl font-bold text-blue-600">
                                  {selectedAnnouncement?.recipients_count || 0}
                                </p>
                                <p className="text-sm text-gray-600">{t('total_recipients', { defaultValue: 'Total Recipients' })}</p>
                              </div>
                              <div>
                                <p className="text-2xl font-bold text-green-600">
                                  {selectedAnnouncement?.sent_count || 0}
                                </p>
                                <p className="text-sm text-gray-600">{t('sent_count_label', { defaultValue: 'Enviados' })}</p>
                              </div>
                              <div>
                                <p className="text-2xl font-bold text-red-600">
                                  {selectedAnnouncement?.failed_count || 0}
                                </p>
                                <p className="text-sm text-gray-600">{t('failed_count_label', { defaultValue: 'Falharam' })}</p>
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
                      {t('created_at_prefix', { defaultValue: 'Criado em:' })} {new Date(announcement.created_at).toLocaleDateString()}
                    </span>
                    {announcement.sent_at && (
                      <span>
                        {t('sent_at_prefix', { defaultValue: 'Enviado em:' })} {new Date(announcement.sent_at).toLocaleDateString()}
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
                  <p className="text-gray-500">{t('no_announcements_yet', { defaultValue: 'Nenhum anúncio criado ainda' })}</p>
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