# Bug: Audio Transcription Ignoring User Configuration

## Phase 1: Reproduce

**Issue Report:**
- User Lucas (lucasborges_5286) sent an audio to Bruno
- Audio was transcribed/summarized even though Lucas has "TRANSCREVER AUDIOS ENVIADOS" disabled
- Bruno then received the same summarized audio, creating duplicate content in conversation

**Reproduction Rate:** 100% (confirmed behavior)

**Expected Behavior:**
- If `transcreve_audio_recebido = False` → received audios should NOT be transcribed
- If `transcreve_audio_enviado = False` → sent audios should NOT be transcribed

**Actual Behavior:**
- Audio is ALWAYS transcribed regardless of user configuration
- User config only controls WHETHER TO SEND the transcription, not WHETHER TO TRANSCRIBE

---

## Phase 2: Isolate

**Root Cause Located:** `/Users/Lucas-Lenovo/Summi/summi-b1463168/vps/summi_worker/app.py`

**Lines 928-935 (THE BUG):**
```python
# ❌ BUG: Always transcribes, no config check
transcription, transcription_meta = _transcribe_audio_with_fallback(
    openai=openai,
    settings=settings,
    profile=profile,
    audio_bytes=mp3_bytes,
)
transcript = transcription.text
```

**Lines 1000-1007 (CURRENT LOGIC):**
```python
# ❌ CONFIG CHECKED TOO LATE
can_send_based_on_origin = (
    _profile_bool(profile, "transcreve_audio_enviado", True)
    if from_me
    else _profile_bool(profile, "transcreve_audio_recebido", True)
)
# Resume automático pode forçar envio mesmo com config desligada
should_send_now = (can_send_based_on_origin or should_summarize) and (not send_on_reaction)
```

**The Problem:**
1. Audio is transcribed UNCONDITIONALLY at line 928
2. User config (`transcreve_audio_enviado`/`transcreve_audio_recebido`) is only checked at line 1000
3. The config only controls whether to SEND the transcription, not whether to transcribe
4. Even with config disabled, if `should_summarize=True`, transcription is still sent

---

## Phase 3: Understand (Root Cause Analysis)

### The 5 Whys

1. **Why is audio being transcribed when user disabled it?**
   - Because `_transcribe_audio_with_fallback()` is called unconditionally at line 928

2. **Why is the config check happening after transcription?**
   - Original design separated concerns: transcription from message processing, send decision from transcription

3. **Why doesn't disabling `transcreve_audio_recebido` prevent transcription?**
   - The config is only used for `should_send_now` decision, not `should_transcribe` decision

4. **Why do we get duplicate transcriptions across users?**
   - When Bruno receives Lucas's audio, it's transcribed in Bruno's context too
   - If Bruno has transcription enabled, it gets transcribed AND sent
   - Result: Lucas's audio summary + Bruno's independent summary = 2 messages

5. **Root Cause:**
   - **Architectural bug**: Transcription decision was never connected to user configuration
   - The code assumes "transcribe everything, filter on send" instead of "check config before transcribing"

---

## Phase 4: Fix & Verify Strategy

### Solution Overview
Move the config check BEFORE transcription, so we only transcribe if:
- User has enabled transcription for that audio type (sent/received), OR
- Audio is long enough to trigger automatic summarization (>45s by default)

### Key Changes

**In audio processing block (line 857+):**
1. Before line 928, calculate `should_transcribe` based on:
   - `can_send_based_on_origin` (respects user config)
   - `should_summarize` (long audio triggers transcription)
2. Only call `_transcribe_audio_with_fallback()` if `should_transcribe=True`
3. If skipped, set `transcript=""` and mark as skipped in metadata

**Edge Cases to Handle:**
- Lightning reaction (⚡) → always transcribe (current behavior correct)
- Long audio (>45s) → transcribe for summarization even if config disabled
- Already transcribed audio → skip (current logic at line 895 stays)

---

## Verification Checklist

After fix:
- [ ] User with `transcreve_audio_recebido=False` receives audio → no transcription in response
- [ ] User with `transcreve_audio_enviado=False` sends audio → no transcription in response
- [ ] Audio >45s with `resume_audio=True` → still transcribed and summarized (long audio exception)
- [ ] Lightning reaction (⚡) → still transcribes on-demand
- [ ] Already-played audio → skipped (dedup still works)
- [ ] Logs show `audio_transcription_skipped reason=config_disabled` for disabled users
- [ ] Metrics: `audio_segundos` not incremented if transcription skipped
- [ ] No duplicate transcriptions in group chats where different users have different configs

---

## Files to Modify
- `vps/summi_worker/app.py` (lines 857-1007)

## Testing Strategy
1. **Manual**: Set `transcreve_audio_recebido=False`, send audio, verify no response
2. **Manual**: Set both disabled, send long audio (50s), verify it still gets summarized
3. **Logging**: Check logs for `audio_transcription_skipped reason=config_disabled`
