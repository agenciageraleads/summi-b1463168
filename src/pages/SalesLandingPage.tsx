import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Check, Clock, CreditCard, Loader2, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createCheckoutSession } from '@/hooks/useSubscription';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type PlanType = 'monthly' | 'annual';

const SalesLandingPage = () => {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const referralCode =
    searchParams.get('ref') || searchParams.get('referral') || searchParams.get('referralCode') || undefined;

  const [selectedPlan, setSelectedPlan] = useState<PlanType>('annual');
  const [isLoading, setIsLoading] = useState(false);

  const plans = useMemo(() => {
    return {
      annual: {
        id: 'annual' as const,
        name: 'Plano Anual',
        kicker: 'Recomendado (economiza 33%)',
        price: 'R$ 29,90',
        period: '/mês',
        billed: 'Cobrança anual (equivale a R$ 358,80/ano)',
        trial: '30 dias grátis para testar',
        cta: 'Continuar com desconto',
      },
      monthly: {
        id: 'monthly' as const,
        name: 'Plano Mensal',
        kicker: 'Flexível (cancele quando quiser)',
        price: 'R$ 47,90',
        period: '/mês',
        billed: 'Cobrança mensal',
        trial: '7 dias grátis para testar',
        cta: 'Continuar no mensal',
      },
    };
  }, []);

  const selected = plans[selectedPlan];

  const handleCheckout = async () => {
    try {
      setIsLoading(true);
      await createCheckoutSession(selectedPlan, referralCode);
    } catch (error) {
      toast({
        title: 'Erro ao iniciar o checkout',
        description: 'Não foi possível abrir o Stripe agora. Tente novamente em instantes.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-summi-green/10 via-background to-background">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <img
              src="/lovable-uploads/8d37281c-dfb2-4e98-93c9-888cccd6a706.png"
              alt="Summi"
              className="h-8 w-8 rounded-xl"
            />
            <span className="text-base font-semibold tracking-tight">Summi</span>
          </div>
          <Link to="/login" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
            Já tenho conta
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-8 px-4 pb-28 pt-6">
        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-summi-green/15 text-summi-green border-summi-green/20" variant="outline">
              IA para WhatsApp
            </Badge>
            <Badge variant="secondary">Ative em 2 minutos</Badge>
          </div>

          <h1 className="text-3xl font-semibold leading-tight tracking-tight">
            Pare de perder mensagens importantes.
          </h1>
          <p className="text-base text-muted-foreground">
            A Summi transcreve áudios, resume conversas e destaca o que é urgente/importante — para você responder
            mais rápido e com menos esforço.
          </p>

          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 text-summi-green" />
              <span>Transcrição e resumo de áudios (recebidos e enviados)</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 text-summi-green" />
              <span>Prioriza conversas (urgente / hoje / mais tarde)</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 text-summi-green" />
              <span>“Summi da Hora” com os pontos mais importantes</span>
            </li>
          </ul>
        </section>

        <Card className="border-summi-green/25 bg-summi-green/5">
          <CardHeader className="space-y-2 pb-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Clock className="h-4 w-4 text-summi-green" />
              <span>Comece agora, sem complicação</span>
            </div>
            <CardDescription>
              Você escolhe o plano, paga no Stripe (checkout seguro) e cria sua senha no final. Depois é só conectar o
              WhatsApp.
            </CardDescription>
          </CardHeader>
        </Card>

        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-xl font-semibold tracking-tight">Escolha seu plano</h2>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Stripe</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSelectedPlan('annual')}
            aria-pressed={selectedPlan === 'annual'}
            className={cn(
              'w-full text-left',
              'rounded-xl border bg-card transition-colors',
              selectedPlan === 'annual' ? 'border-summi-green ring-2 ring-summi-green/20' : 'border-border'
            )}
          >
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-base font-semibold">{plans.annual.name}</div>
                    <Badge className="bg-summi-green text-white">Melhor oferta</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">{plans.annual.kicker}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-semibold">
                    {plans.annual.price}
                    <span className="text-sm font-normal text-muted-foreground">{plans.annual.period}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{plans.annual.billed}</div>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-summi-green" />
                <span className="font-medium">{plans.annual.trial}</span>
              </div>

              <div className="mt-3 grid gap-2 text-sm">
                <div className="flex items-start gap-2 text-muted-foreground">
                  <Zap className="mt-0.5 h-4 w-4 text-summi-green" />
                  <span>Economia anual + mais tempo para testar.</span>
                </div>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSelectedPlan('monthly')}
            aria-pressed={selectedPlan === 'monthly'}
            className={cn(
              'w-full text-left',
              'rounded-xl border bg-card transition-colors',
              selectedPlan === 'monthly' ? 'border-summi-green ring-2 ring-summi-green/20' : 'border-border'
            )}
          >
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-base font-semibold">{plans.monthly.name}</div>
                  <div className="text-xs text-muted-foreground">{plans.monthly.kicker}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-semibold">
                    {plans.monthly.price}
                    <span className="text-sm font-normal text-muted-foreground">{plans.monthly.period}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{plans.monthly.billed}</div>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-summi-green" />
                <span className="font-medium">{plans.monthly.trial}</span>
              </div>
            </div>
          </button>
        </section>

        <section className="space-y-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">O que acontece depois?</CardTitle>
              <CardDescription>3 passos simples para começar.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-summi-green/15 text-summi-green text-xs font-semibold">
                  1
                </div>
                <div>
                  <div className="font-medium">Checkout no Stripe</div>
                  <div className="text-muted-foreground">Pagamento seguro. Você não precisa instalar nada.</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-summi-green/15 text-summi-green text-xs font-semibold">
                  2
                </div>
                <div>
                  <div className="font-medium">Crie sua senha</div>
                  <div className="text-muted-foreground">Ao finalizar, você define sua senha e entra.</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-summi-green/15 text-summi-green text-xs font-semibold">
                  3
                </div>
                <div>
                  <div className="font-medium">Conecte o WhatsApp</div>
                  <div className="text-muted-foreground">Escaneie o QR code e pronto — a Summi começa a trabalhar.</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground">
            Ao iniciar o teste, sua assinatura fica ativa e renova automaticamente ao final do período grátis. Você pode
            cancelar a qualquer momento.
          </p>
        </section>

        <footer className="space-y-2 pb-2 text-center text-xs text-muted-foreground">
          <div className="flex items-center justify-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span>Pagamento processado pelo Stripe</span>
          </div>
          <div>
            Ao continuar, você concorda com os <Link className="underline underline-offset-4" to="/terms">Termos</Link>.
          </div>
        </footer>
      </main>

      <div className="fixed bottom-0 left-0 right-0 border-t bg-background/90 backdrop-blur">
        <div className="mx-auto max-w-md px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] text-muted-foreground">Plano selecionado</div>
              <div className="truncate text-sm font-medium">
                {selected.name} • {selected.trial}
              </div>
            </div>

            <Button onClick={handleCheckout} disabled={isLoading} className="shrink-0 bg-summi-gradient text-white">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {selected.cta}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesLandingPage;
