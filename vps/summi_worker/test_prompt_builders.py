from __future__ import annotations

import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from summi_worker.analysis import build_audio_script, build_summary_text
from summi_worker.prompt_builders import (
    SUMMI_HOUR_FALLBACK_AUDIO_SCRIPT,
    SUMMI_HOUR_FALLBACK_TEXT,
    build_transcription_summary_prompt,
    choose_transcription_summary_mode,
    is_empty_summi_hour,
    is_internal_summi_thread,
)


class _OpenAIStub:
    def __init__(self, response: str = "stubbed response") -> None:
        self.response = response
        self.calls: list[dict[str, object]] = []

    def chat_text(self, *, model: str, system: str, user: str, temperature: float = 0.4) -> str:
        self.calls.append(
            {
                "model": model,
                "system": system,
                "user": user,
                "temperature": temperature,
            }
        )
        return self.response


class PromptBuildersTest(unittest.TestCase):
    def test_build_summary_text_returns_fixed_fallback(self) -> None:
        text = build_summary_text(None, "gpt-4o-mini", items=[])
        self.assertEqual(text, SUMMI_HOUR_FALLBACK_TEXT)
        self.assertTrue(is_empty_summi_hour(text))

    def test_build_audio_script_uses_deterministic_fallback(self) -> None:
        openai = _OpenAIStub()

        script = build_audio_script(
            openai,
            "gpt-4o-mini",
            summary_text=SUMMI_HOUR_FALLBACK_TEXT,
        )

        self.assertEqual(script, SUMMI_HOUR_FALLBACK_AUDIO_SCRIPT)
        self.assertEqual(openai.calls, [])

    def test_build_audio_script_uses_llm_for_real_summary(self) -> None:
        openai = _OpenAIStub(response="Summi da Hora: a Marina pediu retorno hoje.")

        script = build_audio_script(
            openai,
            "gpt-4o-mini",
            summary_text="✨ *Summi da Hora*\n\n🚨 *Marina*\n📝 Precisa de retorno ainda hoje.\n🔗 wa.me/5562999999999",
        )

        self.assertEqual(script, "Summi da Hora: a Marina pediu retorno hoje.")
        self.assertEqual(len(openai.calls), 1)
        self.assertIn("Nunca invente nomes", openai.calls[0]["system"])
        self.assertEqual(openai.calls[0]["temperature"], 0.2)

    def test_choose_transcription_summary_mode_prefers_direct_for_short_audio(self) -> None:
        mode = choose_transcription_summary_mode(
            "Fechamos o orçamento e ele pediu o contrato ainda hoje.",
            audio_seconds=40,
        )
        self.assertEqual(mode, "direct")

    def test_choose_transcription_summary_mode_prefers_structured_for_dense_audio(self) -> None:
        transcription = " ".join(["tema"] * 120)
        mode = choose_transcription_summary_mode(transcription, audio_seconds=180)
        self.assertEqual(mode, "structured")

    def test_structured_transcription_prompt_omits_empty_action_instruction(self) -> None:
        system, user = build_transcription_summary_prompt(
            "Falamos de planejamento, metas, revisão do funil e status do projeto.",
            temas_urgentes="prazo, cliente",
            temas_importantes="planejamento, funil",
            audio_seconds=180,
        )

        self.assertIn("*Assunto principal*", user)
        self.assertIn("*Assuntos discutidos*", user)
        self.assertIn("*Atividades a serem realizadas*", user)
        self.assertIn("omita completamente", user)
        self.assertNotIn("Nenhuma ação identificada", user)
        self.assertIn("jamais invente", system)

    def test_direct_transcription_prompt_stays_simple(self) -> None:
        _system, user = build_transcription_summary_prompt(
            "O cliente quer o relatório até amanhã.",
            temas_urgentes="relatório",
            temas_importantes="cliente",
            audio_seconds=45,
        )

        self.assertIn("Não use blocos, títulos ou listas", user)

    def test_internal_summi_thread_detection_uses_only_digits(self) -> None:
        self.assertTrue(is_internal_summi_thread("556293984600@s.whatsapp.net", "556293984600"))
        self.assertFalse(is_internal_summi_thread("5562982574301", "556293984600"))


if __name__ == "__main__":
    unittest.main()
