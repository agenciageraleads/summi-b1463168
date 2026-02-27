from __future__ import annotations

import datetime as dt
from typing import Any, Dict, List, Optional, Tuple

from .analysis import AnalyzedChat, analyze_single_chat, build_audio_script, build_summary_text
from .config import Settings
from .evolution_client import EvolutionClient
from .openai_client import OpenAIClient
from .supabase_rest import (
    SupabaseRest,
    to_postgrest_filter_eq,
    to_postgrest_filter_gte,
    to_postgrest_filter_lt,
    to_postgrest_filter_neq,
)


def _now_utc_iso() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat()


def _within_business_hours(settings: Settings, profile: Dict[str, Any], now_local: dt.datetime) -> bool:
    only_business = profile.get("apenas_horario_comercial")
    if only_business is True:
        h = now_local.hour
        return settings.business_hours_start <= h < settings.business_hours_end
    return True


def analyze_user_chats(
    settings: Settings,
    supabase: SupabaseRest,
    openai: OpenAIClient,
    *,
    user_id: str,
    blacklist: str | None = None,
) -> Dict[str, Any]:
    # Carrega perfil
    profiles = supabase.select("profiles", select="*", filters=[to_postgrest_filter_eq("id", user_id)], limit=1)
    if not profiles:
        return {"success": False, "error": "profile_not_found"}
    profile = profiles[0]

    # Carrega chats que precisam ser analisados: analisado_em is null OR modificado_em > analisado_em
    # PostgREST nao suporta comparacao coluna-coluna direto; fazemos 2 consultas e unimos.
    chats_to_analyze: List[Dict[str, Any]] = []

    # 1) analisado_em is null
    chats_to_analyze.extend(
        supabase.select(
            "chats",
            select="id,id_usuario,remote_jid,nome,criado_em,modificado_em,contexto,analisado_em,conversa,prioridade",
            filters=[
                to_postgrest_filter_eq("id_usuario", user_id),
                to_postgrest_filter_neq("remote_jid", settings.ignore_remote_jid),
                ("analisado_em", "is.null"),
            ],
            order="modificado_em.desc",
            limit=50,
        )
    )

    # 2) modificado_em > analisado_em (aproximacao): modificado_em >= now-30d AND analisado_em not null
    # Depois filtramos em memoria.
    since = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=30)).isoformat()
    recently = supabase.select(
        "chats",
        select="id,id_usuario,remote_jid,nome,criado_em,modificado_em,contexto,analisado_em,conversa,prioridade",
        filters=[
            to_postgrest_filter_eq("id_usuario", user_id),
            to_postgrest_filter_neq("remote_jid", settings.ignore_remote_jid),
            to_postgrest_filter_gte("modificado_em", since),
        ],
        order="modificado_em.desc",
        limit=200,
    )
    for c in recently:
        if c.get("analisado_em") and c.get("modificado_em") and c["modificado_em"] > c["analisado_em"]:
            chats_to_analyze.append(c)

    # Dedup por id
    seen = set()
    unique_chats: List[Dict[str, Any]] = []
    for c in chats_to_analyze:
        cid = c.get("id")
        if not cid or cid in seen:
            continue
        seen.add(cid)
        unique_chats.append(c)

    temas_urgentes = profile.get("temas_urgentes")
    temas_importantes = profile.get("temas_importantes")

    analyzed: List[AnalyzedChat] = []
    for chat in unique_chats:
        analyzed_chat = analyze_single_chat(
            openai,
            settings.openai_model_analysis,
            chat_id=chat["id"],
            conversa=chat.get("conversa", []),
            nome=chat.get("nome") or chat.get("Nome") or "",
            remote_jid=chat.get("remote_jid") or "",
            criado_em=chat.get("criado_em"),
            modificado_em=chat.get("modificado_em"),
            temas_urgentes=temas_urgentes,
            temas_importantes=temas_importantes,
            blacklist=blacklist,
        )

        supabase.patch(
            "chats",
            data={
                "prioridade": analyzed_chat.prioridade,
                "contexto": analyzed_chat.contexto,
                "analisado_em": _now_utc_iso(),
            },
            filters=[to_postgrest_filter_eq("id", analyzed_chat.chat_id)],
        )
        analyzed.append(analyzed_chat)

    # Incrementar métricas permanentes no perfil do usuário
    if analyzed:
        inc_priorizadas = sum(1 for a in analyzed if a.prioridade in ("2", "3"))
        inc_mensagens = len(analyzed)
        try:
            supabase.rpc("increment_profile_metrics", {
                "target_user_id": user_id,
                "inc_audio_segundos": 0,
                "inc_mensagens_analisadas": inc_mensagens,
                "inc_conversas_priorizadas": inc_priorizadas,
            })
        except Exception:
            pass  # Não aborta o fluxo por falha em métricas

    return {"success": True, "analyzed_count": len(analyzed)}


