
import { useState } from 'react';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const SettingsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    company: ''
  });

  const [notifications, setNotifications] = useState({
    email: true,
    webhooks: false,
    newLeads: true,
    reports: true
  });

  const handleProfileSave = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({
        title: "Perfil atualizado!",
        description: "Suas informações foram salvas com sucesso",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const teamMembers = [
    {
      id: 1,
      name: 'Ana Silva',
      email: 'ana@empresa.com',
      role: 'Admin',
      status: 'Ativo',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b4e0?w=150'
    },
    {
      id: 2,
      name: 'Carlos Santos',
      email: 'carlos@empresa.com',
      role: 'Operador',
      status: 'Ativo',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
    }
  ];

  const webhooks = [
    {
      id: 1,
      name: 'Novo Lead Qualificado',
      url: 'https://api.empresa.com/webhooks/leads',
      status: 'Ativo'
    },
    {
      id: 2,
      name: 'Atualização de Status',
      url: 'https://api.empresa.com/webhooks/status',
      status: 'Inativo'
    }
  ];

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-summi-gray-900 mb-2">
            Configurações ⚙️
          </h1>
          <p className="text-summi-gray-600">
            Gerencie seu perfil, equipe e integrações
          </p>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">Perfil</TabsTrigger>
            <TabsTrigger value="team">Equipe</TabsTrigger>
            <TabsTrigger value="notifications">Notificações</TabsTrigger>
            <TabsTrigger value="integrations">Integrações</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span>👤</span>
                  <span>Informações Pessoais</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-6">
                  <div className="w-20 h-20 bg-summi-blue rounded-full flex items-center justify-center">
                    {user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-20 h-20 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-white font-bold text-2xl">
                        {user?.name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <Button variant="outline">Alterar foto</Button>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nome completo</Label>
                    <Input
                      id="name"
                      value={profileData.name}
                      onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                      placeholder="(11) 99999-9999"
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="company">Empresa</Label>
                    <Input
                      id="company"
                      value={profileData.company}
                      onChange={(e) => setProfileData({...profileData, company: e.target.value})}
                      placeholder="Sua Empresa Ltda"
                      className="mt-1"
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleProfileSave}
                  className="btn-primary"
                  disabled={isLoading}
                >
                  {isLoading ? 'Salvando...' : 'Salvar alterações'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Team Tab */}
          <TabsContent value="team" className="space-y-6">
            <Card className="card-hover">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <span>👥</span>
                  <span>Membros da Equipe</span>
                </CardTitle>
                <Button className="btn-primary">+ Convidar membro</Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {teamMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-4 bg-summi-gray-50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <img
                          src={member.avatar}
                          alt={member.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div>
                          <h4 className="font-medium text-summi-gray-900">{member.name}</h4>
                          <p className="text-sm text-summi-gray-600">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className={`px-3 py-1 text-xs rounded-full ${
                          member.role === 'Admin' 
                            ? 'bg-summi-blue text-white' 
                            : 'bg-summi-gray-200 text-summi-gray-700'
                        }`}>
                          {member.role}
                        </span>
                        <span className="text-sm text-summi-green font-medium">{member.status}</span>
                        <Button variant="outline" size="sm">Editar</Button>
                      </div>
                    </div>
                  ))}
                </div>
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
