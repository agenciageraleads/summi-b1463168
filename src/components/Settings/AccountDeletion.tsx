
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';

export const AccountDeletion = () => {
  const { deleteAccount } = useProfile();
  const { toast } = useToast();
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleDeleteAccount = async () => {
    if (confirmText !== 'DELETAR') {
      toast({
        title: "Confirmação necessária",
        description: "Digite 'DELETAR' para confirmar a exclusão da conta",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    
    try {
      console.log('🗑️ Iniciando processo de exclusão da conta...');
      
      const result = await deleteAccount();
      
      console.log('📋 Resultado da exclusão:', result);
      
      if (result.success) {
        toast({
          title: "Conta deletada",
          description: "Sua conta foi deletada com sucesso. Você será redirecionado para a página inicial.",
          variant: "default",
        });
        
        // O redirecionamento será feito automaticamente pelo AuthContext
        setIsOpen(false);
        setConfirmText('');
      } else {
        console.error('❌ Erro na exclusão:', result.error);
        toast({
          title: "Erro na exclusão",
          description: result.error || "Não foi possível deletar a conta. Tente novamente.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('🚨 Erro crítico ao deletar conta:', error);
      toast({
        title: "Erro crítico",
        description: "Erro inesperado ao tentar deletar a conta. Entre em contato com o suporte.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="border-destructive shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-destructive">
          <span>⚠️</span>
          <span>Zona de Perigo</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-medium text-foreground mb-2">Deletar Conta</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Esta ação é irreversível. Todos os seus dados serão permanentemente removidos, incluindo:
          </p>
          <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 mb-4">
            <li>Perfil e configurações</li>
            <li>Histórico de conversas</li>
            <li>Instância do WhatsApp</li>
            <li>Todos os dados associados à sua conta</li>
          </ul>
        </div>

        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full">
              Deletar Conta Permanentemente
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Isso irá deletar permanentemente sua conta
                e remover todos os seus dados de nossos servidores.
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="confirm">Digite "DELETAR" para confirmar:</Label>
                <Input
                  id="confirm"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="DELETAR"
                  className="mt-1"
                />
              </div>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConfirmText('')}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                disabled={isDeleting || confirmText !== 'DELETAR'}
                className="bg-destructive hover:bg-destructive/90"
              >
                {isDeleting ? 'Deletando...' : 'Deletar Conta'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};
