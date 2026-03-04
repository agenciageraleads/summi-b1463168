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
    to_postgrest_filter_gt,
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


def _build_summary_items(chats: List[Dict[str, Any]]) -> List[AnalyzedChat]:
    items: List[AnalyzedChat] = []
    for c in chats:
        prioridade = str(c.get("prioridade", "")).strip()
        if prioridade not in ("2", "3"):
            continue
        items.append(
            AnalyzedChat(
                chat_id=c["id"],
                prioridade=prioridade,
                nome=c.get("nome") or "",
                telefone=c.get("remote_jid") or "",
                contexto=(c.get("contexto") or "")[:250],
                horario=c.get("criado_em") or "",
            )
        )
    return items


def _summary_chat_filters(settings: Settings, *, user_id: str, ultimo_summi: str | None) -> List[Tuple[str, str]]:
    filters = [
        to_postgrest_filter_eq("id_usuario", user_id),
        to_postgrest_filter_neq("remote_jid", settings.ignore_remote_jid),
        ("contexto", "not.is.null"),
    ]
    if ultimo_summi:
        filters.append(to_postgrest_filter_gt("analisado_em", str(ultimo_summi)))
    else:
        filters.append(("analisado_em", "not.is.null"))
    return filters


def _unique_active_user_ids(subscribers: List[Dict[str, Any]]) -> List[str]:
    user_ids: List[str] = []
    seen: set[str] = set()
    for subscriber in subscribers:
        user_id = str(subscriber.get("user_id") or "").strip()
        if not user_id or user_id in seen:
            continue
        seen.add(user_id)
        user_ids.append(user_id)
    return user_ids


def _summary_frequency_hours(profile: Dict[str, Any]) -> int:
    summi_freq = str(profile.get("summi_frequencia") or "1h").strip()
    freq_map = {"1h": 1, "3h": 3, "6h": 6, "12h": 12, "24h": 24}
    return freq_map.get(summi_freq, 1)


def _summary_is_due(profile: Dict[str, Any], *, now_utc: dt.datetime) -> bool:
    ultimo_summi = profile.get("ultimo_summi_em")
    if not ultimo_summi:
        return True

    try:
        ultimo_dt = dt.datetime.fromisoformat(str(ultimo_summi).replace("Z", "+00:00"))
    except Exception:
        return True

    if ultimo_dt.tzinfo is None:
        ultimo_dt = ultimo_dt.replace(tzinfo=dt.timezone.utc)

    elapsed_hours = (now_utc - ultimo_dt).total_seconds() / 3600
    return elapsed_hours >= _summary_frequency_hours(profile)


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


import time


def _daily_summary_sent_today(profile: Dict[str, Any], *, now_utc: dt.datetime) -> bool:
    """Retorna True se o resumo diário já foi enviado hoje (mesmo dia UTC)."""
    ultimo = profile.get("ultimo_summi_diario_em")
    if not ultimo:
        return False
    try:
        ultimo_dt = dt.datetime.fromisoformat(str(ultimo).replace("Z", "+00:00"))
        if ultimo_dt.tzinfo is None:
            ultimo_dt = ultimo_dt.replace(tzinfo=dt.timezone.utc)
        return ultimo_dt.date() == now_utc.date()
    except Exception:
        return False


