
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { disconnectWhatsApp } from '@/services/whatsappConnection';
import { AlertCircle, Phone, Unlink, User, Loader2 } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useEffect } from 'react';

export const ProfileForm = () => {
  const { toast } = useToast();
  const { profile, updateProfile, refreshProfile } = useProfile();
  const [formData, setFormData] = useState({
    nome: profile?.nome || '',
    numero: profile?.numero || '',
    temas_importantes: profile?.temas_importantes || '',
    temas_urgentes: profile?.temas_urgentes || '',
    transcreve_audio_recebido: profile?.transcreve_audio_recebido ?? true,
    transcreve_audio_enviado: profile?.transcreve_audio_enviado ?? true,
    resume_audio: profile?.resume_audio ?? false,
    segundos_para_resumir: profile?.segundos_para_resumir || 45,
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Verificar se há uma instância conectada
  const hasConnectedInstance = Boolean(profile?.instance_name);

  // Atualizar formData quando o perfil carregar
  useEffect(() => {
    if (profile) {
      setFormData({
        nome: profile.nome || '',
        numero: profile.numero || '',
        temas_importantes: profile.temas_importantes || '',
        temas_urgentes: profile.temas_urgentes || '',
        transcreve_audio_recebido: profile.transcreve_audio_recebido ?? true,
        transcreve_audio_enviado: profile.transcreve_audio_enviado ?? true,
        resume_audio: profile.resume_audio ?? false,
        segundos_para_resumir: profile.segundos_para_resumir || 45,
      });
    }
  }, [profile]);

  // Função para formatar número de telefone
  const formatPhoneNumber = (value: string) => {
    // Remove todos os caracteres não numéricos
    const numbers = value.replace(/\D/g, '');
    
    // Se não há números, retorna vazio
    if (!numbers) return '';
    
    // Remove o código do país 55 se presente para formatação visual
    const localNumbers = numbers.startsWith('55') ? numbers.slice(2) : numbers;
    
    // Aplica a formatação baseada na quantidade de dígitos locais
    if (localNumbers.length <= 2) {
      return `(${localNumbers}`;
    }
    
    if (localNumbers.length <= 3) {
      return `(${localNumbers.slice(0, 2)}) ${localNumbers.slice(2)}`;
    }
    
    if (localNumbers.length <= 6) {
      return `(${localNumbers.slice(0, 2)}) ${localNumbers.slice(2)}`;
    }
    
    // Para números com 8 dígitos (sem 9º dígito) - formato: (XX) XXXX-XXXX
    if (localNumbers.length === 10 && localNumbers[2] !== '9') {
      return `(${localNumbers.slice(0, 2)}) ${localNumbers.slice(2, 6)}-${localNumbers.slice(6)}`;
    }
    
    // Para números com 9 dígitos (começando com 9)
    if (localNumbers.length >= 7) {
      const ddd = localNumbers.slice(0, 2);
      const firstDigit = localNumbers.slice(2, 3);
      const remainingDigits = localNumbers.slice(3);
      
      if (firstDigit === '9') {
        // Formato: (XX) 9 XXXX-XXXX
        if (remainingDigits.length <= 4) {
          return `(${ddd}) 9 ${remainingDigits}`;
        } else {
          return `(${ddd}) 9 ${remainingDigits.slice(0, 4)}-${remainingDigits.slice(4)}`;
        }
      } else {
        // Formato: (XX) XXXX-XXXX (sem 9º dígito)
        if (remainingDigits.length <= 3) {
          return `(${ddd}) ${firstDigit}${remainingDigits}`;
        } else {
          return `(${ddd}) ${firstDigit}${remainingDigits.slice(0, 3)}-${remainingDigits.slice(3)}`;
        }
      }
    }
    
    return `(${localNumbers.slice(0, 2)}) ${localNumbers.slice(2)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numbers = value.replace(/\D/g, '');
    
    // Remove o 55 se presente para armazenar apenas o número local
    const localNumbers = numbers.startsWith('55') ? numbers.slice(2) : numbers;
    
    // Permitir até 11 dígitos locais (DDD + 9 dígitos)
    if (localNumbers.length <= 11) {
      setFormData(prev => ({ ...prev, numero: localNumbers }));
    }
  };

  const handleSave = async () => {
    console.log('[ProfileForm] Iniciando salvamento das configurações...');
    setIsUpdating(true);
    
    try {
      // Validar número de telefone (apenas dígitos locais)
      const phoneNumbers = formData.numero.replace(/\D/g, '');
      if (phoneNumbers && (phoneNumbers.length < 10 || phoneNumbers.length > 11)) {
        toast({
          title: "Erro",
          description: "Número de telefone deve ter 10 ou 11 dígitos (DDD + número)",
          variant: "destructive",
        });
        return;
      }

      // Sempre adicionar o prefixo 55 ao salvar no backend se há número
      const phoneWithCountryCode = phoneNumbers ? 
        (phoneNumbers.startsWith('55') ? phoneNumbers : '55' + phoneNumbers) : '';
      
      const result = await updateProfile({
        ...formData,
        numero: phoneWithCountryCode || null
      });

      if (result?.success) {
        toast({
          title: "Configurações salvas",
          description: "Todas as suas configurações foram atualizadas com sucesso.",
        });
      }
    } catch (error) {
      console.error('[ProfileForm] Erro ao salvar configurações:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as configurações. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDisconnectInstance = async () => {
    if (!profile?.instance_name) return;

    setIsDisconnecting(true);
    
    try {
      console.log('[ProfileForm] Iniciando desconexão da instância...');
      const result = await disconnectWhatsApp();
      
      if (result.success) {
        await refreshProfile();
        toast({
          title: "Desconectado",
          description: "WhatsApp desconectado com sucesso. Agora você pode alterar o número de telefone.",
        });
      } else {
        toast({
          title: "Erro",
          description: result.error || "Erro ao desconectar WhatsApp",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('[ProfileForm] Erro ao desconectar:', error);
      toast({
        title: "Erro",
        description: "Erro ao desconectar WhatsApp",
        variant: "destructive",
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (!profile) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <User className="w-5 h-5" />
          <span>Informações do Perfil</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Nome e Telefone */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="nome">Nome</Label>
            <Input
              id="nome"
              value={formData.nome}
              onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
              placeholder="Seu nome"
            />
          </div>
          <div>
            <Label htmlFor="numero">Número do WhatsApp</Label>
            <Input
              id="numero"
              type="tel"
              placeholder="Ex: (62) 9 8243-5286"
              value={formatPhoneNumber(formData.numero)}
              onChange={handlePhoneChange}
              disabled={hasConnectedInstance}
              className={hasConnectedInstance ? 'bg-gray-100 cursor-not-allowed' : ''}
            />
            {hasConnectedInstance && (
              <p className="text-sm text-amber-600 mt-1 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                Campo bloqueado: WhatsApp conectado
              </p>
            )}
          </div>
        </div>

        {/* Desconectar WhatsApp se conectado */}
        {hasConnectedInstance && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <h4 className="font-medium text-amber-800 mb-1">WhatsApp Conectado</h4>
            <p className="text-sm text-amber-700 mb-3">
              Para alterar o número de telefone, é necessário desconectar o WhatsApp primeiro.
            </p>
            <Button 
              onClick={handleDisconnectInstance}
              disabled={isDisconnecting}
              variant="destructive"
              size="sm"
            >
              {isDisconnecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Desconectando...
                </>
              ) : (
                <>
                  <Unlink className="w-4 h-4 mr-2" />
                  Desconectar WhatsApp
                </>
              )}
            </Button>
          </div>
        )}

        <Separator />

        {/* Temas Importantes e Urgentes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="temas_importantes">Temas Importantes</Label>
            <Input
              id="temas_importantes"
              value={formData.temas_importantes}
              onChange={(e) => setFormData(prev => ({ ...prev, temas_importantes: e.target.value }))}
              placeholder="Ex: orçamentos, material elétrico"
            />
          </div>
          <div>
            <Label htmlFor="temas_urgentes">Temas Urgentes</Label>
            <Input
              id="temas_urgentes"
              value={formData.temas_urgentes}
              onChange={(e) => setFormData(prev => ({ ...prev, temas_urgentes: e.target.value }))}
              placeholder="Ex: urgente, emergência"
            />
          </div>
        </div>

        <Separator />

        {/* Configurações de Áudio */}
        <div className="space-y-4">
          <h3 className="font-medium">Configurações de Áudio</h3>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="transcreve_audio_recebido">Transcrever áudios recebidos</Label>
              <p className="text-sm text-muted-foreground">
                Converter áudios recebidos em texto automaticamente
              </p>
            </div>
            <Switch
              id="transcreve_audio_recebido"
              checked={formData.transcreve_audio_recebido}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, transcreve_audio_recebido: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="transcreve_audio_enviado">Transcrever áudios enviados</Label>
              <p className="text-sm text-muted-foreground">
                Converter áudios enviados em texto automaticamente
              </p>
            </div>
            <Switch
              id="transcreve_audio_enviado"
              checked={formData.transcreve_audio_enviado}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, transcreve_audio_enviado: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="resume_audio">Resumir áudios longos</Label>
              <p className="text-sm text-muted-foreground">
                Gerar resumo para áudios mais longos que o tempo especificado
              </p>
            </div>
            <Switch
              id="resume_audio"
              checked={formData.resume_audio}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, resume_audio: checked }))}
            />
          </div>

          {formData.resume_audio && (
            <div>
              <Label htmlFor="segundos_para_resumir">Segundos para resumir</Label>
              <Input
                id="segundos_para_resumir"
                type="number"
                min="15"
                max="300"
                value={formData.segundos_para_resumir}
                onChange={(e) => setFormData(prev => ({ ...prev, segundos_para_resumir: parseInt(e.target.value) || 45 }))}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Áudios com mais de {formData.segundos_para_resumir} segundos serão resumidos
              </p>
            </div>
          )}
        </div>

        <Button 
          onClick={handleSave}
          disabled={isUpdating}
          className="w-full"
        >
          {isUpdating ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </CardContent>
    </Card>
  );
};
