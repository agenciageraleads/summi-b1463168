
import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';

const SettingsPage = () => {
  const { user } = useAuth();
  const { profile, isLoading, updateProfile } = useProfile();
  const [isUpdating, setIsUpdating] = useState(false);

  const [profileData, setProfileData] = useState({
    nome: profile?.nome || '',
    numero: profile?.numero || '',
    transcreve_audio_recebido: profile?.transcreve_audio_recebido ?? true,
    transcreve_audio_enviado: profile?.transcreve_audio_enviado ?? true,
    resume_audio: profile?.resume_audio ?? false,
    segundos_para_resumir: profile?.segundos_para_resumir ?? 45,
    temas_urgentes: profile?.temas_urgentes || '',
    temas_importantes: profile?.temas_importantes || ''
  });

  // Add missing state variables for notifications and webhooks
  const [notifications, setNotifications] = useState({
    email: true,
    newLeads: true,
    reports: false,
    webhooks: false
  });

  const [webhooks] = useState([
    {
      id: 1,
      name: 'Webhook Principal',
      url: 'https://example.com/webhook',
      status: 'Ativo'
    }
  ]);

  // Update form when profile loads
  useEffect(() => {
    if (profile) {
      setProfileData({
        nome: profile.nome,
        numero: profile.numero || '',
        transcreve_audio_recebido: profile.transcreve_audio_recebido,
        transcreve_audio_enviado: profile.transcreve_audio_enviado,
        resume_audio: profile.resume_audio,
        segundos_para_resumir: profile.segundos_para_resumir,
        temas_urgentes: profile.temas_urgentes,
        temas_importantes: profile.temas_importantes
      });
    }
  }, [profile]);

  const handleProfileSave = async () => {
    setIsUpdating(true);
    try {
      await updateProfile(profileData);
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-summi-blue"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-summi-gray-900 mb-2">
            Configurações ⚙️
          </h1>
          <p className="text-summi-gray-600">
            Gerencie seu perfil, configurações da Summi e integrações
          </p>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Perfil & Summi</TabsTrigger>
            <TabsTrigger value="notifications">Notificações</TabsTrigger>
            <TabsTrigger value="integrations">Integrações</TabsTrigger>
          </TabsList>

          {/* Profile & Summi Settings Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span>👤</span>
                  <span>Informações do Usuário</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="id">ID do Usuário (não editável)</Label>
                    <Input
                      id="id"
                      value={user?.id || ''}
                      disabled
                      className="mt-1 bg-gray-100"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="nome">Nome</Label>
                    <Input
                      id="nome"
                      value={profileData.nome}
                      onChange={(e) => setProfileData({...profileData, nome: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="numero">Número WhatsApp</Label>
                    <Input
                      id="numero"
                      value={profileData.numero}
                      onChange={(e) => setProfileData({...profileData, numero: e.target.value})}
                      placeholder="556282435286"
                      className="mt-1"
                      disabled={!!profileData.numero}
                    />
                    {profileData.numero && (
                      <p className="text-xs text-summi-gray-500 mt-1">
                        Número não pode ser alterado quando conectado
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="segundos">Segundos para Resumir</Label>
                    <Input
                      id="segundos"
                      type="number"
                      min="10"
                      max="300"
                      value={profileData.segundos_para_resumir}
                      onChange={(e) => setProfileData({...profileData, segundos_para_resumir: parseInt(e.target.value) || 45})}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-summi-gray-900">Transcrever Áudio Recebido</h4>
                      <p className="text-sm text-summi-gray-600">Converter áudios recebidos em texto</p>
                    </div>
                    <Switch 
                      checked={profileData.transcreve_audio_recebido}
                      onCheckedChange={(checked) => setProfileData({...profileData, transcreve_audio_recebido: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-summi-gray-900">Transcrever Áudio Enviado</h4>
                      <p className="text-sm text-summi-gray-600">Converter áudios enviados em texto</p>
                    </div>
                    <Switch 
                      checked={profileData.transcreve_audio_enviado}
                      onCheckedChange={(checked) => setProfileData({...profileData, transcreve_audio_enviado: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-summi-gray-900">Resumir Áudio</h4>
                      <p className="text-sm text-summi-gray-600">Gerar resumos automáticos dos áudios</p>
                    </div>
                    <Switch 
                      checked={profileData.resume_audio}
                      onCheckedChange={(checked) => setProfileData({...profileData, resume_audio: checked})}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor="temas_urgentes">Temas Urgentes</Label>
                    <Textarea
                      id="temas_urgentes"
                      value={profileData.temas_urgentes}
                      onChange={(e) => setProfileData({...profileData, temas_urgentes: e.target.value})}
                      placeholder="urgente, amor, falar com voce, me liga, ligar, ligacao, retorna"
                      className="mt-1"
                      rows={3}
                    />
                    <p className="text-xs text-summi-gray-500 mt-1">
                      Palavras-chave que indicam urgência, separadas por vírgula
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor="temas_importantes">Temas Importantes</Label>
                    <Textarea
                      id="temas_importantes"
                      value={profileData.temas_importantes}
                      onChange={(e) => setProfileData({...profileData, temas_importantes: e.target.value})}
                      placeholder="orcamentos, material eletrico, material, comprar"
                      className="mt-1"
                      rows={3}
                    />
                    <p className="text-xs text-summi-gray-500 mt-1">
                      Palavras-chave que indicam assuntos importantes, separadas por vírgula
                    </p>
                  </div>
                </div>

                <Button 
                  onClick={handleProfileSave}
                  className="btn-primary"
                  disabled={isUpdating}
                >
                  {isUpdating ? 'Salvando...' : 'Salvar Configurações'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span>🔔</span>
                  <span>Preferências de Notificação</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-summi-gray-900">Notificações por E-mail</h4>
                    <p className="text-sm text-summi-gray-600">Receber atualizações por e-mail</p>
                  </div>
                  <Switch 
                    checked={notifications.email}
                    onCheckedChange={(checked) => setNotifications({...notifications, email: checked})}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-summi-gray-900">Novos Leads</h4>
                    <p className="text-sm text-summi-gray-600">Notificar quando um novo lead for qualificado</p>
                  </div>
                  <Switch 
                    checked={notifications.newLeads}
                    onCheckedChange={(checked) => setNotifications({...notifications, newLeads: checked})}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-summi-gray-900">Relatórios Semanais</h4>
                    <p className="text-sm text-summi-gray-600">Receber resumo semanal de performance</p>
                  </div>
                  <Switch 
                    checked={notifications.reports}
                    onCheckedChange={(checked) => setNotifications({...notifications, reports: checked})}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-summi-gray-900">Webhooks</h4>
                    <p className="text-sm text-summi-gray-600">Enviar notificações via webhook</p>
                  </div>
                  <Switch 
                    checked={notifications.webhooks}
                    onCheckedChange={(checked) => setNotifications({...notifications, webhooks: checked})}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integrations Tab */}
          <TabsContent value="integrations" className="space-y-6">
            <Card className="card-hover">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <span>🔗</span>
                  <span>API Keys</span>
                </CardTitle>
                <Button className="btn-primary">+ Nova API Key</Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-summi-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-summi-gray-900">Production API Key</h4>
                        <p className="text-sm text-summi-gray-600 font-mono">sk_prod_••••••••••••3a2b</p>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">Copiar</Button>
                        <Button variant="outline" size="sm">Regenerar</Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <span>🪝</span>
                  <span>Webhooks</span>
                </CardTitle>
                <Button className="btn-primary">+ Novo Webhook</Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {webhooks.map((webhook) => (
                    <div key={webhook.id} className="p-4 bg-summi-gray-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-summi-gray-900">{webhook.name}</h4>
                          <p className="text-sm text-summi-gray-600 font-mono">{webhook.url}</p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            webhook.status === 'Ativo' 
                              ? 'bg-summi-green text-white' 
                              : 'bg-summi-gray-300 text-summi-gray-700'
                          }`}>
                            {webhook.status}
                          </span>
                          <Button variant="outline" size="sm">Editar</Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
