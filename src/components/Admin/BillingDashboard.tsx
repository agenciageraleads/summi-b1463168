// ABOUTME: Painel de custos admin — mostra gastos OpenAI por usuário
// ABOUTME: Dados de user_costs e cost_logs (admin-only via service role)

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, TrendingUp, Mic, Brain, Volume2, FileText, RefreshCw } from 'lucide-react';

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

interface UserCostRow {
  user_id: string;
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
  email?: string;
  total_cost_usd: number;
  transcription_usd: number;
  analysis_usd: number;
  summary_usd: number;
  tts_usd: number;
  call_count: number;
  audio_minutes: number;
}

function fmt(value: number, decimals = 4): string {
  return `$${value.toFixed(decimals)}`;
}

function fmtR(value: number): string {
  return `R$${(value * 5.8).toFixed(2)}`;
}

export const BillingDashboard = () => {
  const [dailyTotals, setDailyTotals] = useState<DailyCost[]>([]);
  const [userAggregates, setUserAggregates] = useState<UserAggregate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<7 | 30>(30);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const since = new Date();
      since.setDate(since.getDate() - period);
      const sinceStr = since.toISOString().split('T')[0];

      // Agregado por dia (todos os usuários)
      const { data: rows, error: err } = await supabase
        .from('user_costs')
        .select('date,cost_openai_usd,transcription_cost_usd,analysis_cost_usd,summary_cost_usd,tts_cost_usd,call_count,audio_minutes')
        .gte('date', sinceStr)
        .order('date', { ascending: false });

      if (err) throw err;

      // Agrega por dia
      const byDay: Record<string, DailyCost> = {};
      const byUser: Record<string, UserAggregate> = {};

      for (const row of (rows as UserCostRow[] ?? [])) {
        // Por dia
        if (!byDay[row.date]) {
          byDay[row.date] = {
            date: row.date,
            cost_openai_usd: 0,
            transcription_cost_usd: 0,
            analysis_cost_usd: 0,
            summary_cost_usd: 0,
            tts_cost_usd: 0,
            call_count: 0,
            audio_minutes: 0,
          };
        }
        byDay[row.date].cost_openai_usd += Number(row.cost_openai_usd ?? 0);
        byDay[row.date].transcription_cost_usd += Number(row.transcription_cost_usd ?? 0);
        byDay[row.date].analysis_cost_usd += Number(row.analysis_cost_usd ?? 0);
        byDay[row.date].summary_cost_usd += Number(row.summary_cost_usd ?? 0);
        byDay[row.date].tts_cost_usd += Number(row.tts_cost_usd ?? 0);
        byDay[row.date].call_count += Number(row.call_count ?? 0);
        byDay[row.date].audio_minutes += Number(row.audio_minutes ?? 0);

        // Por usuário
        if (!byUser[row.user_id]) {
          byUser[row.user_id] = {
            user_id: row.user_id,
            total_cost_usd: 0,
            transcription_usd: 0,
            analysis_usd: 0,
            summary_usd: 0,
            tts_usd: 0,
            call_count: 0,
            audio_minutes: 0,
          };
        }
        byUser[row.user_id].total_cost_usd += Number(row.cost_openai_usd ?? 0);
        byUser[row.user_id].transcription_usd += Number(row.transcription_cost_usd ?? 0);
        byUser[row.user_id].analysis_usd += Number(row.analysis_cost_usd ?? 0);
        byUser[row.user_id].summary_usd += Number(row.summary_cost_usd ?? 0);
        byUser[row.user_id].tts_usd += Number(row.tts_cost_usd ?? 0);
        byUser[row.user_id].call_count += Number(row.call_count ?? 0);
        byUser[row.user_id].audio_minutes += Number(row.audio_minutes ?? 0);
      }

      setDailyTotals(Object.values(byDay).sort((a, b) => b.date.localeCompare(a.date)));
      setUserAggregates(Object.values(byUser).sort((a, b) => b.total_cost_usd - a.total_cost_usd));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [period]);

  const totalPeriod = dailyTotals.reduce((s, d) => s + d.cost_openai_usd, 0);
  const totalTranscription = dailyTotals.reduce((s, d) => s + d.transcription_cost_usd, 0);
  const totalAnalysis = dailyTotals.reduce((s, d) => s + d.analysis_cost_usd, 0);
  const totalSummary = dailyTotals.reduce((s, d) => s + d.summary_cost_usd, 0);
  const totalTts = dailyTotals.reduce((s, d) => s + d.tts_cost_usd, 0);
  const totalMinutes = dailyTotals.reduce((s, d) => s + d.audio_minutes, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Billing & Custos 💰</h1>
          <p className="text-gray-500 text-sm">Gastos OpenAI por usuário — admin only</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={e => setPeriod(Number(e.target.value) as 7 | 30)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value={7}>Últimos 7 dias</option>
            <option value={30}>Últimos 30 dias</option>
          </select>
          <button
            onClick={load}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          Erro ao carregar dados: {error}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card icon={<DollarSign className="h-5 w-5 text-green-600" />} label="Total OpenAI" value={fmt(totalPeriod, 2)} sub={fmtR(totalPeriod)} color="green" />
        <Card icon={<Mic className="h-5 w-5 text-blue-600" />} label="Transcrição" value={fmt(totalTranscription, 2)} sub={`${totalMinutes.toFixed(0)} min`} color="blue" />
        <Card icon={<Brain className="h-5 w-5 text-purple-600" />} label="Análise + Resumo" value={fmt(totalAnalysis + totalSummary, 2)} sub={`${dailyTotals.reduce((s, d) => s + d.call_count, 0)} chamadas`} color="purple" />
        <Card icon={<Volume2 className="h-5 w-5 text-orange-600" />} label="TTS (Áudio)" value={fmt(totalTts, 2)} sub="" color="orange" />
      </div>

      {/* Daily breakdown */}
      {dailyTotals.length > 0 && (
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-gray-500" />
              Custo por Dia
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
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
                {dailyTotals.map(d => (
                  <tr key={d.date} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{d.date}</td>
                    <td className="px-4 py-3 text-right font-semibold text-green-700">{fmt(d.cost_openai_usd)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{fmt(d.transcription_cost_usd)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{fmt(d.analysis_cost_usd)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{fmt(d.summary_cost_usd)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{fmt(d.tts_cost_usd)}</td>
                    <td className="px-4 py-3 text-right text-gray-400">{d.audio_minutes.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top spending users */}
      {userAggregates.length > 0 && (
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="h-5 w-5 text-gray-500" />
              Custo por Usuário
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">User ID</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Transcrição</th>
                  <th className="px-4 py-3 text-right">Análise</th>
                  <th className="px-4 py-3 text-right">TTS</th>
                  <th className="px-4 py-3 text-right">Min. áudio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {userAggregates.slice(0, 20).map(u => (
                  <tr key={u.user_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{u.user_id.slice(0, 8)}…</td>
                    <td className="px-4 py-3 text-right font-semibold text-green-700">{fmt(u.total_cost_usd)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{fmt(u.transcription_usd)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{fmt(u.analysis_usd + u.summary_usd)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{fmt(u.tts_usd)}</td>
                    <td className="px-4 py-3 text-right text-gray-400">{u.audio_minutes.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {dailyTotals.length === 0 && !loading && !error && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center text-gray-500">
          <DollarSign className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">Nenhum dado de custo registrado ainda.</p>
          <p className="text-sm mt-1">Os dados aparecem após transcrições e análises de IA.</p>
        </div>
      )}
    </div>
  );
};

// Small reusable card
function Card({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-lg border shadow-sm p-5">
      <div className="flex items-center gap-3 mb-3">
        {icon}
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}
