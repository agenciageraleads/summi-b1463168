import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { useFeedback } from '@/hooks/useFeedback';
import { Star, MessageSquare, Lightbulb, Bug } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { useTranslation } from 'react-i18next';

const FeedbackPage = () => {
  const { t } = useTranslation();
  const [feedbackType, setFeedbackType] = useState<'avaliacao' | 'sugestao' | 'bug'>('avaliacao');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rating, setRating] = useState<number>(5);
  const { submitFeedback, isSubmitting } = useFeedback();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const success = await submitFeedback({
      type: feedbackType,
      title,
      description,
      rating: feedbackType === 'avaliacao' ? rating : undefined
    });

    if (success) {
      setTitle('');
      setDescription('');
      setRating(5);
      setFeedbackType('avaliacao');
    }
  };

  const feedbackTypes = [
    {
      value: 'avaliacao',
      label: t('evaluation', { defaultValue: 'Avaliação' }),
      description: t('evaluation_desc', { defaultValue: 'Compartilhe sua experiência com a Summi' }),
      icon: Star,
      color: 'text-yellow-500'
    },
    {
      value: 'sugestao',
      label: t('suggestion', { defaultValue: 'Sugestão' }),
      description: t('suggestion_desc', { defaultValue: 'Sugira melhorias ou novas funcionalidades' }),
      icon: Lightbulb,
      color: 'text-blue-500'
    },
    {
      value: 'bug',
      label: t('report_bug', { defaultValue: 'Reportar Bug' }),
      description: t('report_bug_desc', { defaultValue: 'Relate problemas ou erros encontrados' }),
      icon: Bug,
      color: 'text-red-500'
    }
  ];

  return (
    <DashboardLayout>
      <SEO
        title={t('feedback')}
        description={t('feedback_desc')}
        noIndex
        author="Summi"
      />
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-summi-gray-900">{t('feedback')}</h1>
          <p className="text-summi-gray-600 mt-2">
            {t('feedback_desc')}
          </p>
        </div>

        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold flex items-center space-x-2">
              <MessageSquare className="w-5 h-5 text-summi-green" />
              <span>{t('send_feedback', { defaultValue: 'Enviar Feedback' })}</span>
            </h2>
            <CardDescription>
              {t('choose_feedback_type', { defaultValue: 'Escolha o tipo de feedback e compartilhe seus comentários' })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Tipo de Feedback */}
              <div className="space-y-4">
                <Label className="text-base font-medium">{t('feedback_type', { defaultValue: 'Tipo de Feedback' })}</Label>
                <RadioGroup
                  value={feedbackType}
                  onValueChange={(value) => setFeedbackType(value as 'avaliacao' | 'sugestao' | 'bug')}
                  className="grid md:grid-cols-3 gap-4"
                >
                  {feedbackTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <div key={type.value}>
                        <RadioGroupItem
                          value={type.value}
                          id={type.value}
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor={type.value}
                          className="flex flex-col items-center justify-center p-4 border-2 border-summi-gray-200 rounded-lg cursor-pointer hover:border-summi-green/50 peer-checked:border-summi-green peer-checked:bg-summi-green/5 transition-all"
                        >
                          <Icon className={`w-8 h-8 mb-2 ${type.color}`} />
                          <span className="font-medium text-summi-gray-900">{type.label}</span>
                          <span className="text-xs text-summi-gray-500 text-center mt-1">
                            {type.description}
                          </span>
                        </Label>
                      </div>
                    );
                  })}
                </RadioGroup>
              </div>

              {/* Avaliação com Estrelas (apenas para tipo avaliacao) */}
              {feedbackType === 'avaliacao' && (
                <div className="space-y-3">
                  <Label htmlFor="rating" className="text-base font-medium">
                    {t('overall_rating', { defaultValue: 'Avaliação Geral' })}
                  </Label>
                  <div className="flex space-x-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className={`p-1 transition-colors ${star <= rating ? 'text-yellow-400' : 'text-summi-gray-300'
                          } hover:text-yellow-400`}
                      >
                        <Star className="w-6 h-6 fill-current" />
                      </button>
                    ))}
                  </div>
                  <p className="text-sm text-summi-gray-500">
                    {rating === 1 && t('very_dissatisfied', { defaultValue: 'Muito insatisfeito' })}
                    {rating === 2 && t('dissatisfied', { defaultValue: 'Insatisfeito' })}
                    {rating === 3 && t('neutral', { defaultValue: 'Neutro' })}
                    {rating === 4 && t('satisfied', { defaultValue: 'Satisfeito' })}
                    {rating === 5 && t('very_satisfied', { defaultValue: 'Muito satisfeito' })}
                  </p>
                </div>
              )}

              {/* Título */}
              <div className="space-y-2">
                <Label htmlFor="title" className="text-base font-medium">
                  {t('title', { defaultValue: 'Título' })}
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    feedbackType === 'avaliacao' ? t('feedback_placeholder_eval', { defaultValue: 'Ex: Experiência geral com a plataforma' }) :
                      feedbackType === 'sugestao' ? t('feedback_placeholder_sugg', { defaultValue: 'Ex: Melhorar interface de configurações' }) :
                        t('feedback_placeholder_bug', { defaultValue: 'Ex: Erro ao conectar WhatsApp' })
                  }
                  required
                />
              </div>

              {/* Descrição */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-base font-medium">
                  {t('description', { defaultValue: 'Descrição' })}
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={
                    feedbackType === 'avaliacao' ? t('desc_placeholder_eval', { defaultValue: 'Conte-nos sobre sua experiência usando a Summi...' }) :
                      feedbackType === 'sugestao' ? t('desc_placeholder_sugg', { defaultValue: 'Descreva sua sugestão de melhoria...' }) :
                        t('desc_placeholder_bug', { defaultValue: 'Descreva o problema encontrado, quando aconteceu e os passos para reproduzi-lo...' })
                  }
                  rows={6}
                  required
                />
              </div>

              {/* Botão de Envio */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-summi-gradient hover:opacity-90 text-white"
              >
                {isSubmitting ? t('sending', { defaultValue: 'Enviando...' }) : t('send_feedback', { defaultValue: 'Enviar Feedback' })}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Informações Adicionais */}
        <Card className="bg-summi-gray-50 border-summi-gray-200">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <h3 className="font-semibold text-summi-gray-900">
                {t('thanks_for_time', { defaultValue: 'Obrigado pelo seu tempo!' })}
              </h3>
              <p className="text-sm text-summi-gray-600">
                {t('thanks_desc', { defaultValue: 'Sua opinião nos ajuda a criar uma experiência melhor para todos os usuários. Nossa equipe analisa cada feedback recebido.' })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default FeedbackPage;