def run_daily_summary_job(
    settings: Settings,
    supabase: SupabaseRest,
    openai: OpenAIClient,
    evolution: EvolutionClient,
) -> Dict[str, Any]:
    """
    Job diário (19:00 UTC): envia resumo das conversas pendentes (prioridade >= 2)
    e apaga todas as conversas do usuário após o envio.

    Independente do job horário — roda mesmo se summi_frequencia=24h.
    Conversas existentes no banco = não respondidas (Inbox Zero garante delete ao responder).
    """
    now_utc = dt.datetime.now(dt.timezone.utc)

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
    skipped_already_sent = 0
    skipped_no_priority_chats = 0
    errors = 0
    user_ids = _unique_active_user_ids(subs)

    for user_id in user_ids:
        profiles = supabase.select("profiles", select="*", filters=[to_postgrest_filter_eq("id", user_id)], limit=1)
        if not profiles:
            continue
        profile = profiles[0]

        # Evita envio duplo no mesmo dia
        if _daily_summary_sent_today(profile, now_utc=now_utc):
            skipped_already_sent += 1
            continue

        numero_usuario = "".join(c for c in str(profile.get("numero") or "") if c.isdigit())
        if not numero_usuario:
            continue

        try:
            # Buscar conversas pendentes com prioridade >= 2 (não respondidas)
            chats = supabase.select(
                "chats",
                select="id,nome,remote_jid,prioridade,contexto,criado_em,analisado_em",
                filters=[
                    to_postgrest_filter_eq("id_usuario", user_id),
                    to_postgrest_filter_neq("remote_jid", settings.ignore_remote_jid),
                    ("contexto", "not.is.null"),
                    ("prioridade", "gte.2"),
                ],
                order="prioridade.desc,analisado_em.desc",
                limit=50,
            )

            if not chats:
                skipped_no_priority_chats += 1
                continue

            items = _build_summary_items(chats)
            summary_text = build_summary_text(openai, settings.openai_model_summary, items=items)
            evolution.send_text(settings.summi_sender_instance, numero_usuario, summary_text)
            sent += 1

            # Marcar timestamp do envio
            try:
                supabase.patch(
                    "profiles",
                    data={"ultimo_summi_diario_em": _now_utc_iso()},
                    filters=[to_postgrest_filter_eq("id", user_id)],
                )
            except Exception:
                pass

            # Inbox Zero diário: apagar todas as conversas após o resumo
            # O usuário já foi informado. Isso limpa para o próximo dia.
            try:
                supabase.delete(
                    "chats",
                    filters=[to_postgrest_filter_eq("id_usuario", user_id)],
                )
            except Exception as exc:
                print(f"daily_summary: delete_chats_failed user={user_id} error={exc}")

            # Enviar áudio se habilitado
            if profile.get("Summi em Audio?") is True:
                try:
                    audio_script = build_audio_script(openai, settings.openai_model_summary, summary_text=summary_text)
                    mp3 = openai.tts_mp3(settings.openai_tts_model, settings.openai_tts_voice, audio_script)
                    evolution.send_audio_mp3(settings.summi_sender_instance, numero_usuario, mp3)
                except Exception as exc:
                    print(f"daily_summary: audio_failed user={user_id} error={exc}")

        except Exception as exc:
            errors += 1
            print(f"daily_summary: user_failed user={user_id} error={exc}")

    return {
        "success": True,
        "unique_subscribers": len(user_ids),
        "sent": sent,
        "skipped_already_sent_today": skipped_already_sent,
        "skipped_no_priority_chats": skipped_no_priority_chats,
        "errors": errors,
    }


def send_onboarding_messages(evolution: EvolutionClient, instance: str, numero: str, nome: str):
    """Envia a sequência de 3 mensagens de onboarding no WhatsApp."""
    nome_salut = nome.split()[0] if nome else "usuário"
    
    msg1 = (
        f"👋 Oi, {nome_salut}! Tudo certo por aqui.\n\n"
        "Sou a *Summi*, sua assistente inteligente de WhatsApp. Estou conectada ao seu número e já estou monitorando suas conversas. 🚀\n\n"
        "Me dá alguns segundos que vou te explicar como funciono!"
    )
    
    msg2 = (
        "📊 As suas mensagens serão ranqueadas por prioridade de atenção para poupar seu tempo:\n\n"
        "🚨 Prioridade 3 = Urgente\n"
        "🔥 Prioridade 2 = Importante\n"
        "⚪ Prioridade 1/0 = Pode esperar\n\n"
        "Assim você nunca mais perde tempo garimpando o que é importante no WhatsApp."
    )
    
    msg3 = (
        "⚡ *Dica rápida:* Reaja a qualquer áudio com o emoji ⚡ e eu te mando a transcrição na hora — sem precisar ouvir!\n\n"
        "Lembre-se: no painel da Summi você pode *personalizar tudo*: frequência dos relatórios, horários, resumo em áudio e muito mais.\n\n"
        "Configure aqui: summi.gera-leads.com/settings\n\n"
        "Bem-vindo(a) à Summi! 🚀"
    )

    try:
        evolution.send_text(instance, numero, msg1)
        time.sleep(2)
        evolution.send_text(instance, numero, msg2)
        time.sleep(4)
        evolution.send_text(instance, numero, msg3)
    except Exception as e:
        print(f"Error sending onboarding to {numero}: {e}")


