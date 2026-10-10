/**
 * Statusbar Extension - custom pi footer.
 *
 * Row 1, left to right:
 *   1. working folder (cwd)
 *   2. token counters: ↑ out / ↓ in, formatted with 1 decimal (e.g. 45.6k)
 *   3. context-window usage as a bare color-changing bar (no label, no %),
 *      15 cells wide, followed by the total consumed context tokens in k:
 *        < 100k tokens  -> green   (theme "success")
 *        100k..130k     -> yellow  (theme "warning")
 *        > 130k         -> red     (theme "error")
 *
 * Row 2: model name, model context-window size in short form (e.g. 256k, 1M), thinking level.
 *
 * Deliberately omitted: percentage display, money spent, git branch.
 *
 * The footer is installed automatically at session start (TUI mode only).
 * `/statusbar` toggles between this custom footer and pi's built-in one.
 */

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

/** Context-token thresholds (absolute tokens) driving the bar color. */
const GREEN_BELOW = 100_000;
const YELLOW_UP_TO = 130_000;

/** Width of the context bar in terminal cells. */
const BAR_WIDTH = 15;

/** Format a token count with 1 decimal in k-units (e.g. 45.6k, 999). */
function formatTokens(n: number): string {
	return n < 1000 ? `${n}` : `${(n / 1000).toFixed(1)}k`;
}

/** Format a context-window size with the conventional short form (256k, 1M, 1.5M). */
function formatContextSize(n: number): string {
	if (n >= 1_048_576 && n % 1_048_576 === 0) return `${n / 1_048_576}M`;
	if (n >= 1_000_000) return `${Math.round(n / 100_000) / 10}M`;
	if (n >= 1000 && n % 1000 === 0) return `${n / 1000}k`;
	if (n >= 1000 && n % 1024 === 0) return `${n / 1024}k`;
	if (n >= 1000) return `${Math.round(n / 1000)}k`;
	return `${n}`;
}

/** Render a BAR_WIDTH-cell progress bar; fraction 0..1. */
function bar(fraction: number): string {
	const clamped = Math.max(0, Math.min(1, fraction));
	const filled = Math.round(clamped * BAR_WIDTH);
	return "█".repeat(filled) + "░".repeat(BAR_WIDTH - filled);
}

export default function (pi: ExtensionAPI) {
	let customEnabled = false;

	function installFooter(ctx: ExtensionContext) {
		ctx.ui.setFooter((tui, theme, _footerData) => ({
			dispose() {},
			invalidate() {},
			render(width: number): string[] {
				// 1. working folder
				const cwd = theme.fg("dim", ctx.cwd);

				// 2. tokens out / tokens in (1 decimal)
				let input = 0;
				let output = 0;
				for (const e of ctx.sessionManager.getBranch()) {
					if (e.type === "message" && e.message.role === "assistant") {
						input += e.message.usage.input;
						output += e.message.usage.output;
					}
				}
				const tokens = theme.fg("dim", `↑ ${formatTokens(output)}  ↓ ${formatTokens(input)}`);

				// 3. context window usage: bare color-changing bar (no label, no percentage)
				const usage = ctx.getContextUsage();
				let contextPart: string;
				if (!usage || usage.tokens === null || usage.percent === null) {
					contextPart = `${theme.fg("dim", bar(0))} ${theme.fg("dim", "--")}`;
				} else {
					const color =
						usage.tokens < GREEN_BELOW ? "success" : usage.tokens <= YELLOW_UP_TO ? "warning" : "error";
					contextPart = `${theme.fg(color, bar(usage.percent / 100))} ${theme.fg("dim", formatTokens(usage.tokens))}`;
				}

				const left = `${cwd}  ${tokens}`;
				const gap = " ".repeat(Math.max(1, width - visibleWidth(left) - visibleWidth(contextPart)));
				const row1 = truncateToWidth(`${left}${gap}${contextPart}`, width);

				// Row 2: model name, context-window size, thinking effort
				const modelId = ctx.model?.id ?? "no model";
				const contextSize = ctx.model ? formatContextSize(ctx.model.contextWindow) : "?";
				const thinking = ctx.thinkingLevel ?? "n/a";
				const row2 = truncateToWidth(
					theme.fg("dim", `${modelId}  ${contextSize}  thinking: ${thinking}`),
					width,
				);

				return [row1, row2];
			},
		}));
	}

	pi.on("session_start", (_event, ctx) => {
		if (ctx.mode !== "tui") return;
		customEnabled = true;
		installFooter(ctx);
	});

	pi.registerCommand("statusbar", {
		description: "Toggle between the custom statusbar and pi's built-in footer",
		handler: async (_args, ctx) => {
			customEnabled = !customEnabled;
			if (customEnabled) {
				installFooter(ctx);
				ctx.ui.notify("Custom statusbar enabled", "info");
			} else {
				ctx.ui.setFooter(undefined);
				ctx.ui.notify("Built-in footer restored", "info");
			}
		},
	});
}
