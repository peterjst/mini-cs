# Boss Fight Skip — Design Spec

## Overview

Add a "BOSS FIGHT" button to the Competitive mode card that lets the player skip directly to the boss round (round 6) with $10,000 starting money and a buy phase.

## Motivation

The boss encounter is the climax of Competitive mode, but reaching it requires playing through 5 rounds first. Players who want to practice the boss fight or jump straight to the action currently have no shortcut.

## Scope

- Menu UI: one new button on the Competitive mode card
- Game logic: flag-based round skip at match start
- No changes to boss behavior, spawning, phases, or combat logic

## Design

### Menu UI

- A "BOSS FIGHT" button added to the Competitive mode card, alongside existing difficulty and map selection controls
- Styled with a crimson/red theme (matching the boss's armor color) to visually distinguish it from the regular "START" button
- Clicking "BOSS FIGHT" sets `GAME._skipToBoss = true` and starts the match with the selected difficulty and map

### Game Logic

When `GAME._skipToBoss` is true at match start:

1. **Round counter**: Set to round 6 immediately, skipping rounds 1-5
2. **Starting money**: $10,000 (instead of default $800)
3. **Buy phase**: Standard buy phase timer runs so the player can purchase weapons and armor
4. **Boss round**: Plays out using existing round 6 logic — boss spawns with 1-2 regular bots, all phases, minions, barrage, charge attacks, adaptive tactics, etc.
5. **Match end**: Match ends after the boss round as normal (win/loss based on this single round)
6. **XP**: Awarded for the single round played using standard competitive XP formula
7. **Flag reset**: `_skipToBoss` cleared after match starts so it doesn't persist into the next game

### What Does NOT Change

- Boss stats, phases, health, abilities
- Boss minion spawning and behavior
- Boss barrage, charge attack, adaptive tactics
- Boss kill payoff (slow-mo, flash, explosion, gold announcement)
- Boss sounds (heartbeat, atmosphere, victory stinger)
- Regular competitive mode flow (when "BOSS FIGHT" is not used)
