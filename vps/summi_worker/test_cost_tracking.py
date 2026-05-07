from decimal import Decimal
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from summi_worker.cost_tracking import calculate_chat_cost, calculate_transcription_cost


class CostTrackingTest(unittest.TestCase):
    def test_gemini_flash_lite_transcription_cost_uses_audio_token_rate(self) -> None:
        self.assertEqual(
            calculate_transcription_cost(60, model="gemini-2.5-flash-lite"),
            Decimal("0.00057600"),
        )

    def test_gemini_flash_lite_chat_cost_uses_text_token_rate(self) -> None:
        self.assertEqual(
            calculate_chat_cost(1000, 1000, model="gemini-2.5-flash-lite"),
            Decimal("0.00050000"),
        )


if __name__ == "__main__":
    unittest.main()