def run_hourly_job(
    settings: Settings,
    supabase: SupabaseRest,
    openai: OpenAIClient,
    evolution: EvolutionClient,
) -> Dict[str, Any]:
    now_local = dt.datetime.now()
    now_utc = dt.datetime.now(dt.timezone.utc)

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
    user_ids = _unique_active_user_ids(subs)
    deduplicated_rows = len(subs) - len(user_ids)
    for user_id in user_ids:

        profiles = supabase.select("profiles", select="*", filters=[to_postgrest_filter_eq("id", user_id)], limit=1)
        if not profiles:
            continue
        profile = profiles[0]

        if not _within_business_hours(settings, profile, now_local):
            skipped_hours += 1
            continue

        # Numero do usuario e usado tanto no onboarding quanto no envio regular.
        numero_usuario = (profile.get("numero") or "").strip()
        numero_usuario = "".join([c for c in numero_usuario if c.isdigit()])
        if not numero_usuario:
            continue

        # Verificar se precisa de onboarding (primeiro envio)
        ultimo_summi = profile.get("ultimo_summi_em")
        onboarding_done = profile.get("onboarding_completed")
        
        if not ultimo_summi and not onboarding_done:
            print(f"Sending onboarding to new user: {user_id}")
            send_onboarding_messages(evolution, settings.summi_sender_instance, numero_usuario, profile.get("nome", ""))
            # Marcar como enviado para evitar repetição (usando onboarding_completed já existente)
            try:
                supabase.patch(
                    "profiles",
                    data={"onboarding_completed": True},
                    filters=[to_postgrest_filter_eq("id", user_id)],
                )
            except Exception:
                pass

        if not _summary_is_due(profile, now_utc=now_utc):
            skipped_hours += 1
            continue

        # Paridade com n8n: analisa conversas novas/editadas antes de montar o Summi da Hora.
        try:
            analyze_user_chats(settings, supabase, openai, user_id=user_id)
            analyzed_users += 1
        except Exception:
            # Nao aborta o job inteiro por erro em um usuario.
            analyze_errors += 1

        # O Summi da Hora deve considerar apenas o lote recem-analisado desde o ultimo envio.
        chats = supabase.select(
            "chats",
            select="id,nome,remote_jid,prioridade,contexto,criado_em,modificado_em,analisado_em",
            filters=_summary_chat_filters(settings, user_id=user_id, ultimo_summi=ultimo_summi),
            order="analisado_em.desc",
            limit=50,
        )

        items = _build_summary_items(chats)

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
            try:
                audio_script = build_audio_script(openai, settings.openai_model_summary, summary_text=summary_text)
                mp3 = openai.tts_mp3(settings.openai_tts_model, settings.openai_tts_voice, audio_script)
                evolution.send_audio_mp3(settings.summi_sender_instance, numero_usuario, mp3)
            except Exception as exc:
                print(f"Audio summary failed for user {user_id}: {exc}")

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
        "unique_subscribers": len(user_ids),
        "deduplicated_subscriber_rows": deduplicated_rows,
        "sent": sent,
        "skipped_outside_business_hours": skipped_hours,
        "analyzed_users_before_summary": analyzed_users,
        "analyze_errors": analyze_errors,
        "low_priority_deleted": low_priority_deleted,
    }
