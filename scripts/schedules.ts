// schedules.ts — List/get/create sending schedules

import { api } from "./api-client.js";
import { printHeader, printTable, printSuccess, printError, printInfo, parseArgs } from "./utils.js";

function formatTimings(timings: any[]): string {
  if (!timings?.length) return "—";
  return timings
    .filter((t: any) => t.isActive)
    .map((t: any) => {
      const ranges = (t.timeRanges || [])
        .map((r: any) => `${pad(r.fromTime.hour)}:${pad(r.fromTime.minute)}-${pad(r.toTime.hour)}:${pad(r.toTime.minute)}`)
        .join(", ");
      return `${t.weekDay.slice(0, 3)}: ${ranges}`;
    })
    .join(" | ");
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

async function list() {
  printHeader("Sending Schedules");
  const schedules = await api.get("/v2/schedules");
  if (!schedules || schedules.length === 0) {
    printInfo("No schedules found.");
    return;
  }
  printTable(
    ["ID", "Name", "Timezone", "Default", "Active Days"],
    schedules.map((s: any) => [
      String(s.id),
      s.name || "—",
      s.timezoneId || "—",
      s.isDefault ? "Yes" : "",
      formatTimings(s.mainTimings),
    ])
  );
}

async function get(flags: Record<string, string>) {
  if (!flags.id) {
    printError("Required: --id");
    process.exit(1);
  }
  const s = await api.get(`/v2/schedules/${flags.id}`);
  console.log(JSON.stringify(s, null, 2));
}

async function create(flags: Record<string, string>) {
  // Accepts JSON config via --config flag
  if (!flags.config) {
    printError("Required: --config (JSON string with schedule config)");
    console.log('\nExample: schedules.ts create --config \'{"name":"Business Hours","timezoneId":"Eastern Standard Time","mainTimings":[...]}\'');
    process.exit(1);
  }

  const config = JSON.parse(flags.config);
  const result = await api.post("/v2/schedules", config);
  printSuccess(`Schedule created. ID: ${result.id}`);
}

// Main
(async () => {
  const { action, flags } = parseArgs(process.argv);
  try {
    switch (action) {
      case "list": await list(); break;
      case "get": await get(flags); break;
      case "create": await create(flags); break;
      default:
        console.log("Usage: schedules.ts <list|get|create> [flags]");
        process.exit(1);
    }
  } catch (e: any) {
    printError(e.message);
    process.exit(1);
  }
})();
