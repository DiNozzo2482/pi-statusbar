# pi-statusbar

Custom statusbar (footer) extension for the [pi coding agent](https://github.com/badlogic/pi-mono) — a compact, information-dense footer for the TUI.

## Layout

**Row 1** (left → right):
1. Working folder (cwd)
2. Token counters: `↑` out / `↓` in, formatted with 1 decimal (`45.6k`)
3. Context-window usage as a bare color-changing bar (no label, no %), 15 cells wide, followed by total consumed context tokens:

| Tokens consumed | Color  |
| --------------- | ------ |
| < 100k          | green  |
| 100k – 130k     | yellow |
| > 130k          | red    |

**Row 2**: model name, context-window size (`256k`, `1M`), thinking level.

Deliberately omitted: percentage display, money spent, git branch.

## Install

Copy (or symlink) `index.ts` into your pi extensions directory:

```bash
mkdir -p ~/.pi/agent/extensions/statusbar
cp index.ts ~/.pi/agent/extensions/statusbar/
```

The footer installs automatically at session start (TUI mode only).

## Usage

| Command      | Effect                                                        |
| ------------ | ------------------------------------------------------------- |
| `/statusbar` | Toggle between this custom footer and pi's built-in one        |

## Requirements

- pi coding agent (tested with `@earendil-works/pi-coding-agent` 1.1.x)
- Dev dependencies (`@earendil-works/pi-coding-agent`, `@earendil-works/pi-tui`) are only needed if you edit the file outside of pi — pi loads the extension itself.