def run_hourly_job(
    settings: Settings,
    supabase: SupabaseRest,
    openai: OpenAIClient,
    evolution: EvolutionClient,
) -> Dict[str, Any]:
    now_local = dt.datetime.now()

    # Assinantes ativos
    subs = supabase.select(
        "subscribers",
        select="user_id,subscription_end,subscription_status,subscribed",
        filters=[
            ("subscribed", "eq.true"),
            to_postgrest_filter_gte("subscription_end", _now_utc_iso()),
        ],
        limit=1000,
    )

    sent = 0
    skipped_hours = 0
    analyzed_users = 0
    analyze_errors = 0
    low_priority_deleted = 0
    for sub in subs:
        user_id = sub.get("user_id")
        if not user_id:
            continue

        profiles = supabase.select("profiles", select="*", filters=[to_postgrest_filter_eq("id", user_id)], limit=1)
        if not profiles:
            continue
        profile = profiles[0]

        if not _within_business_hours(settings, profile, now_local):
            skipped_hours += 1
            continue

        # Verificar frequência customizada do usuário
        summi_freq = str(profile.get("summi_frequencia") or "1h").strip()
        freq_map = {"1h": 1, "3h": 3, "6h": 6, "12h": 12, "24h": 24}
        freq_hours = freq_map.get(summi_freq, 1)
        ultimo_summi = profile.get("ultimo_summi_em")
        if ultimo_summi and freq_hours > 1:
            try:
                ultimo_dt = dt.datetime.fromisoformat(str(ultimo_summi).replace("Z", "+00:00"))
                elapsed = (dt.datetime.now(dt.timezone.utc) - ultimo_dt).total_seconds() / 3600
                if elapsed < freq_hours:
                    skipped_hours += 1
                    continue
            except Exception:
                pass  # Se falhar o parse, envia normalmente

        # Paridade com n8n: analisa conversas novas/editadas antes de montar o Summi da Hora.
        try:
            analyze_user_chats(settings, supabase, openai, user_id=user_id)
            analyzed_users += 1
        except Exception:
            # Nao aborta o job inteiro por erro em um usuario.
            analyze_errors += 1

        # Puxa chats ja analisados com prioridade 2/3 e contexto nao nulo
        chats = supabase.select(
            "chats",
            select="id,nome,remote_jid,prioridade,contexto,criado_em,modificado_em,analisado_em",
            filters=[
                to_postgrest_filter_eq("id_usuario", user_id),
                to_postgrest_filter_neq("remote_jid", settings.ignore_remote_jid),
                ("contexto", "not.is.null"),
            ],
            order="analisado_em.desc",
            limit=50,
        )

        items: List[AnalyzedChat] = []
        for c in chats:
            p = str(c.get("prioridade", "")).strip()
            if p not in ("2", "3"):
                continue
            items.append(
                AnalyzedChat(
                    chat_id=c["id"],
                    prioridade=p,
                    nome=c.get("nome") or "",
                    telefone=c.get("remote_jid") or "",
                    contexto=(c.get("contexto") or "")[:250],
                    horario=c.get("criado_em") or "",
                )
            )

        # Monta resumo e envia para o numero do usuario (profiles.numero)
        numero_usuario = (profile.get("numero") or "").strip()
        numero_usuario = "".join([c for c in numero_usuario if c.isdigit()])
        if not numero_usuario:
            continue

        summary_text = build_summary_text(openai, settings.openai_model_summary, items=items)
        evolution.send_text(settings.summi_sender_instance, numero_usuario, summary_text)
        sent += 1

        # Atualizar timestamp do último envio
        try:
            supabase.patch(
                "profiles",
                data={"ultimo_summi_em": _now_utc_iso()},
                filters=[to_postgrest_filter_eq("id", user_id)],
            )
        except Exception:
            pass  # Não aborta o fluxo por falha em timestamp

        if profile.get("Summi em Audio?") is True:
            audio_script = build_audio_script(openai, settings.openai_model_summary, summary_text=summary_text)
            mp3 = openai.tts_mp3(settings.openai_tts_model, settings.openai_tts_voice, audio_script)
            evolution.send_audio_mp3(settings.summi_sender_instance, numero_usuario, mp3)

        auto_delete_low = str(profile.get("Apaga Mensagens Não Importantes Automaticamente?", "")).strip().lower() == "sim"
        if auto_delete_low:
            low_chats = supabase.select(
                "chats",
                select="id",
                filters=[
                    to_postgrest_filter_eq("id_usuario", user_id),
                    to_postgrest_filter_lt("prioridade", "2"),
                ],
                limit=1000,
            )
            if low_chats:
                supabase.delete(
                    "chats",
                    filters=[
                        to_postgrest_filter_eq("id_usuario", user_id),
                        to_postgrest_filter_lt("prioridade", "2"),
                    ],
                )
                low_priority_deleted += len(low_chats)

    return {
        "success": True,
        "subscribers": len(subs),
        "sent": sent,
        "skipped_outside_business_hours": skipped_hours,
        "analyzed_users_before_summary": analyzed_users,
        "analyze_errors": analyze_errors,
        "low_priority_deleted": low_priority_deleted,
    }
