from __future__ import annotations

from typing import Optional, Tuple


SUMMI_HOUR_FALLBACK_TEXT = (
    "✨ *Summi da Hora*\n\nVocê não tem nenhuma demanda importante por agora, fique tranquilo. ✅"
)
SUMMI_HOUR_FALLBACK_AUDIO_SCRIPT = "Summi da Hora: não há nada de importante por agora."


def _compact_text(value: str | None) -> str:
    return " ".join(str(value or "").split()).strip().casefold()


def _digits(value: str | None) -> str:
    return "".join(ch for ch in str(value or "") if ch.isdigit())


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
