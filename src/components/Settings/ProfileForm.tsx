import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Profile } from '@/hooks/useProfile'; // Importação corrigida
import { User, Phone, MessageSquare, Clock, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
    temas_urgentes: profile.temas_urgentes || '',
    temas_importantes: profile.temas_importantes || '',
    transcreve_audio_recebido: profile.transcreve_audio_recebido ?? true,
    transcreve_audio_enviado: profile.transcreve_audio_enviado ?? true,
    resume_audio: profile.resume_audio ?? false,
    segundos_para_resumir: profile.segundos_para_resumir || 45,
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome.trim()) {
      toast({
        title: "Erro",
        description: "O nome é obrigatório",
        variant: "destructive",
      });
      return;
    }

    try {
      await onSave(formData);
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Informações Pessoais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="w-5 h-5 text-primary" />
            <span>Informações Pessoais</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                type="text"
                value={formData.nome}
                onChange={(e) => handleInputChange('nome', e.target.value)}
                placeholder="Seu nome completo"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="numero">
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4" />
                  <span>Número do WhatsApp</span>
                </div>
              </Label>
              <Input
                id="numero"
                type="tel"
                value={formData.numero}
                onChange={(e) => handleInputChange('numero', e.target.value)}
                placeholder="Ex: 5511999999999"
                maxLength={13}
              />
              <p className="text-sm text-muted-foreground">
                Digite apenas números, incluindo código do país (55) e DDD
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Palavras-Chave */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <span>Configuração de Palavras-Chave</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Como funciona a classificação:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-700">
                  <li>Mensagens com <strong>palavras urgentes</strong> serão priorizadas</li>
                  <li>Mensagens com <strong>palavras importantes</strong> terão prioridade menor</li>
                  <li>Mensagens sem essas palavras serão ignoradas</li>
                  <li>Revise suas palavras periodicamente para melhor classificação</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="temas_urgentes">Palavras-Chave Urgentes</Label>
            <Textarea
              id="temas_urgentes"
              value={formData.temas_urgentes}
              onChange={(e) => handleInputChange('temas_urgentes', e.target.value)}
              placeholder="urgente, amor, falar com voce, me liga, ligar, ligacao, retorna"
              rows={3}
            />
            <p className="text-sm text-muted-foreground">
              Separe as palavras por vírgula. Mensagens com essas palavras terão prioridade máxima.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="temas_importantes">Palavras-Chave Importantes</Label>
            <Textarea
              id="temas_importantes"
              value={formData.temas_importantes}
              onChange={(e) => handleInputChange('temas_importantes', e.target.value)}
              placeholder="orcamentos, material eletrico, material, comprar"
              rows={3}
            />
            <p className="text-sm text-muted-foreground">
              Separe as palavras por vírgula. Mensagens com essas palavras terão prioridade média.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Configurações de Áudio */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-primary" />
            <span>Configurações de Áudio</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Transcrever áudios recebidos</Label>
                <p className="text-sm text-muted-foreground">
                  Converte áudios recebidos em texto para análise
                </p>
              </div>
              <Switch
                checked={formData.transcreve_audio_recebido}
                onCheckedChange={(checked) => handleInputChange('transcreve_audio_recebido', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Transcrever áudios enviados</Label>
                <p className="text-sm text-muted-foreground">
                  Converte áudios enviados em texto para histórico
                </p>
              </div>
              <Switch
                checked={formData.transcreve_audio_enviado}
                onCheckedChange={(checked) => handleInputChange('transcreve_audio_enviado', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Resumir áudios longos</Label>
                <p className="text-sm text-muted-foreground">
                  Cria resumos de áudios que excedem o tempo limite
                </p>
              </div>
              <Switch
                checked={formData.resume_audio}
                onCheckedChange={(checked) => handleInputChange('resume_audio', checked)}
              />
            </div>

            {formData.resume_audio && (
              <div className="space-y-2 ml-4 pl-4 border-l-2 border-primary/20">
                <Label htmlFor="segundos_para_resumir">Tempo limite para resumo (segundos)</Label>
                <Input
                  id="segundos_para_resumir"
                  type="number"
                  min="30"
                  max="300"
                  value={formData.segundos_para_resumir}
                  onChange={(e) => handleInputChange('segundos_para_resumir', parseInt(e.target.value))}
                />
                <p className="text-sm text-muted-foreground">
                  Áudios maiores que este tempo serão resumidos automaticamente
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Botão de Salvar */}
      <div className="flex justify-end">
        <Button 
          type="submit" 
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-8"
          disabled={isUpdating}
        >
          {isUpdating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Salvando...
            </>
          ) : (
            'Salvar Configurações'
          )}
        </Button>
      </div>
    </form>
  );
};
