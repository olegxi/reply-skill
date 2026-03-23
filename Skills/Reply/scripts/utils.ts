// utils.ts — Terminal colors, table formatting, status labels

// ANSI color helpers
export const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
export const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
export const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
export const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
export const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`;
export const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
export const magenta = (s: string) => `\x1b[35m${s}\x1b[0m`;

export function printHeader(title: string) {
  const line = "═".repeat(title.length + 4);
  console.log(cyan(`╔${line}╗`));
  console.log(cyan(`║  ${bold(title)}  ${cyan("║")}`));
  console.log(cyan(`╚${line}╝`));
}

export function printTable(headers: string[], rows: string[][]) {
  const colWidths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => (r[i] || "").length))
  );

  const separator = colWidths.map((w) => "─".repeat(w + 2)).join("┼");
  const formatRow = (row: string[]) =>
    row.map((cell, i) => ` ${(cell || "").padEnd(colWidths[i])} `).join("│");

  console.log(dim(`┌${colWidths.map((w) => "─".repeat(w + 2)).join("┬")}┐`));
  console.log(`│${formatRow(headers.map(bold))}│`);
  console.log(dim(`├${separator}┤`));
  for (const row of rows) {
    console.log(`│${formatRow(row)}│`);
  }
  console.log(dim(`└${colWidths.map((w) => "─".repeat(w + 2)).join("┴")}┘`));
}

export function printSuccess(msg: string) {
  console.log(green(`✓ ${msg}`));
}

export function printError(msg: string) {
  console.error(red(`✗ ${msg}`));
}

export function printWarning(msg: string) {
  console.log(yellow(`⚠ ${msg}`));
}

export function printInfo(msg: string) {
  console.log(cyan(`ℹ ${msg}`));
}

export function statusLabel(code: number): string {
  switch (code) {
    case 0: return yellow("New");
    case 2: return green("Active");
    case 4: return red("Paused");
    default: return dim(`Unknown(${code})`);
  }
}

export function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function truncate(str: string, maxLen: number): string {
  if (!str) return "";
  return str.length > maxLen ? str.slice(0, maxLen - 1) + "…" : str;
}

export function parseArgs(argv: string[]): { action: string; flags: Record<string, string> } {
  const action = argv[2] || "";
  const flags: Record<string, string> = {};
  for (let i = 3; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const key = argv[i].slice(2);
      flags[key] = argv[i + 1] || "true";
      i++;
    }
  }
  return { action, flags };
}
