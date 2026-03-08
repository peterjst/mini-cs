# Menu UX Overhaul — Design

## Goal
Make the main menu sell the game before the player clicks anything. Two pillars: visual wow factor (live 3D background) and reduced friction (Quick Play button).

---

## 1. Live 3D Menu Background

### How It Works
- On `goToMenu()` and initial load, build a random map into a fresh `THREE.Scene` using `GAME.buildMap()` — no enemies or player spawned
- Define a scripted camera flythrough path per map: an array of `{ position, lookAt, duration }` keyframes (4-6 per map, 20-30 second loop)
- Camera smoothly interpolates between keyframes using lerp, looping continuously
- The existing game loop already calls `renderWithBloom()` in MENU state — update camera position each frame during MENU instead of doing nothing
- Ambient sound (`startAmbient`) plays for the background map
- Birds fly in the background (spawned by `buildMap`)

### Camera Paths
- ~4-6 keyframes per map creating a 20-30 second loop
- Heights vary: ground-level corridor sweeps + elevated overviews
- Showcases each map's landmarks and detail

### Menu CSS Changes
- Remove `background: radial-gradient(...)` from `#menu-screen` — make transparent
- Add subtle dark overlay (`rgba(0,0,0,0.3)`) so text remains readable
- Keep the vignette effect
- Remove floating dust particles, scan lines, and sweep animation — the live 3D scene replaces them

---

## 2. Quick Play Button

### Placement & Styling
- Large prominent button centered below the title/rank area, above the mode grid
- Text: "QUICK PLAY" with subtle pulsing glow animation
- Styled distinctly from mode cards — bigger, brighter accent color, primary action feel

### Behavior
- Reads last-used settings from localStorage: `miniCS_difficulty`, `miniCS_mapMode`, `miniCS_selectedMap`, and mode-specific settings
- New `miniCS_lastMode` localStorage key tracks which game mode was last played (competitive/survival/gungame/deathmatch)
- Calls the appropriate start function with saved settings
- First-time fallback (no saved settings): Normal difficulty, random map, Competitive Solo
- Single click to playing — maximum one-click-to-action

### Settings Preview
- Small muted text below the button shows what you'll get: e.g. "Competitive Solo · Normal · Dust"
- Updates dynamically from localStorage

### Existing Mode Grid
- Stays below as the secondary path for players who want to customize
- No behavioral changes to mode cards

---

## 3. Menu UI Polish

### Text Readability Over 3D
- `#menu-content` gets `backdrop-filter: blur(4px)` plus a soft dark gradient behind the content column
- Title "MINI CS" keeps metallic gradient and glow — pops against real scene

### Simplified Background Elements
- Remove `#menu-bg` scan lines, sweep animation, floating particles
- Keep vignette as CSS overlay on menu screen

### Mode Cards
- Semi-transparent dark background (`rgba(10,15,25,0.7)`) with `backdrop-filter: blur(8px)`
- No other card changes

### Transitions
- Menu content fades out (0.3s) before gameplay begins on Quick Play or START
- On returning to menu, rebuild a new random background map and fade content back in

---

## Architecture Notes

### Renderer Lifecycle
- Single persistent renderer (already exists), single canvas
- Menu background scene assigned to the same `scene` variable
- On startMatch/startTour/etc., scene is replaced as usual — no lifecycle conflicts
- On goToMenu, new background scene built, camera flythrough resumes

### Performance
- No second renderer or canvas needed
- Background map built with same optimized `buildMap()` pipeline
- Camera updates are trivial per-frame cost

### Data Additions
- Camera flythrough keyframes defined per map (small data arrays)
- `miniCS_lastMode` localStorage key for Quick Play
