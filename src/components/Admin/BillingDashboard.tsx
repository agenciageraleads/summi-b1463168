// ABOUTME: Painel de custos admin consumindo endpoint server-side.
// ABOUTME: Exibe agregados por dia, por usuário e logs recentes por operação.

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Brain, DollarSign, Mic, RefreshCw, Volume2 } from 'lucide-react';

interface DailyCost {
  date: string;
  cost_openai_usd: number;
  transcription_cost_usd: number;
  analysis_cost_usd: number;
  summary_cost_usd: number;
  tts_cost_usd: number;
  call_count: number;
  audio_minutes: number;
}

interface UserAggregate {
  user_id: string;
  nome: string | null;
  email: string | null;
  total_cost_usd: number;
  transcription_usd: number;
  analysis_usd: number;
  summary_usd: number;
  tts_usd: number;
  call_count: number;
  audio_minutes: number;
}

interface RecentCostLog {
  user_id: string;
  nome: string | null;
  email: string | null;
  created_at: string;
  operation: string;
  model: string | null;
  cost_usd: number;
  tokens_total: number | null;
  audio_seconds: number | null;
  char_count: number | null;
}

interface BillingResponse {
  success: boolean;
  error?: string;
  exchange_rate_brl: number;
  assumptions?: {
    arpu_blended_brl: number;
  };
  daily_totals: DailyCost[];
  user_aggregates: UserAggregate[];
  recent_logs: RecentCostLog[];
  unit_economics?: {
    active_paid_users: number;
    trials_started: number;
    activations: number;
    activation_rate: number | null;
    converted_paid: number;
    trial_to_paid_conversion: number | null;
    cancel_requested: number;
    subscription_canceled_30d: number;
    churn_rate_30d: number | null;
    past_due_users: number;
    trial_soft_cap_hits: number;
    trial_hard_cap_hits: number;
    marketing_spend_brl: number;
    trial_ai_cost_brl: number;
    paid_ai_cost_brl: number;
    total_ai_cost_brl: number;
    trial_ai_cac_brl: number | null;
    cac_blended_brl: number | null;
    blended_gross_contribution_brl: number;
    contribution_per_active_paid_brl: number | null;
  };
}

async function fetchBillingCosts(period: 7 | 30): Promise<BillingResponse> {
  const { data, error: invokeError } = await supabase.functions.invoke('admin-billing-costs', {
    body: { period },
  });

  if (invokeError) {
    throw invokeError;
  }

  const payload = (data ?? {}) as BillingResponse;
  if (!payload.success) {
    throw new Error(payload.error || 'Não foi possível carregar custos');
  }

  return payload;
}

function fmtUsd(value: number, decimals = 4): string {
  return `$${value.toFixed(decimals)}`;
}

function fmtBrl(valueUsd: number, exchangeRate: number): string {
  return `R$${(valueUsd * exchangeRate).toFixed(2)}`;
}

function fmtBrlValue(value: number | null | undefined): string {
  return `R$${Number(value ?? 0).toFixed(2)}`;
}

function fmtPct(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'n/a';
  return `${(value * 100).toFixed(1)}%`;
}

function userLabel(user: Pick<UserAggregate, 'nome' | 'email' | 'user_id'>): string {
  return user.nome || user.email || `${user.user_id.slice(0, 8)}…`;
}

function logUserLabel(log: Pick<RecentCostLog, 'nome' | 'email' | 'user_id'>): string {
  return log.nome || log.email || `${log.user_id.slice(0, 8)}…`;
}

