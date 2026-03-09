from __future__ import annotations

import re
from typing import Any, Mapping, Optional, Sequence, Tuple


SUMMI_HOUR_FALLBACK_TEXT = (
    "✨ *Summi da Hora*\n\nVocê não tem nenhuma demanda importante por agora, fique tranquilo. ✅"
)
SUMMI_HOUR_FALLBACK_AUDIO_SCRIPT = "Summi da Hora: não há nada de importante por agora."

# Prompt estático passado ao Whisper para melhorar formatação pt-BR.
# Não gera custo extra — Whisper cobra por minuto de áudio, não por token.
# Usado como base em build_transcription_prompt() quando não há dados de perfil disponíveis.
TRANSCRIPTION_STATIC_PROMPT = (
    "Transcreva em português do Brasil com máxima fidelidade ao áudio. "
    "Preserve exatamente nomes próprios, marcas, CPF, CNPJ, CEP, PIX, telefones, e-mails e valores. "
    "Use pontuação correta e letras maiúsculas em nomes próprios. Não resuma nem invente palavras."
)

DEFAULT_CRITICAL_TRANSCRIPTION_TERMS = (
    "cnpj",
    "cpf",
    "rg",
    "inscricao estadual",
    "ie",
    "pix",
    "orcamento",
    "pedido",
    "nota fiscal",
    "telefone",
    "whatsapp",
    "email",
    "cep",
)


def _compact_text(value: str | None) -> str:
    return " ".join(str(value or "").split()).strip().casefold()


def _digits(value: str | None) -> str:
    return "".join(ch for ch in str(value or "") if ch.isdigit())


def _keyword_candidates(*values: Any) -> list[str]:
    parts: list[str] = []
    seen: set[str] = set()
    for value in values:
        for raw_part in re.split(r"[,;\n|]+", str(value or "")):
            part = " ".join(raw_part.split()).strip()
            if not part:
                continue
            key = part.casefold()
            if key in seen:
                continue
            seen.add(key)
            parts.append(part)
    return parts


def is_internal_summi_thread(chat_remote_jid: str | None, ignore_remote_jid: str | None) -> bool:
    ignored_digits = _digits(ignore_remote_jid)
    if not ignored_digits:
        return False
    return _digits(chat_remote_jid) == ignored_digits


def is_empty_summi_hour(summary_text: str | None) -> bool:
    return _compact_text(summary_text).startswith(_compact_text(SUMMI_HOUR_FALLBACK_TEXT))


def render_summi_hour_audio_fallback(summary_text: str | None) -> Optional[str]:
    if is_empty_summi_hour(summary_text):
        return SUMMI_HOUR_FALLBACK_AUDIO_SCRIPT
    return None


def build_summi_audio_prompt(summary_text: str) -> Tuple[str, str]:
    system = (
        "Você escreve um roteiro curto, falado, para transcrição em áudio. "
        "Use apenas as informações fornecidas. Nunca invente nomes, tarefas, prazos, urgências ou contextos."
    )
    user = (
        "Preciso que agora você traga de uma forma mais fluida o que havia sido resumido pois o seu resultado vai "
        "ser transcrito em áudio, portanto imagine que a pessoa que vai escutar esteja no trânsito e precisa das "
        "informações que foram enviadas por mensagem.\n\n"
        f"Mensagem: {summary_text}\n\n"
        "Inicie com Summi (lê-se Sâmi) da Hora: (sua mensagem).\n"
        "Pode ignorar os números dos contatos, leve apenas o nome e a demanda.\n"
        "Outro detalhe é para não inventar nada. Se a mensagem indicar que não há demanda importante, responda "
        "exatamente: Summi da Hora: não há nada de importante por agora.\n"
        "Não pareça uma IA, então sem 'Claro', sem 'Aqui está', sem despedida perguntando se pode ajudar em algo mais.\n"
        "Retorne apenas o texto final."
    )
    return system, user


def build_transcription_hint_terms(
    profile: Mapping[str, Any],
    *,
    extra_context: str | None = None,
    limit: int = 12,
) -> list[str]:
    return _keyword_candidates(
        profile.get("temas_urgentes"),
        profile.get("temas_importantes"),
        extra_context,
    )[:limit]


def build_transcription_prompt(
    profile: Mapping[str, Any],
    *,
    extra_context: str | None = None,
) -> str:
    """
    Monta o prompt de transcrição usando TRANSCRIPTION_STATIC_PROMPT como base.
    Adiciona contexto personalizado do perfil (nome, temas) quando disponível.
    O perfil já é carregado no processamento do webhook — sem custo extra de DB.
    """
    owner_name = " ".join(str(profile.get("nome") or profile.get("name") or "").split()).strip()
    hint_terms = build_transcription_hint_terms(profile, extra_context=extra_context)
    parts = [TRANSCRIPTION_STATIC_PROMPT]
    if owner_name:
        parts.append(f"O usuário dono da conta se chama {owner_name}.")
    if hint_terms:
        parts.append(f"Vocabulário e temas recorrentes deste usuário: {', '.join(hint_terms)}.")
    return " ".join(parts)


