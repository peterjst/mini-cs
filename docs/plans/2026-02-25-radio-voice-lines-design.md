# Radio Voice Lines Design

## Overview

Add CS-style radio voice commands using the browser's Web Speech API (SpeechSynthesis) with procedural radio static effects. Both players and bots trigger voice lines. Zero external files required.

## Voice Lines & Triggers

Nine core lines:

| Line | Bot auto-trigger | Player radio |
|------|-----------------|-------------|
| "Go go go!" | Round start (random bot, 30% chance, max 1) | Yes (Z → 1) |
| "Fire in the hole!" | On grenade throw (by thrower) | Yes (Z → 2) |
| "Enemy spotted" | On spotting player (8s per-bot cooldown) | Yes (Z → 3) |
| "Need backup" | On low HP < 30% (once per life) | Yes (Z → 4) |
| "Affirmative" | Bot acknowledges (random response) | Yes (Z → 5) |
| "Negative" | — | Yes (Z → 6) |
| "Counter-terrorists win" | Round win (announcer) | No |
| "Terrorists win" | Round lose (announcer) | No |

## Radio Effect

Each voice line is wrapped in a radio static envelope:

1. **Radio open** (~50ms): Procedural noise burst, bandpass 1500-4000Hz, simulating squelch click
2. **Speech**: `SpeechSynthesisUtterance` — rate 1.1, pitch 0.8, volume 0.8. Prefer male English voice from available voices, fall back to default.
3. **Radio close** (~40ms): Noise burst, slightly lower gain than open

Announcer lines (round win/lose) skip radio static, use slower rate and normal pitch for authoritative tone.

## Cooldown System

- Global voice cooldown: 2s (no overlapping lines)
- Per-bot "Enemy spotted" cooldown: 8s
- Announcer lines override cooldowns and interrupt other lines

## Sound Integration

New methods on `GAME.Sound`:

- `radioVoice(text)` — plays radio open, speech, radio close
- `radioOpen()` — procedural squelch burst
- `radioClose()` — procedural squelch burst (lower gain)
- `announcer(text)` — authoritative speech, no radio static

Voice selection runs on init: scan `speechSynthesis.getVoices()`, prefer male English voice.

## Player Radio Menu

Press **Z** to toggle a numbered overlay (center-left):

```
RADIO COMMANDS
1. Go go go!
2. Fire in hole
3. Enemy spotted
4. Need backup
5. Affirmative
6. Negative
```

- Press 1-6 to trigger and close
- Auto-closes after 3s of no input
- Does not pause gameplay
- Semi-transparent dark background, monospace text
- Hidden during menus and buy phase

## HUD Feedback

When any voice line plays (player or bot), display in the kill feed area:
`[RADIO] Go go go!` — fades after 2s. Mirrors CS's chat-area radio callout.

## Technical Constraints

- No audio files — SpeechSynthesis + procedural Web Audio only
- Voice quality varies by browser/OS (acceptable trade-off)
- IIFE module pattern, methods on `GAME.Sound`
