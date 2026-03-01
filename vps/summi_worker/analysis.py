from __future__ import annotations

import datetime as dt
import json
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

from .openai_client import OpenAIClient
from .prompt_builders import (
    SUMMI_HOUR_FALLBACK_TEXT,
    build_summi_audio_prompt,
    render_summi_hour_audio_fallback,
)


@dataclass(frozen=True)
class AnalyzedChat:
    chat_id: str
    prioridade: str  # "0".."3"
    nome: str
    telefone: str
    contexto: str
    horario: str


def _format_keywords(csv: str | None) -> str:
    if not csv:
        return ""
    return ", ".join([p.strip() for p in csv.split(",") if p.strip()])


def _trim_conversa_for_prompt(conversa: Any, max_chars: int = 18000) -> str:
    """
    Evita estourar contexto em chats longos. Mantemos o trecho final, que tende a ser
    o mais relevante para priorizacao.
    """
    try:
        raw = json.dumps(conversa, ensure_ascii=False)
    except Exception:
        raw = str(conversa)

    if len(raw) <= max_chars:
        return raw

    # Mantem sufixo e marca truncamento de forma explicita para o modelo.
    suffix = raw[-max_chars:]
    return f"[CONVERSA_TRUNCADA_TOTAL={len(raw)}]\\n...{suffix}"


def analyze_single_chat(
    openai: OpenAIClient,
    model: str,
    *,
    chat_id: str,
    conversa: Any,
    nome: str,
    remote_jid: str,
    criado_em: str | None,
    modificado_em: str | None,
    temas_urgentes: str | None,
    temas_importantes: str | None,
    blacklist: str | None,
) -> AnalyzedChat:
    # Conversa e um JSONB array no banco. Mantemos como string para o prompt.
    conversa_text = _trim_conversa_for_prompt(conversa)

    system = "Voce e um assistente de WhatsApp. Responda SOMENTE em JSON valido."
    user = (
        "Voce agora e um assistente de WhatsApp e sua missao e analisar as conversas em um banco de dados "
        "para me passar o que eu preciso fazer.\n\n"
        "Para isso preciso que voce faca uma analise do contexto da conversa para entender se eu realmente "
        "preciso responder aquilo agora ou posso esperar, alem de setar as prioridades de resposta.\n\n"
        "Muitas mensagens (mais de 5) podem signifcar uma urgencia.\n\n"
        "Seja bem criterioso pois meu tempo e valioso, se achar que nao vale a pena, nao classifique como urgente, "
        "melhor errar pra menos do que pra mais.\n\n"
        "Se perceber que tem mensagens repetidas e o tempo entre a primeira e a ultima e grande, por favor tambem "
        "classifique como que e preciso responder, dai a urgencia vai depender do contexto.\n\n"
        f"CONTEXTO DE URGÊNCIA (Temas que eu considero Urgentes): {temas_urgentes or 'Nenhum definido'}\n\n"
        f"CONTEXTO DE IMPORTÂNCIA (Temas que eu considero Importantes): {temas_importantes or 'Nenhum definido'}\n\n"
        f"BLACKLIST (Temas para Ignorar): {blacklist or 'Nenhuma definida'}\n\n"
        "Escala de prioridade (0 a 3):\n"
        "- 3: urgente, precisa ser respondido o quanto antes\n"
        "- 2: precisa ser respondido hoje\n"
        "- 1: precisa responder, mas nao hoje\n"
        "- 0: nao precisa responder OU ja foi respondido pelo vendedor\n\n"
        "REGRA IMPORTANTE: Se a ultima mensagem da conversa foi enviada pelo vendedor (from_me=true ou from_me=True), "
        "isso significa que o vendedor JA respondeu. Nesse caso a prioridade DEVE ser 0 "
        "(a menos que o contexto indique claramente que ainda ha pendencia).\n\n"
        "Formato EXATO de saida (JSON):\n"
        "{\n"
        '  "id": "123",\n'
        '  "Prioridade": "2",\n'
        '  "Nome": "(nome de quem mandou)",\n'
        '  "Telefone": "+(telefone)",\n'
        '  "Contexto": "(resultado da analise com no maximo 250 caracteres)",\n'
        '  "Horario": "(horario da primeira mensagem)"\n'
        "}\n\n"
        f"Id: {chat_id}\n"
        f"Conversa: {conversa_text}\n"
        f"Quem Mandou: {nome}\n"
        f"Telefone: {remote_jid}\n"
        f"Primeira Mensagem: {criado_em}\n"
        f"Ultima Mensagem: {modificado_em}\n"
    )

    out = openai.chat_json(model=model, system=system, user=user, temperature=0.2)

    # Normalizacao defensiva
    prioridade = str(out.get("Prioridade", "0")).strip()
    if prioridade not in ("0", "1", "2", "3"):
        prioridade = "0"

    contexto = str(out.get("Contexto", "")).strip()[:250]
    horario = str(out.get("Horario", criado_em or modificado_em or "")).strip()

    telefone = str(out.get("Telefone", remote_jid)).strip()
    nome_out = str(out.get("Nome", nome)).strip() or nome

    return AnalyzedChat(
        chat_id=str(out.get("id", chat_id)).strip() or chat_id,
        prioridade=prioridade,
        nome=nome_out,
        telefone=telefone,
        contexto=contexto,
        horario=horario,
    )


def build_summary_text(
    openai: OpenAIClient,
    model: str,
    *,
    items: List[AnalyzedChat],
) -> str:
    """
    Monta o Summi da Hora em layout Premium simplificado.
    """
    if not items:
        return SUMMI_HOUR_FALLBACK_TEXT

    # Filtrar e ordenar: Prioridade 3 (Urgente) primeiro, depois 2 (Importante)
    filtrados = [it for it in items if it.prioridade in ("2", "3") and it.contexto]
    filtrados.sort(key=lambda x: x.prioridade, reverse=True)

    if not filtrados:
        return SUMMI_HOUR_FALLBACK_TEXT

    corpo_mensagens = []
    for it in filtrados:
        emoji = "🔥" if it.prioridade == "3" else "🚨"
        
        telefone_limpo = "".join([c for c in it.telefone if c.isdigit()])
        if not telefone_limpo.startswith("55"):
            telefone_limpo = "55" + telefone_limpo
        
        # Design Premium Simplificado: Emoji de prioridade seguido do Nome
        item_text = (
            f"{emoji} *{it.nome}*\n"
            f"📝 {it.contexto}\n"
            f"🔗 wa.me/{telefone_limpo}"
        )
        corpo_mensagens.append(item_text)

    # Construção final da mensagem
    partes = ["✨ *Summi da Hora*"]
    
    # Unifica todas as mensagens com o separador elegante
    partes.append("\n\n───────────────\n\n".join(corpo_mensagens))

    # Rodapé discreto
    corpo = "\n\n".join(partes)
    corpo += "\n\n_⚡️ Summi - Secretária Invisível_"
    return corpo


def build_audio_script(
    openai: OpenAIClient,
    model: str,
    *,
    summary_text: str,
) -> str:
    fallback_script = render_summi_hour_audio_fallback(summary_text)
    if fallback_script:
        return fallback_script

    system, user = build_summi_audio_prompt(summary_text)
    return openai.chat_text(model=model, system=system, user=user, temperature=0.2)
