import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Profile } from '@/hooks/useProfile';
import { Switch } from "@/components/ui/switch"
import { useWhatsAppManager } from '@/hooks/useWhatsAppManager';

interface ProfileFormProps {
  profile: Profile | null;
  updateProfile: (updates: Partial<Profile>) => Promise<unknown>;
  isLoading: boolean;
}

export const ProfileForm = ({ profile, updateProfile, isLoading }: ProfileFormProps) => {
  const { toast } = useToast();
  const { state: waState } = useWhatsAppManager();
  const [formData, setFormData] = useState<Partial<Profile>>({
    nome: profile?.nome || '',
    email: profile?.email || '',
    numero: profile?.numero || '',
    temas_importantes: profile?.temas_importantes || '',
    temas_urgentes: profile?.temas_urgentes || '',
    transcreve_audio_recebido: profile?.transcreve_audio_recebido || false,
    transcreve_audio_enviado: profile?.transcreve_audio_enviado || false,
    resume_audio: profile?.resume_audio || false,
    segundos_para_resumir: profile?.segundos_para_resumir || 30,
    'Summi em Audio?': profile?.['Summi em Audio?'] || false,
    apenas_horario_comercial: profile?.apenas_horario_comercial || false,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        nome: profile.nome || '',
        email: profile.email || '',
        numero: profile.numero || '',
        temas_importantes: profile.temas_importantes || '',
        temas_urgentes: profile.temas_urgentes || '',
        transcreve_audio_recebido: profile.transcreve_audio_recebido || false,
        transcreve_audio_enviado: profile.transcreve_audio_enviado || false,
        resume_audio: profile.resume_audio || false,
        segundos_para_resumir: profile.segundos_para_resumir || 30,
        'Summi em Audio?': profile['Summi em Audio?'] || false,
        apenas_horario_comercial: profile.apenas_horario_comercial || false,
      });
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const result = await updateProfile(formData) as { error?: string };

      if (result.error) {
        toast({
          title: "Erro ao salvar",
          description: result.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Perfil atualizado",
          description: "Suas informações foram salvas.",
        });
      }
    } catch (error) {
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro ao salvar o perfil.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const connectionState = waState.connectionState;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="nome">Nome</Label>
        <Input
          id="nome"
          type="text"
          value={formData.nome || ''}
          onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
          placeholder="Seu nome"
          required
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email || ''}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="seu@email.com"
          required
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="numero">Número de WhatsApp</Label>
        <Input
          id="numero"
          type="tel"
          value={formData.numero || ''}
          onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
          placeholder="5562999999999"
          // **CORREÇÃO CRÍTICA: Campo editável exceto quando já conectado**
          disabled={connectionState === 'already_connected'}
          className="mt-1"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Formato: código do país + DDD + número (ex: 5562999999999)
        </p>
      </div>

      <div>
        <Label htmlFor="temas_importantes">Temas Importantes</Label>
        <Textarea
          id="temas_importantes"
          value={formData.temas_importantes || ''}
          onChange={(e) => setFormData({ ...formData, temas_importantes: e.target.value })}
          placeholder="Quais temas são importantes para você?"
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="temas_urgentes">Temas Urgentes</Label>
        <Textarea
          id="temas_urgentes"
          value={formData.temas_urgentes || ''}
          onChange={(e) => setFormData({ ...formData, temas_urgentes: e.target.value })}
          placeholder="Quais temas são urgentes para você?"
          className="mt-1"
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="transcreve_audio_recebido" className="mr-2">
          Transcrever áudios recebidos?
        </Label>
        <Switch
          id="transcreve_audio_recebido"
          checked={formData.transcreve_audio_recebido === true}
          onCheckedChange={(checked) => setFormData({ ...formData, transcreve_audio_recebido: checked })}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="transcreve_audio_enviado" className="mr-2">
          Transcrever áudios enviados?
        </Label>
        <Switch
          id="transcreve_audio_enviado"
          checked={formData.transcreve_audio_enviado === true}
          onCheckedChange={(checked) => setFormData({ ...formData, transcreve_audio_enviado: checked })}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="resume_audio" className="mr-2">
          Resumir áudios?
        </Label>
        <Switch
          id="resume_audio"
          checked={formData.resume_audio === true}
          onCheckedChange={(checked) => setFormData({ ...formData, resume_audio: checked })}
        />
      </div>

      {formData.resume_audio && (
        <div>
          <Label htmlFor="segundos_para_resumir">Segundos para Resumir</Label>
          <Input
            id="segundos_para_resumir"
            type="number"
            value={formData.segundos_para_resumir?.toString() || '30'}
            onChange={(e) => setFormData({ ...formData, segundos_para_resumir: Number(e.target.value) })}
            placeholder="30"
            className="mt-1"
          />
        </div>
      )}

      <div className="flex items-center justify-between">
        <Label htmlFor="Summi em Audio?" className="mr-2">
          Summi em Áudio?
        </Label>
        <Switch
          id="Summi em Audio?"
          checked={formData['Summi em Audio?'] === true}
          onCheckedChange={(checked) => setFormData({ ...formData, 'Summi em Audio?': checked })}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="apenas_horario_comercial" className="mr-2">
          Apenas Horário Comercial?
        </Label>
        <Switch
          id="apenas_horario_comercial"
          checked={formData.apenas_horario_comercial === true}
          onCheckedChange={(checked) => setFormData({ ...formData, apenas_horario_comercial: checked })}
        />
      </div>

      <Button type="submit" disabled={isLoading || isSaving}>
        {isSaving ? 'Salvando...' : 'Salvar Alterações'}
      </Button>
    </form>
  );
};
