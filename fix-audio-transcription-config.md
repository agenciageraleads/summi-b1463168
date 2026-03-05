# Fix: Audio Transcription Respecting User Configuration

## Goal
Move transcription decision logic to happen BEFORE transcription, not after, so user configuration prevents unnecessary transcription and API costs.

## Tasks

1. **Extract transcription decision logic into standalone function**
   - Create `_should_transcribe_audio()` function that returns True/False
   - Input: `from_me`, `profile`, `audio_seconds`, `should_summarize`, `message_id`, `conversa`
   - Returns: boolean indicating if audio should be transcribed
   - Action: Add function before line 857, above audio processing block
   - Verify: Function defined and handles all input cases

2. **Move `should_summarize` calculation earlier**
   - Move lines 959-963 (resume_audio check) to earlier in audio block
   - Must calculate before checking `_should_transcribe_audio()`
   - Verify: `should_summarize` variable available before transcription decision

3. **Calculate `should_transcribe` before calling OpenAI**
   - At line ~926 (before `_transcribe_audio_with_fallback`), call `_should_transcribe_audio()`
   - Assign result to new variable `should_transcribe`
   - Verify: Variable calculated before transcription API call

4. **Conditionally transcribe based on decision**
   - Wrap `_transcribe_audio_with_fallback()` call in `if should_transcribe:` block
   - If False: set `transcript = ""` and `transcription_meta = {}`
   - Set metadata flag: `extra["audio_transcription_skipped"] = True` + reason
   - Verify: When disabled, transcription is skipped (no OpenAI call)

5. **Log transcription skips**
   - Add logger.info() call with reason why transcription was skipped
   - Format: "evolution_webhook.audio_transcription_skipped_config_disabled ..."
   - Include: instance, message_id, from_me, config_setting value
   - Verify: Logs show skip reason clearly

6. **Verify existing logic still works**
   - Already-transcribed audio still skips (line 895: `_should_skip_transcription`)
   - Lightning reaction (⚡) still transcribes on-demand (line 1042)
   - Long audio still summarizes even if transcription config disabled
   - Metrics only incremented for transcribed audio
   - Verify: Read code to confirm no conflicts with existing logic

7. **Test in staging**
   - Create user profile with `transcreve_audio_recebido = False`
   - Send audio message, verify NO transcription response
   - Check logs for `audio_transcription_skipped_config_disabled`
   - Check OpenAI usage: no charge for that message
   - Verify: Audio not transcribed despite being received

8. **Test long audio exception**
   - User has `transcreve_audio_recebido = False` but `resume_audio = True`
   - Send long audio (>45s)
   - Verify: Audio IS transcribed and summarized (long audio overrides config)
   - Verify: Reason is "should_summarize=true" not config

## Done When
- [ ] All tasks completed
- [ ] Transcription skipped when user has config disabled
- [ ] Long audio still transcribes/summarizes as override
- [ ] Lightning reaction still works on-demand
- [ ] Logs clearly show skip reasons
- [ ] No OpenAI costs for skipped transcriptions
- [ ] Existing dedup logic still works
- [ ] Code reviewed for unintended side effects