export const BillingDashboard = () => {
  const [dailyTotals, setDailyTotals] = useState<DailyCost[]>([]);
  const [userAggregates, setUserAggregates] = useState<UserAggregate[]>([]);
  const [recentLogs, setRecentLogs] = useState<RecentCostLog[]>([]);
  const [unitEconomics, setUnitEconomics] = useState<BillingResponse['unit_economics'] | null>(null);
  const [arpuBlended, setArpuBlended] = useState(42.5);
  const [exchangeRate, setExchangeRate] = useState(5.8);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<7 | 30>(30);

  const applyPayload = (payload: BillingResponse) => {
    setExchangeRate(payload.exchange_rate_brl || 5.8);
    setArpuBlended(payload.assumptions?.arpu_blended_brl || 42.5);
    setDailyTotals(payload.daily_totals ?? []);
    setUserAggregates(payload.user_aggregates ?? []);
    setRecentLogs(payload.recent_logs ?? []);
    setUnitEconomics(payload.unit_economics ?? null);
  };

  const load = async (selectedPeriod: 7 | 30 = period) => {
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchBillingCosts(selectedPeriod);
      applyPayload(payload);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    const loadForPeriod = async () => {
      setLoading(true);
      setError(null);
      try {
        const payload = await fetchBillingCosts(period);
        if (!active) return;
        applyPayload(payload);
      } catch (e: unknown) {
        if (!active) return;
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadForPeriod();

    return () => {
      active = false;
    };
  }, [period]);

  const totalPeriod = dailyTotals.reduce((sum, row) => sum + Number(row.cost_openai_usd ?? 0), 0);
  const totalTranscription = dailyTotals.reduce((sum, row) => sum + Number(row.transcription_cost_usd ?? 0), 0);
  const totalAnalysis = dailyTotals.reduce((sum, row) => sum + Number(row.analysis_cost_usd ?? 0), 0);
  const totalSummary = dailyTotals.reduce((sum, row) => sum + Number(row.summary_cost_usd ?? 0), 0);
  const totalTts = dailyTotals.reduce((sum, row) => sum + Number(row.tts_cost_usd ?? 0), 0);
  const totalMinutes = dailyTotals.reduce((sum, row) => sum + Number(row.audio_minutes ?? 0), 0);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-red-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-1 text-3xl font-bold text-gray-900">Billing & Custos</h1>
          <p className="text-sm text-gray-500">Custos reais por operação OpenAI, agregados no servidor.</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(Number(e.target.value) as 7 | 30)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            <option value={7}>Últimos 7 dias</option>
            <option value={30}>Últimos 30 dias</option>
          </select>
          <button
            onClick={() => {
              void load();
            }}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm transition-colors hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Erro ao carregar dados: {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card
          icon={<DollarSign className="h-5 w-5 text-green-600" />}
          label="Total OpenAI"
          value={fmtUsd(totalPeriod, 2)}
          sub={fmtBrl(totalPeriod, exchangeRate)}
        />
        <Card
          icon={<Mic className="h-5 w-5 text-blue-600" />}
          label="Transcrição"
          value={fmtUsd(totalTranscription, 2)}
          sub={`${totalMinutes.toFixed(0)} min`}
        />
        <Card
          icon={<Brain className="h-5 w-5 text-rose-600" />}
          label="Análise + Resumo"
          value={fmtUsd(totalAnalysis + totalSummary, 2)}
          sub={`${dailyTotals.reduce((sum, row) => sum + Number(row.call_count ?? 0), 0)} chamadas`}
        />
        <Card
          icon={<Volume2 className="h-5 w-5 text-orange-600" />}
          label="TTS"
          value={fmtUsd(totalTts, 2)}
          sub="Desligado na onda 1"
        />
      </div>

      {unitEconomics && (
        <>
          <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
            <div className="border-b px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Unit Economics</h2>
              <p className="mt-1 text-sm text-gray-500">
                ARPU blended de referência: {fmtBrlValue(arpuBlended)} por usuário pago/mês.
              </p>
            </div>
            <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
              <Card
                icon={<DollarSign className="h-5 w-5 text-emerald-600" />}
                label="CAC blended"
                value={fmtBrlValue(unitEconomics.cac_blended_brl)}
                sub={`Trial AI CAC ${fmtBrlValue(unitEconomics.trial_ai_cac_brl)}`}
              />
              <Card
                icon={<Brain className="h-5 w-5 text-rose-600" />}
                label="Contribuição bruta"
                value={fmtBrlValue(unitEconomics.blended_gross_contribution_brl)}
                sub={`Por pagante ${fmtBrlValue(unitEconomics.contribution_per_active_paid_brl)}`}
              />
              <Card
                icon={<Mic className="h-5 w-5 text-blue-600" />}
                label="Trial -> Pago"
                value={fmtPct(unitEconomics.trial_to_paid_conversion)}
                sub={`${unitEconomics.converted_paid} conversões / ${unitEconomics.trials_started} trials`}
              />
              <Card
                icon={<Volume2 className="h-5 w-5 text-orange-600" />}
                label="Churn 30d"
                value={fmtPct(unitEconomics.churn_rate_30d)}
                sub={`${unitEconomics.subscription_canceled_30d} cancelamentos`}
              />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
              <div className="border-b px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900">Funnel</h2>
              </div>
              <div className="grid gap-4 p-6 md:grid-cols-2">
                <MetricRow label="Trials iniciados" value={String(unitEconomics.trials_started)} />
                <MetricRow
                  label="Ativação"
                  value={`${unitEconomics.activations} (${fmtPct(unitEconomics.activation_rate)})`}
                />
                <MetricRow label="Conversões" value={String(unitEconomics.converted_paid)} />
                <MetricRow label="Cancelamentos pedidos" value={String(unitEconomics.cancel_requested)} />
                <MetricRow label="Past due" value={String(unitEconomics.past_due_users)} />
                <MetricRow label="Pagantes ativos" value={String(unitEconomics.active_paid_users)} />
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
              <div className="border-b px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900">Burn de Aquisição</h2>
              </div>
              <div className="grid gap-4 p-6 md:grid-cols-2">
                <MetricRow label="Marketing" value={fmtBrlValue(unitEconomics.marketing_spend_brl)} />
                <MetricRow label="IA em trial" value={fmtBrlValue(unitEconomics.trial_ai_cost_brl)} />
                <MetricRow label="IA em pagantes" value={fmtBrlValue(unitEconomics.paid_ai_cost_brl)} />
                <MetricRow label="IA total" value={fmtBrlValue(unitEconomics.total_ai_cost_brl)} />
                <MetricRow label="Trial soft cap" value={String(unitEconomics.trial_soft_cap_hits)} />
                <MetricRow label="Trial hard cap" value={String(unitEconomics.trial_hard_cap_hits)} />
              </div>
            </div>
          </div>
        </>
      )}

      {dailyTotals.length > 0 && (
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <div className="border-b px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Custo por Dia</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">Data</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Transcrição</th>
                  <th className="px-4 py-3 text-right">Análise</th>
                  <th className="px-4 py-3 text-right">Resumo</th>
                  <th className="px-4 py-3 text-right">TTS</th>
                  <th className="px-4 py-3 text-right">Min. áudio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {dailyTotals.map((row) => (
                  <tr key={row.date} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{row.date}</td>
                    <td className="px-4 py-3 text-right font-semibold text-green-700">{fmtUsd(row.cost_openai_usd)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{fmtUsd(row.transcription_cost_usd)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{fmtUsd(row.analysis_cost_usd)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{fmtUsd(row.summary_cost_usd)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{fmtUsd(row.tts_cost_usd)}</td>
                    <td className="px-4 py-3 text-right text-gray-400">{row.audio_minutes.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {userAggregates.length > 0 && (
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <div className="border-b px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Custo por Usuário</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">Usuário</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Transcrição</th>
                  <th className="px-4 py-3 text-right">Análise</th>
                  <th className="px-4 py-3 text-right">Resumo</th>
                  <th className="px-4 py-3 text-right">TTS</th>
                  <th className="px-4 py-3 text-right">Min. áudio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {userAggregates.slice(0, 20).map((user) => (
                  <tr key={user.user_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{userLabel(user)}</div>
                      <div className="text-xs text-gray-400">{user.user_id.slice(0, 8)}…</div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-green-700">{fmtUsd(user.total_cost_usd)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{fmtUsd(user.transcription_usd)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{fmtUsd(user.analysis_usd)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{fmtUsd(user.summary_usd)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{fmtUsd(user.tts_usd)}</td>
                    <td className="px-4 py-3 text-right text-gray-400">{user.audio_minutes.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {recentLogs.length > 0 && (
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <div className="border-b px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Últimos Eventos de Custo</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">Quando</th>
                  <th className="px-4 py-3 text-left">Usuário</th>
                  <th className="px-4 py-3 text-left">Operação</th>
                  <th className="px-4 py-3 text-left">Modelo</th>
                  <th className="px-4 py-3 text-right">Custo</th>
                  <th className="px-4 py-3 text-right">Tokens</th>
                  <th className="px-4 py-3 text-right">Áudio / chars</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentLogs.map((log) => (
                  <tr key={`${log.user_id}-${log.created_at}-${log.operation}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500">{new Date(log.created_at).toLocaleString('pt-BR')}</td>
                    <td className="px-4 py-3 text-gray-900">{logUserLabel(log)}</td>
                    <td className="px-4 py-3 font-medium text-gray-700">{log.operation}</td>
                    <td className="px-4 py-3 text-gray-500">{log.model || 'n/a'}</td>
                    <td className="px-4 py-3 text-right font-medium text-green-700">{fmtUsd(log.cost_usd)}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{log.tokens_total ?? 0}</td>
                    <td className="px-4 py-3 text-right text-gray-500">
                      {log.audio_seconds ? `${Number(log.audio_seconds).toFixed(1)}s` : log.char_count ? `${log.char_count} chars` : 'n/a'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {dailyTotals.length === 0 && !loading && !error && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center text-gray-500">
          <DollarSign className="mx-auto mb-3 h-12 w-12 text-gray-300" />
          <p className="font-medium">Nenhum dado de custo registrado ainda.</p>
          <p className="mt-1 text-sm">Os dados aparecem após transcrições e análises de IA.</p>
        </div>
      )}
    </div>
  );
};

function Card({
  icon,
  label,
  value,
  sub,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-lg border bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-3">
        {icon}
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-gray-900">{value}</p>
    </div>
  );
}
