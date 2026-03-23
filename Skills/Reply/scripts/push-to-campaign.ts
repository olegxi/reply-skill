// push-to-campaign.ts — Push contacts to campaigns (single/bulk/add-and-push)

import { api } from "./api-client.js";
import { printSuccess, printError, printInfo, parseArgs } from "./utils.js";

async function single(flags: Record<string, string>) {
  if (!flags.email || !flags["campaign-id"]) {
    printError("Required: --email and --campaign-id");
    process.exit(1);
  }
  const body: any = {
    campaignId: parseInt(flags["campaign-id"]),
    email: flags.email,
  };
  if (flags.force === "true") body.forcePush = true;

  await api.post("/v1/actions/pushtocampaign", body);
  printSuccess(`Pushed ${flags.email} to campaign ${flags["campaign-id"]}${flags.force === "true" ? " (force)" : ""}`);
}

async function addAndPush(flags: Record<string, string>) {
  if (!flags.email || !flags["campaign-id"] || !flags["first-name"]) {
    printError("Required: --email, --first-name, and --campaign-id");
    process.exit(1);
  }

  const body: any = {
    campaignId: parseInt(flags["campaign-id"]),
    email: flags.email,
    firstName: flags["first-name"],
  };
  if (flags["last-name"]) body.lastName = flags["last-name"];
  if (flags.company) body.company = flags.company;
  if (flags.title) body.title = flags.title;

  // Parse custom fields: --custom 'Key1=Val1,Key2=Val2'
  if (flags.custom) {
    body.customFields = flags.custom.split(",").map((pair) => {
      const [key, ...valParts] = pair.split("=");
      return { key: key.trim(), value: valParts.join("=").trim() };
    });
  }

  await api.post("/v1/actions/addandpushtocampaign", body);
  printSuccess(`Created and pushed ${flags.email} to campaign ${flags["campaign-id"]}`);
}

async function bulk(flags: Record<string, string>) {
  if (!flags.ids || !flags["campaign-id"]) {
    printError("Required: --ids (comma-separated contact IDs) and --campaign-id");
    process.exit(1);
  }

  const contactIds = flags.ids.split(",").map((id) => parseInt(id.trim()));
  const body: any = {
    ContactIds: contactIds,
    SequenceId: parseInt(flags["campaign-id"]),
    OverwriteExisting: flags.overwrite === "true",
  };

  const result = await api.post("/v1/Actions/pushContactsToSequence", body);
  printSuccess(`Bulk push complete.`);
  if (result?.affectedIdList) {
    printInfo(`Pushed: ${result.affectedIdList.length} contacts`);
  }
  if (result?.skippedByOwner) printInfo(`Skipped (owner): ${result.skippedByOwner}`);
  if (result?.skippedByInvalidEmail) printInfo(`Skipped (invalid email): ${result.skippedByInvalidEmail}`);
  if (result?.skippedByOptedOutStatus) printInfo(`Skipped (opted out): ${result.skippedByOptedOutStatus}`);
  if (result?.skipped) printInfo(`Skipped (other): ${result.skipped}`);
}

async function remove(flags: Record<string, string>) {
  if (!flags.email) {
    printError("Required: --email");
    process.exit(1);
  }
  if (flags["campaign-id"]) {
    await api.post("/v1/actions/removepersonfromcampaignbyid", {
      campaignId: parseInt(flags["campaign-id"]),
      email: flags.email,
    });
    printSuccess(`Removed ${flags.email} from campaign ${flags["campaign-id"]}`);
  } else {
    await api.post("/v1/actions/removepersonfromallcampaigns", { email: flags.email });
    printSuccess(`Removed ${flags.email} from all campaigns`);
  }
}

// Main
(async () => {
  const { action, flags } = parseArgs(process.argv);
  try {
    switch (action) {
      case "single": await single(flags); break;
      case "add-and-push": await addAndPush(flags); break;
      case "bulk": await bulk(flags); break;
      case "remove": await remove(flags); break;
      default:
        console.log("Usage: push-to-campaign.ts <single|add-and-push|bulk|remove> [flags]");
        console.log("\n  single       --email X --campaign-id Y [--force true]");
        console.log("  add-and-push --email X --first-name Y --campaign-id Z");
        console.log("  bulk         --ids 1,2,3 --campaign-id Y [--overwrite true]");
        console.log("  remove       --email X [--campaign-id Y]");
        process.exit(1);
    }
  } catch (e: any) {
    printError(e.message);
    process.exit(1);
  }
})();
