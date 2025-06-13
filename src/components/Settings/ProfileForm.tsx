
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { disconnectWhatsApp } from '@/services/whatsappService';
import { AlertCircle, Phone, Unlink, User } from 'lucide-react';
import type { Profile } from '@/hooks/useProfile';

interface ProfileFormProps {
  profile: Profile;
  onSave: (data: Partial<Profile>) => Promise<void>;
  isUpdating: boolean;
}

export const ProfileForm = ({ profile, onSave, isUpdating }: ProfileFormProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    nome: profile.nome || '',
    numero: profile.numero || '',
    temas_importantes: profile.temas_importantes || '',
    temas_urgentes: profile.temas_urgentes || '',
    transcreve_audio_recebido: profile.transcreve_audio_recebido ?? true,
    transcreve_audio_enviado: profile.transcreve_audio_enviado ?? true,
    resume_audio: profile.resume_audio ?? false,
    segundos_para_resumir: profile.segundos_para_resumir || 45,
  });
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Verificar se há uma instância conectada
  const hasConnectedInstance = Boolean(profile?.instance_name);
  const isPhoneFieldLocked = hasConnectedInstance;

  // Função para formatar número de telefone
  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 4) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 9) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 3)} ${numbers.slice(3)}`;
    
    const hasNinthDigit = numbers.length === 13 || numbers.length === 14;
    if (hasNinthDigit) {
      return `(${numbers.slice(2, 4)}) ${numbers.slice(4, 5)} ${numbers.slice(5, 9)}-${numbers.slice(9, 13)}`;
    } else {
      return `(${numbers.slice(2, 4)}) ${numbers.slice(4, 8)}-${numbers.slice(8, 12)}`;
    }
  };

  // Função para normalizar número (sempre salvar com 55)
  const normalizePhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    
    // Se não começa com 55, adicionar
    if (!numbers.startsWith('55')) {
      return '55' + numbers;
    }
    
    return numbers;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numbers = value.replace(/\D/g, '');
    
    // Permitir até 14 dígitos (55 + 11 dígitos do celular com 9º dígito)
    if (numbers.length <= 14) {
      setFormData(prev => ({ ...prev, numero: numbers }));
    }
  };

  const handleSave = async () => {
    // Validar número de telefone
    const phoneNumbers = formData.numero.replace(/\D/g, '');
    if (phoneNumbers.length < 12 || phoneNumbers.length > 14) {
      toast({
        title: "Erro",
        description: "Número de telefone deve ter entre 12 e 14 dígitos (incluindo código do país)",
        variant: "destructive",
      });
      return;
    }

    // Normalizar número para salvar no banco
    const normalizedPhone = normalizePhoneNumber(phoneNumbers);
    
    await onSave({
      ...formData,
      numero: normalizedPhone
    });
  };

  const handleDisconnectInstance = async () => {
    if (!profile?.instance_name) return;

    setIsDisconnecting(true);
    
    try {
      const result = await disconnectWhatsApp();
      
      if (result.success) {
        toast({
          title: "Desconectado",
          description: "WhatsApp desconectado com sucesso. Agora você pode alterar o número de telefone.",
        });
        
        // Recarregar a página para atualizar o estado
        window.location.reload();
      } else {
        toast({
          title: "Erro",
          description: result.error || "Erro ao desconectar WhatsApp",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro ao desconectar:', error);
      toast({
        title: "Erro",
        description: "Erro ao desconectar WhatsApp",
        variant: "destructive",
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

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
              disabled={isPhoneFieldLocked}
              className={isPhoneFieldLocked ? 'bg-gray-100 cursor-not-allowed' : ''}
            />
            {isPhoneFieldLocked && (
              <p className="text-sm text-amber-600 mt-1 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                Campo bloqueado: WhatsApp conectado
              </p>
            )}
          </div>
        </div>

        {/* Desconectar WhatsApp se conectado */}
        {isPhoneFieldLocked && (
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
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
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
