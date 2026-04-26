# Bloodstrike Tour Description Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the stale Bloodstrike entry in the tour map-select grid with copy that matches the actual map (loop arena, tan concrete, no catwalks, not red).

**Architecture:** Single-line text edit in `index.html`. No code paths, no state, no tests — UI copy only. Spec at `docs/superpowers/specs/2026-04-26-bloodstrike-description-design.md`.

**Tech Stack:** Static HTML (`index.html`).

---

## File Structure

- Modify: `index.html` line 2068 — Bloodstrike `<div class="tour-map-desc">` text only.

No files created, no files deleted, no other lines touched.

---

### Task 1: Update the Bloodstrike tour description

**Files:**
- Modify: `index.html:2068`

- [ ] **Step 1: Verify the current line at the expected location**

Run:
```bash
sed -n '2067,2069p' /Users/peter/Desktop/mini-cs/index.html
```

Expected output (exactly):
```html
      <div class="tour-map-name">Bloodstrike</div>
      <div class="tour-map-desc">Classic aim arena &mdash; blood-red enclosed arena, catwalks, symmetric layout</div>
    </button>
```

If the line number has drifted, locate the line with:
```bash
grep -n 'blood-red enclosed arena' /Users/peter/Desktop/mini-cs/index.html
```
and use that line number for Step 2.

- [ ] **Step 2: Replace the description text**

Use the Edit tool on `/Users/peter/Desktop/mini-cs/index.html`.

`old_string`:
```
      <div class="tour-map-desc">Classic aim arena &mdash; blood-red enclosed arena, catwalks, symmetric layout</div>
```

`new_string`:
```
      <div class="tour-map-desc">Loop arena &mdash; corridors circle a sealed inner block, tan concrete, brick trim</div>
```

Note: preserve the leading 6 spaces of indentation. Do not touch surrounding lines (`<button>`, `<div class="tour-map-name">`, `</button>`).

- [ ] **Step 3: Confirm the edit landed and nothing else changed**

Run:
```bash
grep -n 'tour-map-desc' /Users/peter/Desktop/mini-cs/index.html
```

Expected: 7 lines total (one per map). The Bloodstrike line should now read:
```
      <div class="tour-map-desc">Loop arena &mdash; corridors circle a sealed inner block, tan concrete, brick trim</div>
```

The other 6 `tour-map-desc` lines (Dust, Office, Warehouse, Italy, Aztec, Arena) must be unchanged.

Also run:
```bash
git -C /Users/peter/Desktop/mini-cs diff --stat index.html
```

Expected: `1 file changed, 1 insertion(+), 1 deletion(-)`. If insertions or deletions exceed 1, you touched something you should not have — revert and redo.

- [ ] **Step 4: Run the test suite**

Per `AGENTS.md`: "Run `npm test` after any change to `js/` or `index.html`."

Run:
```bash
cd /Users/peter/Desktop/mini-cs && npm test
```

Expected: all tests pass. There is no test for tour-menu copy (per spec, none is added), so this run only confirms we did not break unrelated tests that read from `index.html`.

If anything fails, do not commit — investigate the failure, fix, re-run.

- [ ] **Step 5: Manual visual check (browser)**

Open `index.html` in a browser, navigate to the tour map-select screen, and confirm:

1. The Bloodstrike tile shows the new description.
2. The text fits inside the tile at desktop width without wrapping awkwardly or overflowing.
3. The text fits at mobile width — resize the browser to ~400px wide (the `@media (max-width: 600px)` rule at `index.html:1004` collapses the grid to a single column and shrinks `.tour-map-desc` to 11px font).

If the copy overflows or wraps badly, stop and report — do not commit. Otherwise proceed.

- [ ] **Step 6: Commit**

Run:
```bash
cd /Users/peter/Desktop/mini-cs && git add index.html && git commit -m "docs(ui): refresh stale Bloodstrike tour description"
```

Expected: one commit, one file changed, one insertion, one deletion.

---

## Self-Review

- **Spec coverage:** Spec calls for one line change in `index.html:2068`, exact `before`/`after` text, manual browser verification at desktop and mobile widths, no tests, no other map descriptions touched. Task 1 covers all of it.
- **Placeholder scan:** None — every step has the exact command, exact text, or exact expected output.
- **Type consistency:** N/A (no code).
- **Scope:** Single file, single line, single commit. Matches the spec's "Risk: minimal" framing.
