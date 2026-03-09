from __future__ import annotations

import sys
import types
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

if "requests" not in sys.modules:
    requests_stub = types.ModuleType("requests")
    requests_stub.post = None
    sys.modules["requests"] = requests_stub

if "mutagen" not in sys.modules:
    mutagen_stub = types.ModuleType("mutagen")
    mutagen_stub.File = lambda *args, **kwargs: None
    sys.modules["mutagen"] = mutagen_stub

from summi_worker.analysis import build_audio_script, build_summary_text
from summi_worker.prompt_builders import (
    SUMMI_HOUR_FALLBACK_AUDIO_SCRIPT,
    SUMMI_HOUR_FALLBACK_TEXT,
    build_footer,
    build_transcription_prompt,
    build_transcription_summary_prompt,
    choose_transcription_fallback_reason,
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

    def test_transcription_prompt_injects_business_context_without_losing_guardrails(self) -> None:
        prompt = build_transcription_prompt(
            {
                "nome": "Lucas Imperial",
                "temas_urgentes": "CNPJ, orçamento",
                "temas_importantes": "DeWalt, prazo de entrega",
            },
            extra_context="Makita, nota fiscal",
        )

        self.assertIn("português do Brasil", prompt)
        self.assertIn("Lucas Imperial", prompt)
        self.assertIn("CNPJ", prompt)
        self.assertIn("DeWalt", prompt)
        self.assertIn("Makita", prompt)
        self.assertIn("Não resuma", prompt)

    def test_fallback_reason_prefers_critical_content_when_confidence_is_borderline(self) -> None:
        reason = choose_transcription_fallback_reason(
            "Me passa o CNPJ 12.345.678/0001-90 e o orçamento da DeWalt.",
            average_confidence=0.71,
            confidence_threshold=0.55,
            critical_confidence_threshold=0.8,
            hint_terms=["DeWalt"],
        )

        self.assertEqual(reason, "critical_content_low_confidence")

    def test_fallback_reason_detects_suspicious_repetition(self) -> None:
        reason = choose_transcription_fallback_reason(
            "da da da Dewalt me manda o orçamento",
            average_confidence=None,
            confidence_threshold=0.55,
            critical_confidence_threshold=0.8,
        )

        self.assertEqual(reason, "suspicious_repetition")

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

    def test_build_footer_handles_trial_correctly(self) -> None:
        # Test Trial
        footer_trial = build_footer(is_trial=True)
        self.assertIn("summi.gera-leads.com", footer_trial)
        self.assertIn("Secretária Invisível", footer_trial)
        
        # Test Paid
        footer_paid = build_footer(is_trial=False)
        self.assertNotIn("summi.gera-leads.com", footer_paid)
        self.assertIn("Secretária Invisível", footer_paid)


if __name__ == "__main__":
    unittest.main()
