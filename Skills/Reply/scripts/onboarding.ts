// onboarding.ts — Welcome menu + status dashboard + performance snapshot

import { api } from "./api-client.js";
import { printHeader, bold, cyan, green, yellow, red, dim, printInfo, printWarning } from "./utils.js";

function pct(num: number, den: number): string {
  if (!den) return "—";
  return (num / den * 100).toFixed(1) + "%";
}

async function main() {
  printHeader("Reply.io Skill");
  console.log(dim("Manage contacts, campaigns, and outreach sequences\n"));

  // Quick status check
  let accountCount = 0;
  let campaignCount = 0;
  let activeCampaigns = 0;
  let campaignsData: any[] = [];

  try {
    const accounts = await api.get("/v1/emailAccounts");
    accountCount = accounts?.length || 0;
  } catch { /* ignore */ }

  try {
    campaignsData = await api.get("/v1/campaigns") || [];
    campaignCount = campaignsData.length;
    activeCampaigns = campaignsData.filter((c: any) => c.status === 2).length;
  } catch { /* ignore */ }

  // Status dashboard
  console.log(bold("Account Status:"));
  console.log(`  Email accounts: ${accountCount > 0 ? green(String(accountCount)) : red("0 (none connected)")}`);
  console.log(`  Campaigns:      ${campaignCount > 0 ? `${campaignCount} total, ${green(String(activeCampaigns) + " active")}` : yellow("0")}`);
  console.log();

  // Performance snapshot
  let totalDelivered = 0, totalOpens = 0, totalReplies = 0;
  let topCampaignName = "—", topCampaignReplyRate = 0;

  for (const c of campaignsData) {
    totalDelivered += c.deliveriesCount || 0;
    totalOpens += c.opensCount || 0;
    totalReplies += c.repliesCount || 0;
    const rr = (c.deliveriesCount || 0) > 0 ? (c.repliesCount || 0) / c.deliveriesCount : 0;
    if (rr > topCampaignReplyRate) {
      topCampaignReplyRate = rr;
      topCampaignName = c.name;
    }
  }

  if (totalDelivered > 0) {
    console.log(bold("Performance Snapshot:"));
    console.log(`  Delivered: ${bold(String(totalDelivered))}  |  Opens: ${totalOpens} (${pct(totalOpens, totalDelivered)})  |  Replies: ${green(String(totalReplies))} (${pct(totalReplies, totalDelivered)})`);
    if (topCampaignReplyRate > 0) {
      console.log(`  Top campaign: ${cyan(topCampaignName)} — ${green((topCampaignReplyRate * 100).toFixed(1) + "% reply rate")}`);
    }
    console.log();
  }

  // Smart recommendation
  if (accountCount === 0) {
    printWarning("No email accounts connected. Start by connecting one (option 7 or setup walkthrough).");
  } else if (campaignCount === 0) {
    printInfo("Email accounts ready. Create your first sequence (option 3).");
  }

  // Menu
  console.log(bold("What would you like to do?\n"));
  console.log(`  ${cyan("1.")}  Add a contact`);
  console.log(`  ${cyan("2.")}  Upload contacts from CSV`);
  console.log(`  ${cyan("3.")}  Create a new sequence (campaign)`);
  console.log(`  ${cyan("4.")}  Duplicate an existing sequence`);
  console.log(`  ${cyan("5.")}  Push contacts to a campaign`);
  console.log(`  ${cyan("6.")}  View campaigns & statistics`);
  console.log(`  ${cyan("7.")}  Manage email accounts`);
  console.log(`  ${cyan("8.")}  View contacts`);
  console.log(`  ${cyan("9.")}  View sending schedules`);
  console.log(`  ${cyan("10.")} Campaign performance & analytics`);
  console.log(`  ${cyan("11.")} Contact lifecycle (finish/opt-out/stats)`);
  console.log();
  console.log(`  ${green("12.")} ${green(bold("Full setup walkthrough"))} ${dim("(recommended for first-time users)")}`);
  console.log();

  // Output structured data for SKILL.md
  console.log("--- STATUS_JSON ---");
  console.log(JSON.stringify({
    accountCount, campaignCount, activeCampaigns,
    totalDelivered, totalOpens, totalReplies,
    topCampaignName, topCampaignReplyRate: topCampaignReplyRate > 0 ? (topCampaignReplyRate * 100).toFixed(1) : null,
  }));
  console.log("--- END ---");
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
