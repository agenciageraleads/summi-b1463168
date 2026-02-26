import React, { useEffect, useMemo, useState } from 'react';
import { Info, Loader2, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import type { Profile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type SuggestionMode = 'personal' | 'professional';

type Suggestions = {
  urgentes: string[];
  importantes: string[];
};

interface ThemesFormProps {
  profile: Profile;
  onSave: (data: Partial<Profile>) => Promise<void>;
  isUpdating: boolean;
}

const parseKeywords = (text: string) =>
  text
    .split(/[,;\n]/g)
    .map((k) => k.trim())
    .filter(Boolean);

const MAX_THEMES_CHARS = 500;

const mergeKeywords = (existing: string, incoming: string[], maxChars: number = MAX_THEMES_CHARS) => {
  const base = parseKeywords(existing);
  const seen = new Set(base.map((k) => k.toLowerCase()));
  const merged = [...base];
  for (const k of incoming) {
    const key = k.trim();
    if (!key) continue;
    const lower = key.toLowerCase();
    if (seen.has(lower)) continue;
    const candidate = [...merged, key].join(', ');
    if (candidate.length > maxChars) break;
    seen.add(lower);
    merged.push(key);
  }
  return merged.join(', ');
};

export const ThemesForm: React.FC<ThemesFormProps> = ({ profile, onSave, isUpdating }) => {
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    temas_importantes: profile.temas_importantes || '',
    temas_urgentes: profile.temas_urgentes || '',
  });

  useEffect(() => {
    setFormData({
      temas_importantes: profile.temas_importantes || '',
      temas_urgentes: profile.temas_urgentes || '',
    });
  }, [profile]);

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formData);
  };

  // AI Wizard
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2>(1);
  const [mode, setMode] = useState<SuggestionMode>('professional');
  const [age, setAge] = useState<string>('');
  const [isMarried, setIsMarried] = useState<'yes' | 'no'>('no');
  const [hasKids, setHasKids] = useState<'yes' | 'no'>('no');
  const [profession, setProfession] = useState<string>('');
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const resetWizard = () => {
    setWizardStep(1);
    setMode('professional');
    setAge('');
    setIsMarried('no');
    setHasKids('no');
    setProfession('');
    setSuggestions(null);
    setIsGenerating(false);
    setGenerationError(null);
  };

  const openWizard = () => {
    resetWizard();
    setIsWizardOpen(true);
  };

  const canGenerate = useMemo(() => {
    if (mode === 'professional') return profession.trim().length >= 2;
    const ageNumber = Number(age);
    return Number.isFinite(ageNumber) && ageNumber >= 12 && ageNumber <= 120;
  }, [age, mode, profession]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    setSuggestions(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        throw new Error('Você precisa estar logado para gerar sugestões.');
      }

      const body =
        mode === 'professional'
          ? {
              mode,
              profession: profession.trim(),
              locale: 'pt-BR',
            }
          : {
              mode,
              age: Number(age),
              is_married: isMarried === 'yes',
              has_kids: hasKids === 'yes',
              locale: 'pt-BR',
            };

      const { data, error } = await supabase.functions.invoke('suggest-themes', {
        body,
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (error) {
        throw new Error(error.message || 'Erro ao gerar sugestões.');
      }

      const parsed = data as Partial<Suggestions> | null;
      const urgentes = Array.isArray(parsed?.urgentes) ? parsed!.urgentes.filter((x) => typeof x === 'string') : [];
      const importantes = Array.isArray(parsed?.importantes)
        ? parsed!.importantes.filter((x) => typeof x === 'string')
        : [];

      if (urgentes.length === 0 && importantes.length === 0) {
        throw new Error('Não foi possível gerar sugestões. Tente novamente.');
      }

      setSuggestions({
        urgentes: urgentes.slice(0, 25),
        importantes: importantes.slice(0, 25),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro inesperado ao gerar sugestões.';
      setGenerationError(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const applySuggestions = () => {
    if (!suggestions) return;
    setFormData((prev) => ({
      temas_urgentes: mergeKeywords(prev.temas_urgentes, suggestions.urgentes),
      temas_importantes: mergeKeywords(prev.temas_importantes, suggestions.importantes),
    }));
    setIsWizardOpen(false);
    toast({
      title: 'Sugestões aplicadas',
      description: 'Revise os campos e clique em salvar quando estiver pronto.',
    });
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle>Temas de Interesse</CardTitle>
              <CardDescription>Ajude a Summi a identificar o que é urgente e importante nas suas conversas.</CardDescription>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={openWizard} className="shrink-0">
              <Wand2 className="h-4 w-4 mr-2" />
              Sugestões com IA
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Como configurar (sem dúvidas)</AlertTitle>
              <AlertDescription>
                <ul className="list-disc space-y-1 pl-5">
                  <li>
                    Separe por vírgula (ex: <span className="font-medium">pagamento, orçamento, me liga</span>). Pode usar frases curtas.
                  </li>
                  <li>
                    <span className="font-medium">Urgentes</span> = quase sempre exige ação rápida. <span className="font-medium">Importantes</span> = relevante, mas não necessariamente agora.
                  </li>
                  <li>
                    Não precisa ser perfeito: isso só orienta a IA — o contexto da conversa ainda conta.
                  </li>
                  <li>Isso influencia a prioridade (0–3) e o que aparece como urgente/importante no dashboard.</li>
                  <li>Quer acelerar? Use “Sugestões com IA”, revise, e só então clique em salvar.</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="temas_urgentes">Temas Urgentes</Label>
              <Textarea
                id="temas_urgentes"
                value={formData.temas_urgentes}
                onChange={(e) => handleInputChange('temas_urgentes', e.target.value)}
                placeholder="Ex: urgente, amor, falar com você, me liga..."
                className="min-h-[90px]"
              />
              <p className="text-xs text-muted-foreground">
                Use termos que normalmente pedem resposta rápida (ex: “agora”, “problema”, “cancelar”, “pagamento”, “hospital”).
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="temas_importantes">Temas Importantes</Label>
              <Textarea
                id="temas_importantes"
                value={formData.temas_importantes}
                onChange={(e) => handleInputChange('temas_importantes', e.target.value)}
                placeholder="Ex: orçamentos, proposta, comprar..."
                className="min-h-[90px]"
              />
              <p className="text-xs text-muted-foreground">
                Assuntos que você não quer perder (ex: “proposta”, “entrega”, “contrato”, “escola”, “agenda”, “viagem”).
              </p>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={isUpdating}>
          {isUpdating ? 'Salvando...' : 'Salvar temas'}
        </Button>
      </form>

      <Dialog open={isWizardOpen} onOpenChange={(open) => (open ? setIsWizardOpen(true) : setIsWizardOpen(false))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sugestões de palavras-chave</DialogTitle>
            <DialogDescription>
              Responda rapidinho e gere sugestões. Você revisa antes de salvar.
            </DialogDescription>
          </DialogHeader>

          {wizardStep === 1 ? (
            <div className="space-y-4">
              <div className="text-sm font-medium">Como você usa a Summi?</div>
              <RadioGroup value={mode} onValueChange={(v) => setMode(v as SuggestionMode)} className="gap-3">
                <label className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/50">
                  <RadioGroupItem value="personal" className="mt-1" />
                  <div>
                    <div className="font-medium">Uso pessoal</div>
                    <div className="text-sm text-muted-foreground">Família, relacionamento, vida pessoal.</div>
                  </div>
                </label>
                <label className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/50">
                  <RadioGroupItem value="professional" className="mt-1" />
                  <div>
                    <div className="font-medium">Uso profissional</div>
                    <div className="text-sm text-muted-foreground">Clientes, trabalho, equipe, projetos.</div>
                  </div>
                </label>
              </RadioGroup>
            </div>
          ) : (
            <div className="space-y-4">
              {mode === 'personal' ? (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="age">Idade</Label>
                      <Input id="age" inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value)} placeholder="Ex: 29" />
                    </div>
                    <div className="space-y-2">
                      <Label>É casado(a)?</Label>
                      <RadioGroup value={isMarried} onValueChange={(v) => setIsMarried(v as 'yes' | 'no')} className="grid grid-cols-2 gap-2">
                        <label className="flex items-center gap-2 rounded-md border p-2 text-sm hover:bg-muted/50">
                          <RadioGroupItem value="yes" />
                          Sim
                        </label>
                        <label className="flex items-center gap-2 rounded-md border p-2 text-sm hover:bg-muted/50">
                          <RadioGroupItem value="no" />
                          Não
                        </label>
                      </RadioGroup>
                    </div>
                    <div className="space-y-2">
                      <Label>Tem filhos?</Label>
                      <RadioGroup value={hasKids} onValueChange={(v) => setHasKids(v as 'yes' | 'no')} className="grid grid-cols-2 gap-2">
                        <label className="flex items-center gap-2 rounded-md border p-2 text-sm hover:bg-muted/50">
                          <RadioGroupItem value="yes" />
                          Sim
                        </label>
                        <label className="flex items-center gap-2 rounded-md border p-2 text-sm hover:bg-muted/50">
                          <RadioGroupItem value="no" />
                          Não
                        </label>
                      </RadioGroup>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Esses dados são usados só para gerar sugestões (não são salvos).
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="profession">Qual sua profissão?</Label>
                  <Input
                    id="profession"
                    value={profession}
                    onChange={(e) => setProfession(e.target.value)}
                    placeholder="Ex: corretor de imóveis, dentista, advogado..."
                  />
                  <div className="text-xs text-muted-foreground">
                    Usamos isso apenas para sugerir temas comuns da sua área.
                  </div>
                </div>
              )}

              <Separator />

              <div className="space-y-3">
                <Button type="button" onClick={handleGenerate} disabled={!canGenerate || isGenerating} className="w-full">
                  {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
                  Gerar sugestões
                </Button>

                {generationError && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                    {generationError}
                  </div>
                )}

                {suggestions && (
                  <div className="space-y-3 rounded-lg border p-3">
                    <div className="text-sm font-medium">Prévia</div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1">Urgentes</div>
                        <div className="text-sm">{suggestions.urgentes.join(', ')}</div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1">Importantes</div>
                        <div className="text-sm">{suggestions.importantes.join(', ')}</div>
                      </div>
                    </div>
                    <Button type="button" variant="secondary" onClick={applySuggestions} className="w-full">
                      Aplicar nos campos
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            {wizardStep === 2 ? (
              <Button type="button" variant="outline" onClick={() => setWizardStep(1)} disabled={isGenerating}>
                Voltar
              </Button>
            ) : null}
            {wizardStep === 1 ? (
              <Button type="button" onClick={() => setWizardStep(2)}>
                Continuar
              </Button>
            ) : (
              <Button type="button" variant="ghost" onClick={() => setIsWizardOpen(false)} disabled={isGenerating}>
                Fechar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
