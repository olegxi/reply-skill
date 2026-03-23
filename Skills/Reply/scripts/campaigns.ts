// campaigns.ts — List/create/duplicate/start/pause campaigns (sequences)

import { api } from "./api-client.js";
import { printHeader, printTable, printSuccess, printError, printInfo, printWarning, parseArgs, statusLabel, truncate, formatDate, bold, green, yellow, dim, cyan } from "./utils.js";

async function list() {
  printHeader("Campaigns (Sequences)");
  const campaigns = await api.get("/v1/campaigns");
  if (!campaigns || campaigns.length === 0) {
    printInfo("No campaigns found.");
    return;
  }
  printTable(
    ["ID", "Name", "Status", "People", "Active", "Delivered", "Opens", "Replies", "Created"],
    campaigns.map((c: any) => [
      String(c.id),
      truncate(c.name || "—", 30),
      statusLabel(c.status),
      String(c.peopleCount || 0),
      String(c.peopleActive || 0),
      String(c.deliveriesCount || 0),
      String(c.opensCount || 0),
      String(c.repliesCount || 0),
      formatDate(c.created),
    ])
  );
  console.log(`\nTotal: ${campaigns.length} campaigns`);
}

async function get(flags: Record<string, string>) {
  if (!flags.id) {
    printError("Required: --id");
    process.exit(1);
  }
  const campaigns = await api.get(`/v1/campaigns?id=${flags.id}`);
  if (!campaigns || campaigns.length === 0) {
    printInfo("Campaign not found.");
    return;
  }
  const c = campaigns[0];
  console.log(JSON.stringify(c, null, 2));
}

async function steps(flags: Record<string, string>) {
  if (!flags.id) {
    printError("Required: --id (campaign ID)");
    process.exit(1);
  }
  printHeader(`Steps for Campaign ${flags.id}`);
  const stepList = await api.get(`/v2/campaigns/${flags.id}/steps`);
  if (!stepList || stepList.length === 0) {
    printInfo("No steps found.");
    return;
  }
  for (const step of stepList) {
    console.log(`\nStep ${step.number} (ID: ${step.id}) — Delay: ${step.inMinutesCount} min`);
    for (let i = 0; i < (step.templates || []).length; i++) {
      const t = step.templates[i];
      const variant = step.templates.length > 1 ? ` [Variant ${i + 1}]` : "";
      console.log(`  Subject${variant}: ${t.subject || "(no subject)"}`);
      console.log(`  Body${variant}: ${truncate(t.body?.replace(/<[^>]*>/g, "") || "", 100)}`);
      if (t.ccList) console.log(`  CC: ${t.ccList}`);
    }
  }
}

async function create() {
  // Reads JSON config from stdin
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const config = JSON.parse(Buffer.concat(chunks).toString("utf-8"));

  if (!config.name) {
    printError("Campaign config must include 'name'.");
    process.exit(1);
  }
  if (!config.emailAccounts || config.emailAccounts.length === 0) {
    printError("Campaign config must include 'emailAccounts' array.");
    process.exit(1);
  }

  const result = await api.post("/v2/campaigns", config);
  printSuccess(`Campaign created: "${result.name}" (ID: ${result.id})`);
  console.log(JSON.stringify(result, null, 2));
}

async function duplicate(flags: Record<string, string>) {
  if (!flags["source-id"]) {
    printError("Required: --source-id");
    process.exit(1);
  }
  if (!flags["new-name"]) {
    printError("Required: --new-name");
    process.exit(1);
  }

  const sourceId = flags["source-id"];
  const newName = flags["new-name"];

  // 1. Get source campaign details
  printInfo(`Fetching source campaign ${sourceId}...`);
  const campaigns = await api.get(`/v1/campaigns?id=${sourceId}`);
  if (!campaigns || campaigns.length === 0) {
    printError(`Campaign ${sourceId} not found.`);
    process.exit(1);
  }
  const source = campaigns[0];

  // 2. Get source steps
  const sourceSteps = await api.get(`/v2/campaigns/${sourceId}/steps`);

  // 3. Build new campaign payload
  const newCampaign: any = {
    name: newName,
    emailAccounts: source.emailAccounts || [],
  };

  // Clone steps
  if (sourceSteps?.length) {
    newCampaign.steps = sourceSteps.map((step: any) => ({
      number: String(step.number),
      InMinutesCount: String(step.inMinutesCount),
      templates: (step.templates || []).map((t: any) => ({
        subject: t.subject || "",
        body: t.body || "",
        ...(t.ccList ? { CcList: t.ccList } : {}),
      })),
    }));
  }

  // 4. Create the new campaign
  const result = await api.post("/v2/campaigns", newCampaign);
  printSuccess(`Campaign duplicated: "${result.name}" (ID: ${result.id})`);
  console.log(`Source: ${source.name} (${sourceId}) → New: ${result.name} (${result.id})`);
}

