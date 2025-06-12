
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile, Profile } from '@/hooks/useProfile';

interface ProfileFormProps {
  profile: Profile;
  onSave: (data: Partial<Profile>) => Promise<void>;
  isUpdating: boolean;
}

export const ProfileForm = ({ profile, onSave, isUpdating }: ProfileFormProps) => {
  const { user } = useAuth();
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

  const handleSave = async () => {
    await onSave(profileData);
  };

  return (
    <Card className="border-border shadow-sm">
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
              className="mt-1 bg-muted"
            />
          </div>

          <div>
            <Label htmlFor="instance_name">Nome da Instância (não editável)</Label>
            <Input
              id="instance_name"
              value={profile?.instance_name || 'Será gerado automaticamente'}
              disabled
              className="mt-1 bg-muted"
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
            />
            <p className="text-xs text-muted-foreground mt-1">
              Digite apenas números (incluindo código do país)
            </p>
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
              <h4 className="font-medium text-foreground">Transcrever Áudio Recebido</h4>
              <p className="text-sm text-muted-foreground">Converter áudios recebidos em texto</p>
            </div>
            <Switch 
              checked={profileData.transcreve_audio_recebido}
              onCheckedChange={(checked) => setProfileData({...profileData, transcreve_audio_recebido: checked})}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-foreground">Transcrever Áudio Enviado</h4>
              <p className="text-sm text-muted-foreground">Converter áudios enviados em texto</p>
            </div>
            <Switch 
              checked={profileData.transcreve_audio_enviado}
              onCheckedChange={(checked) => setProfileData({...profileData, transcreve_audio_enviado: checked})}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-foreground">Resumir Áudio</h4>
              <p className="text-sm text-muted-foreground">Gerar resumos automáticos dos áudios</p>
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
            <p className="text-xs text-muted-foreground mt-1">
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
            <p className="text-xs text-muted-foreground mt-1">
              Palavras-chave que indicam assuntos importantes, separadas por vírgula
            </p>
          </div>
        </div>

        <Button 
          onClick={handleSave}
          className="w-full"
          disabled={isUpdating}
        >
          {isUpdating ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </CardContent>
    </Card>
  );
};
