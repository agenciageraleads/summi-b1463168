import { useState } from 'react';
import { Loader2, Mail } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const PasswordResetCard = () => {
  const { user, resetPassword } = useAuth();
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);

  const email = user?.email ?? '';

  const handleSendResetEmail = async () => {
    if (!email) {
      toast({
        title: 'E-mail não encontrado',
        description: 'Não conseguimos identificar seu e-mail de login. Faça login novamente e tente de novo.',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);
    try {
      await resetPassword(email);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Senha</CardTitle>
        <CardDescription>Envie um link de redefinição para o seu e-mail de login.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-muted/30 p-4 text-sm">
          <div className="font-medium text-foreground">Como funciona</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            <li>Enviamos um link para o seu e-mail cadastrado.</li>
            <li>Abra o link e escolha uma nova senha.</li>
            <li>Se não chegar, verifique Spam/Lixo Eletrônico.</li>
          </ul>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="text-sm font-medium">E-mail</div>
            <div className="truncate text-sm text-muted-foreground">{email || '—'}</div>
          </div>

          <Button type="button" onClick={handleSendResetEmail} disabled={isSending || !email} className="sm:shrink-0">
            {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
            {isSending ? 'Enviando...' : 'Enviar link'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