async function start(flags: Record<string, string>) {
  if (!flags.id) { printError("Required: --id"); process.exit(1); }
  const result = await api.post(`/v2/campaigns/${flags.id}/start`);
  printSuccess(`Campaign ${flags.id} started. Status: ${result.status}`);
}

async function pause(flags: Record<string, string>) {
  if (!flags.id) { printError("Required: --id"); process.exit(1); }
  const result = await api.post(`/v2/campaigns/${flags.id}/pause`);
  printSuccess(`Campaign ${flags.id} paused. Status: ${result.status}`);
}

async function archive(flags: Record<string, string>) {
  if (!flags.id) { printError("Required: --id"); process.exit(1); }
  const result = await api.post(`/v2/campaigns/${flags.id}/archive`);
  printSuccess(`Campaign ${flags.id} archived.`);
}

async function update(flags: Record<string, string>) {
  if (!flags.id) { printError("Required: --id"); process.exit(1); }
  // Reads JSON from stdin
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const config = JSON.parse(Buffer.concat(chunks).toString("utf-8"));
  const result = await api.patch(`/v2/campaigns/${flags.id}`, config);
  printSuccess(`Campaign ${flags.id} updated.`);
  console.log(JSON.stringify(result, null, 2));
}

function pct(num: number, den: number): string {
  if (!den) return "—";
  return (num / den * 100).toFixed(1) + "%";
}

async function stats(flags: Record<string, string>) {
  if (!flags.id) {
    printError("Required: --id (campaign ID)");
    process.exit(1);
  }

  // Fetch campaign details
  const result = await api.get(`/v1/campaigns?id=${flags.id}`);
  if (!result) {
    printInfo("Campaign not found.");
    return;
  }
  // API may return a single object or an array
  const c = Array.isArray(result) ? result[0] : result;
  if (!c || !c.name) {
    printInfo("Campaign not found.");
    return;
  }

  // Campaign summary
  printHeader(`Campaign: ${c.name}`);
  console.log(`  Status:      ${statusLabel(c.status)}`);
  console.log(`  People:      ${c.peopleCount || 0} total, ${c.peopleActive || 0} active, ${c.peopleFinished || 0} finished, ${c.peoplePaused || 0} paused`);
  console.log(`  Delivered:   ${bold(String(c.deliveriesCount || 0))}`);
  console.log(`  Opens:       ${c.opensCount || 0} ${dim("(" + pct(c.opensCount, c.deliveriesCount) + ")")}`);
  console.log(`  Replies:     ${green(String(c.repliesCount || 0))} ${dim("(" + pct(c.repliesCount, c.deliveriesCount) + ")")}`);
  console.log(`  Bounces:     ${c.bouncesCount || 0} ${dim("(" + pct(c.bouncesCount, c.deliveriesCount) + ")")}`);
  console.log(`  Opt-outs:    ${c.optOutsCount || 0}`);
  console.log(`  Out of office: ${c.outOfOfficeCount || 0}`);
  console.log();

  // Per-step stats
  const stepList = await api.get(`/v2/campaigns/${flags.id}/steps`);
  if (stepList?.length) {
    const stepRows: string[][] = [];
    for (const step of stepList) {
      try {
        const ss = await api.get(`/v1/Stats/CampaignStep?campaignId=${flags.id}&stepId=${step.id}`);
        stepRows.push([
          String(ss.stepNumber || step.number),
          String(ss.peopleSentTo || 0),
          String(ss.openedPeople || 0),
          pct(ss.openedPeople, ss.peopleSentTo),
          String(ss.repliedPeople || 0),
          pct(ss.repliedPeople, ss.peopleSentTo),
          String(ss.bouncedPeople || 0),
          String(ss.clickedPeople || 0),
        ]);
      } catch {
        stepRows.push([String(step.number), "—", "—", "—", "—", "—", "—", "—"]);
      }
    }
    printTable(
      ["Step", "Sent", "Opened", "Open%", "Replied", "Reply%", "Bounced", "Clicked"],
      stepRows
    );
  }

  // Click stats
  try {
    const clicks = await api.get(`/v1/Stats/CampaignClicks?campaignId=${flags.id}`);
    if (clicks?.stepClicks?.length) {
      console.log(bold("\nClick Details:"));
      for (const sc of clicks.stepClicks) {
        for (const link of sc.links || []) {
          console.log(`  ${cyan(link.url || link.textToDisplay || "Link")} — ${link.clicks} clicks`);
        }
      }
    }
  } catch {
    // Click tracking may not be enabled
  }
}

