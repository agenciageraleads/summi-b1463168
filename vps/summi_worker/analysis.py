from __future__ import annotations

import datetime as dt
import json
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

from .openai_client import OpenAIClient


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
        f"Palavras Chaves de temas Urgentes: {_format_keywords(temas_urgentes)}\n\n"
        f"Palavras Chaves de temas Importantes: {_format_keywords(temas_importantes)}\n\n"
        f"Palavras Chaves de temas para Ignorar: {_format_keywords(blacklist)}\n\n"
        "Escala de prioridade (0 a 3):\n"
        "- 3: urgente, precisa ser respondido o quanto antes\n"
        "- 2: precisa ser respondido hoje\n"
        "- 1: precisa responder, mas nao hoje\n"
        "- 0: nao precisa responder\n\n"
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


def _build_items_section(items: List[AnalyzedChat], prioridade: str, emoji: str) -> str:
    """Monta a seção de itens de uma prioridade específica no template combinado."""
    filtrados = [it for it in items if it.prioridade == prioridade and it.contexto]
    if not filtrados:
        return ""

    linhas = []
    for it in filtrados:
        telefone_limpo = "".join([c for c in it.telefone if c.isdigit()])
        if not telefone_limpo.startswith("55"):
            telefone_limpo = "55" + telefone_limpo
        linhas.append(
            f"{emoji} *{it.nome}*\n"
            f"{it.contexto}\n"
            f"Responder: wa.me/{telefone_limpo}"
        )
    return "\n\n".join(linhas)


def build_summary_text(
    openai: OpenAIClient,
    model: str,
    *,
    items: List[AnalyzedChat],
) -> str:
    """
    Monta o Summi da Hora no template combinado:
    🔴 urgentes (prioridade 3) e 🟡 importantes (prioridade 2),
    com link wa.me embaixo de cada contato.
    """
    if not items:
        return "Você não tem nenhuma demanda importante por agora, fique tranquilo. ✅"

    secao_urgente = _build_items_section(items, "3", "🔥")
    secao_importante = _build_items_section(items, "2", "🚨")

    partes = []
    if secao_urgente:
        partes.append(f"*🔥 Urgentes:*\n\n{secao_urgente}")
    if secao_importante:
        partes.append(f"*🚨 Importantes:*\n\n{secao_importante}")

    if not partes:
        return "Você não tem nenhuma demanda importante por agora, fique tranquilo. ✅"

    corpo = "\n\n---\n\n".join(partes)
    return corpo


def build_audio_script(
    openai: OpenAIClient,
    model: str,
    *,
    summary_text: str,
) -> str:
    system = "Voce escreve um roteiro curto, falado, para transcricao em audio."
    user = (
        "Preciso que agora voce traga de uma forma mais fluida o que havia sido resumido pois o seu resultado vai ser transcrito em audio.\n\n"
        f"Mensagem: {summary_text}\n\n"
        "Inicie com: Summi (le-se Sami) da Hora: ...\n"
        "Nao pareca uma IA (sem 'Claro', sem 'Aqui esta', sem despedidas).\n"
        "Retorne apenas o texto final."
    )
    return openai.chat_text(model=model, system=system, user=user, temperature=0.4)
