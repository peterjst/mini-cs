# Military Radio Voice Processing Design

## Problem
Current voice lines use browser SpeechSynthesis (TTS) with minimal processing, resulting in a flat, robotic "Google Translate" sound that breaks immersion.

## Solution
Route TTS output through a Web Audio processing chain that simulates a heavy military UHF tactical radio. Enforce male voice selection.

## Voice Selection
- Aggressively filter `getVoices()` for male voices: match names containing "Male", "David", "Daniel", "James", etc.
- Lower pitch from 0.8 to 0.65, increase rate from 1.1 to 1.15 (faster, more urgent)
- Fallback chain: male English local -> any male -> any English (with extra pitch lowering)

## Audio Processing Chain

```
SpeechSynthesis -> MediaStreamDestination
    -> GainNode (input trim)
    -> BiquadFilter (highpass 600Hz, cuts boomy low end)
    -> BiquadFilter (bandpass 1800Hz, Q=1.5, narrows to radio band)
    -> WaveShaperNode (hard clipping distortion, adds grit)
    -> DynamicsCompressorNode (heavy compression, -50dB threshold, 20:1 ratio)
    -> BiquadFilter (lowpass 3500Hz, rolls off highs)
    -> GainNode (mix with noise)
    -> AudioContext.destination
```

Parallel noise channel:
```
White noise buffer -> BiquadFilter (bandpass 2000Hz)
    -> GainNode (low volume, ~0.04)
    -> merge into output
```

## Radio Squelch Enhancement
- Extend squelch from 40-50ms to 80-100ms with more aggressive frequency sweep
- Add noise burst at open/close
- Start speech processing ~30ms before squelch ends for slight overlap

## Phrase Changes

| Current         | New        |
|-----------------|------------|
| Enemy spotted   | Contact!   |
| (all others)    | (unchanged)|

## Technical Approach
1. Create `MediaStreamAudioDestinationNode` as speech output sink (via `setSinkId` if supported)
2. Fallback: apply effects to `AudioContext.destination` globally during speech playback
3. All processing nodes created once at init and reused

## Files Changed
- `js/sound.js` — Voice selection, processing chain, updated radioVoice/announcer, enhanced squelch
- `js/main.js` — "Enemy spotted" -> "Contact!" in RADIO_LINES
- `index.html` — Radio menu text update
- `REQUIREMENTS.md` — Update voice/radio documentation