def transcription_has_suspicious_repetition(transcription: str) -> bool:
    tokens = re.findall(r"\w+", transcription.casefold())
    consecutive_repeats = 0
    for index in range(1, len(tokens)):
        current = tokens[index]
        previous = tokens[index - 1]
        if current == previous and len(current) <= 4:
            consecutive_repeats += 1
            if consecutive_repeats >= 2:
                return True
        else:
            consecutive_repeats = 0
    return False


def transcription_has_critical_content(
    transcription: str,
    *,
    hint_terms: Sequence[str] = (),
) -> bool:
    normalized = _compact_text(transcription)
    if not normalized:
        return False
    if len(re.findall(r"\d", transcription)) >= 4:
        return True
    if re.search(r"\b[a-z]{2,}\d{2,}[a-z0-9-]*\b", normalized):
        return True
    for term in (*DEFAULT_CRITICAL_TRANSCRIPTION_TERMS, *hint_terms):
        normalized_term = _compact_text(term)
        if normalized_term and normalized_term in normalized:
            return True
    return False


def choose_transcription_fallback_reason(
    transcription: str,
    *,
    average_confidence: float | None,
    confidence_threshold: float,
    critical_confidence_threshold: float,
    hint_terms: Sequence[str] = (),
) -> str | None:
    if not transcription.strip():
        return "empty_transcript"
    if average_confidence is not None and average_confidence < confidence_threshold:
        return "low_confidence"
    if (
        transcription_has_suspicious_repetition(transcription)
        and (average_confidence is None or average_confidence < critical_confidence_threshold)
    ):
        return "suspicious_repetition"
    if (
        average_confidence is not None
        and average_confidence < critical_confidence_threshold
        and transcription_has_critical_content(transcription, hint_terms=hint_terms)
    ):
        return "critical_content_low_confidence"
    return None


def choose_transcription_summary_mode(
    transcription: str,
    *,
    audio_seconds: int | None = None,
) -> str:
    words = len([part for part in transcription.split() if part.strip()])
    if words <= 90 and (audio_seconds is None or audio_seconds <= 120):
        return "direct"
    return "structured"


def build_transcription_summary_prompt(
    transcription: str,
    *,
    temas_urgentes: str,
    temas_importantes: str,
    audio_seconds: int | None = None,
) -> Tuple[str, str]:
    mode = choose_transcription_summary_mode(transcription, audio_seconds=audio_seconds)
    system = (
        "Você resume transcrições de áudio em português. "
        "Seja fiel ao conteúdo, objetivo e jamais invente informações.\n"
        f"Considere que para este usuário, temas URGENTES são: {temas_urgentes}\n"
        f"Temas IMPORTANTES são: {temas_importantes}"
    )

    if mode == "direct":
        user = (
            "Faça um resumo direto e curto da transcrição abaixo, destacando o assunto principal e qualquer ponto "
            "que se conecte com os temas urgentes ou importantes do usuário.\n"
            "Se houver uma ação claramente pedida, mencione isso de forma natural no próprio resumo.\n"
            "Não use blocos, títulos ou listas nesta modalidade.\n\n"
            f"Transcrição:\n{transcription}"
        )
        return system, user

    user = (
        "Organize a saída em blocos curtos de WhatsApp, usando exatamente estes títulos quando houver conteúdo:\n"
        "*Assunto principal*\n"
        "*Assuntos discutidos*\n"
        "*Atividades a serem realizadas*\n\n"
        "Regras:\n"
        "- Em 'Assunto principal', traga o foco central da conversa, priorizando o que se relaciona com os temas "
        "importantes ou urgentes do usuário.\n"
        "- Em 'Assuntos discutidos', liste apenas os tópicos realmente tratados na transcrição.\n"
        "- Inclua 'Atividades a serem realizadas' somente se houver ação clara como responder, enviar algo, "
        "cobrar, agendar, revisar, mandar relatório ou e-mail.\n"
        "- Se não houver ação clara, omita completamente o bloco 'Atividades a serem realizadas'.\n"
        "- Nunca escreva que não há ação identificada.\n"
        "- Nunca invente nomes, prazos, tarefas ou contextos ausentes.\n\n"
        f"Transcrição:\n{transcription}"
    )
    return system, user


def build_footer(is_trial: bool = True) -> str:
    """
    Constrói a assinatura final da mensagem.
    Se for trial, inclui o link da Summi.
    Se for pago, remove o link.
    """
    base = "_👩🏻 Summi - Secretária Invisível_"
    if is_trial:
        return f"{base}\n\n_🔗 summi.gera-leads.com_"
    return base