async function top() {
  printHeader("Top Performing Campaigns");
  const campaigns = await api.get("/v1/campaigns");
  if (!campaigns || campaigns.length === 0) {
    printInfo("No campaigns found.");
    return;
  }

  const withDeliveries = campaigns
    .filter((c: any) => (c.deliveriesCount || 0) > 0)
    .map((c: any) => ({
      ...c,
      replyRate: (c.repliesCount || 0) / c.deliveriesCount,
      openRate: (c.opensCount || 0) / c.deliveriesCount,
    }))
    .sort((a: any, b: any) => b.replyRate - a.replyRate)
    .slice(0, 3);

  if (withDeliveries.length === 0) {
    printInfo("No campaigns with deliveries yet.");
    return;
  }

  printTable(
    ["Rank", "Name", "Status", "Delivered", "Opens", "Replies", "Reply Rate"],
    withDeliveries.map((c: any, i: number) => [
      String(i + 1),
      truncate(c.name || "—", 30),
      statusLabel(c.status),
      String(c.deliveriesCount),
      `${c.opensCount} (${pct(c.opensCount, c.deliveriesCount)})`,
      `${c.repliesCount} (${pct(c.repliesCount, c.deliveriesCount)})`,
      green(pct(c.repliesCount, c.deliveriesCount)),
    ])
  );
}

async function summary() {
  printHeader("Account Performance Summary");
  const campaigns = await api.get("/v1/campaigns");
  if (!campaigns || campaigns.length === 0) {
    printInfo("No campaigns found.");
    return;
  }

  const active = campaigns.filter((c: any) => c.status === 2).length;
  const paused = campaigns.filter((c: any) => c.status === 4).length;
  const newC = campaigns.filter((c: any) => c.status === 0).length;

  let totalPeople = 0, totalDelivered = 0, totalOpens = 0, totalReplies = 0, totalBounces = 0, totalOptOuts = 0;
  let bestCampaign = { name: "—", replyRate: 0 };

  for (const c of campaigns) {
    totalPeople += c.peopleCount || 0;
    totalDelivered += c.deliveriesCount || 0;
    totalOpens += c.opensCount || 0;
    totalReplies += c.repliesCount || 0;
    totalBounces += c.bouncesCount || 0;
    totalOptOuts += c.optOutsCount || 0;
    const rr = (c.deliveriesCount || 0) > 0 ? (c.repliesCount || 0) / c.deliveriesCount : 0;
    if (rr > bestCampaign.replyRate) {
      bestCampaign = { name: c.name, replyRate: rr };
    }
  }

  console.log(bold("  Campaigns"));
  console.log(`    Total: ${campaigns.length}  |  ${green(active + " active")}  |  ${yellow(paused + " paused")}  |  ${newC} new`);
  console.log();
  console.log(bold("  Aggregate Performance"));
  console.log(`    Total contacts:  ${totalPeople}`);
  console.log(`    Delivered:       ${totalDelivered}`);
  console.log(`    Opens:           ${totalOpens} (${pct(totalOpens, totalDelivered)})`);
  console.log(`    Replies:         ${green(String(totalReplies))} (${pct(totalReplies, totalDelivered)})`);
  console.log(`    Bounces:         ${totalBounces} (${pct(totalBounces, totalDelivered)})`);
  console.log(`    Opt-outs:        ${totalOptOuts}`);
  console.log();
  if (bestCampaign.replyRate > 0) {
    console.log(bold("  Best Campaign"));
    console.log(`    ${cyan(bestCampaign.name)} — ${green((bestCampaign.replyRate * 100).toFixed(1) + "% reply rate")}`);
  }
}

// Main
(async () => {
  const { action, flags } = parseArgs(process.argv);
  try {
    switch (action) {
      case "list": await list(); break;
      case "get": await get(flags); break;
      case "steps": await steps(flags); break;
      case "create": await create(); break;
      case "duplicate": await duplicate(flags); break;
      case "start": await start(flags); break;
      case "pause": await pause(flags); break;
      case "archive": await archive(flags); break;
      case "update": await update(flags); break;
      case "stats": await stats(flags); break;
      case "top": await top(); break;
      case "summary": await summary(); break;
      default:
        console.log("Usage: campaigns.ts <list|get|steps|create|duplicate|start|pause|archive|update|stats|top|summary> [flags]");
        process.exit(1);
    }
  } catch (e: any) {
    printError(e.message);
    process.exit(1);
  }
})();
