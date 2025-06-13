
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import { logoutInstance, deleteInstance } from '@/services/evolutionApiV2';
import { AlertCircle, Phone, Unlink } from 'lucide-react';

export const PhoneSettingsSection = () => {
  const { profile, updateProfile } = useProfile();
  const { toast } = useToast();
  const [numero, setNumero] = useState(profile?.numero || '');
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Verificar se há uma instância conectada
  const hasConnectedInstance = profile?.instance_name;
  const isPhoneFieldLocked = hasConnectedInstance;

  const handleSavePhone = async () => {
    if (!numero.trim()) {
      toast({
        title: "Erro",
        description: "O número de telefone é obrigatório",
        variant: "destructive",
      });
      return;
    }

    const result = await updateProfile({ numero });
    if (result?.success) {
      toast({
        title: "Sucesso!",
        description: "Número de telefone atualizado",
      });
    }
  };

  const handleDisconnectInstance = async () => {
    if (!profile?.instance_name) return;

    setIsDisconnecting(true);
    
    try {
      // Primeiro fazer logout da instância
      await logoutInstance(profile.instance_name);
      
      // Depois deletar a instância
      await deleteInstance(profile.instance_name);
      
      // Limpar dados locais
      await updateProfile({ instance_name: null });
      
      toast({
        title: "Desconectado",
        description: "WhatsApp desconectado com sucesso. Agora você pode alterar o número de telefone.",
      });

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
          <Phone className="w-5 h-5" />
          <span>Configurações do Telefone</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="numero">Número do WhatsApp</Label>
          <Input
            id="numero"
            type="tel"
            placeholder="Ex: 5511999999999"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
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

        {isPhoneFieldLocked ? (
          <div className="space-y-3">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <h4 className="font-medium text-amber-800 mb-1">WhatsApp Conectado</h4>
              <p className="text-sm text-amber-700">
                Para alterar o número de telefone, é necessário desconectar o WhatsApp primeiro.
              </p>
              <p className="text-xs text-amber-600 mt-1">
                Instância: <code>{profile?.instance_name}</code>
              </p>
            </div>
            
            <Button 
              onClick={handleDisconnectInstance}
              disabled={isDisconnecting}
              variant="destructive"
              className="w-full"
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
        ) : (
          <Button 
            onClick={handleSavePhone}
            disabled={!numero.trim() || numero === profile?.numero}
            className="w-full"
          >
            Salvar Número
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
