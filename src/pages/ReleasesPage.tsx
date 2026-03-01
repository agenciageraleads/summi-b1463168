
import React from 'react';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Rocket, Zap, Bug, Sparkles, Clock } from 'lucide-react';

const releases = [
    {
        version: 'v1.2.2',
        date: '1 de Março, 2026',
        title: 'Blindagem do Summi da Hora e Resumo de Áudio',
        type: 'major',
        changes: [
            {
                type: 'fix',
                text: 'Summi da Hora sem invenção: quando não há demandas prioritárias, o áudio agora usa uma resposta fixa e determinística, sem depender de IA.',
                icon: Bug
            },
            {
                type: 'fix',
                text: 'Proteção contra auto-eco: a Summi passou a ignorar a conversa interna da própria instância, evitando reprocessar mensagens e áudios dela mesma.',
                icon: Bug
            },
            {
                type: 'improvement',
                text: 'Resumo de áudio contextual: áudios curtos recebem um resumo direto; áudios mais densos passam a sair organizados por assunto principal, assuntos discutidos e atividades.',
                icon: Sparkles
            },
            {
                type: 'improvement',
                text: 'Prompts do worker reforçados: o roteiro falado do Summi da Hora agora recebe instruções explícitas para não inventar conteúdo e manter a fala objetiva no trânsito.',
                icon: Zap
            }
        ]
    },
    {
        version: 'v1.2.1',
        date: '28 de Fevereiro, 2026',
        title: 'Correções Críticas de Fluxo e Métricas',
        type: 'major',
        changes: [
            {
                type: 'fix',
                text: 'Citações no WhatsApp: respostas de transcrição e resumo agora voltam a marcar corretamente o áudio original no balão da conversa.',
                icon: Bug
            },
            {
                type: 'improvement',
                text: 'Resumo por duração real: a Summi passou a medir a duração do áudio antes de resumir, inclusive em transcrições disparadas por reação ⚡.',
                icon: Zap
            },
            {
                type: 'improvement',
                text: 'Dashboard com memória: os segundos de áudios processados agora são acumulados no perfil e continuam aparecendo mesmo depois que a conversa sai da lista.',
                icon: Sparkles
            },
            {
                type: 'improvement',
                text: 'Configurações refinadas: frequência dos relatórios por usuário, rotas públicas legais e status da assinatura ficaram consistentes com os dados reais do checkout.',
                icon: Rocket
            }
        ]
    },
    {
        version: 'v1.2.0',
        date: '28 de Fevereiro, 2026',
        title: 'Inteligência Contextual e Refinamentos',
        type: 'major',
        changes: [
            {
                type: 'feature',
                text: 'Personalização da IA: Agora a Summi utiliza seus "Temas Urgentes" e "Importantes" para priorizar e resumir mensagens.',
                icon: Sparkles
            },
            {
                type: 'improvement',
                text: 'Resumo de Áudio Inteligente: O sistema agora respeita a duração mínima configurada no seu perfil para decidir quando resumir.',
                icon: Zap
            },
            {
                type: 'fix',
                text: 'Citações no WhatsApp: Corrigido o erro que impedia a Summi de responder citando a mensagem original no balão do WhatsApp.',
                icon: Bug
            },
            {
                type: 'improvement',
                text: 'Novos Planos: Atualização completa da precificação e integração com novos IDs de checkout do Stripe.',
                icon: Rocket
            }
        ]
    },
    {
        version: 'v1.1.5',
        date: '25 de Fevereiro, 2026',
        title: 'Segurança e Onboarding',
        type: 'minor',
        changes: [
            {
                type: 'feature',
                text: 'Fluxo de Onboarding: Sequência de mensagens explicativas ao conectar o WhatsApp pela primeira vez.',
                icon: Sparkles
            },
            {
                type: 'fix',
                text: 'Trava de Privacidade: Agora a Summi só processa reações disparadas pelo dono da conta, ignorando reações de terceiros.',
                icon: Bug
            },
            {
                type: 'improvement',
                text: 'Estabilidade de Conexão: Melhoria no heartbeat das instâncias para evitar desconexões aleatórias.',
                icon: Zap
            }
        ]
    },
    {
        version: 'v1.1.0',
        date: '20 de Fevereiro, 2026',
        title: 'Nova Interface e Performance',
        type: 'minor',
        changes: [
            {
                type: 'improvement',
                text: 'Landing Pages Premium: Redesign completo das páginas de venda e institucional.',
                icon: Sparkles
            },
            {
                type: 'improvement',
                text: 'Dashboard mais rápido: Otimização de queries no Supabase para carregamento instantâneo das conversas.',
                icon: Zap
            }
        ]
    },
    {
        version: 'v1.0.0',
        date: '10 de Fevereiro, 2026',
        title: 'Lançamento Oficial',
        type: 'major',
        changes: [
            {
                type: 'feature',
                text: 'Lançamento da Summi: Sua secretária invisível para WhatsApp com transcrição, resumo e priorização de mensagens.',
                icon: Rocket
            }
        ]
    }
];

const ReleasesPage = () => {
    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto space-y-8 py-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Novidades & Releases 🚀</h1>
                    <p className="text-muted-foreground mt-2">
                        Acompanhe a evolução da Summi. Estamos sempre trabalhando para tornar sua rotina mais produtiva.
                    </p>
                </div>

                <div className="space-y-6">
                    {releases.map((release, index) => (
                        <Card key={release.version} className={`border-l-4 ${index === 0 ? 'border-l-summi-green' : 'border-l-slate-300'} shadow-sm hover:shadow-md transition-shadow`}>
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                    <div className="flex items-center space-x-3">
                                        <Badge variant={index === 0 ? "default" : "secondary"} className={index === 0 ? "bg-summi-green" : ""}>
                                            {release.version}
                                        </Badge>
                                        <CardTitle className="text-xl">{release.title}</CardTitle>
                                    </div>
                                    <div className="flex items-center text-sm text-muted-foreground">
                                        <Clock className="w-4 h-4 mr-1" />
                                        {release.date}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-4">
                                    {release.changes.map((change, i) => {
                                        const Icon = change.icon;
                                        return (
                                            <li key={i} className="flex items-start space-x-3">
                                                <div className={`mt-0.5 p-1 rounded-full ${change.type === 'feature' ? 'bg-blue-100 text-blue-600' :
                                                        change.type === 'improvement' ? 'bg-amber-100 text-amber-600' :
                                                            'bg-red-100 text-red-600'
                                                    }`}>
                                                    <Icon className="w-3.5 h-3.5" />
                                                </div>
                                                <span className="text-slate-700 leading-relaxed text-sm lg:text-base">
                                                    {change.text}
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                    <p className="text-slate-600 text-sm italic">
                        "Nossa missão é devolver a você o controle do seu tempo."
                    </p>
                    <p className="text-slate-400 text-xs mt-2">— Time Summi</p>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default ReleasesPage;
