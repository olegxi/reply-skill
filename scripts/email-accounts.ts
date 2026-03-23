// email-accounts.ts — List/check email accounts

import { api } from "./api-client.js";
import { printHeader, printTable, printError, printInfo, parseArgs } from "./utils.js";

async function list() {
  printHeader("Email Accounts");
  const accounts = await api.get("/v1/emailAccounts");
  if (!accounts || accounts.length === 0) {
    printInfo("No email accounts connected.");
    console.log("\nConnect an email account at:");
    console.log("  https://run.reply.io/Dashboard/Material#/settings/email-accounts");
    return [];
  }
  printTable(
    ["ID", "Sender Name", "Email Address"],
    accounts.map((a: any) => [String(a.id), a.senderName || "—", a.emailAddress])
  );
  return accounts;
}

async function check() {
  const accounts = await api.get("/v1/emailAccounts");
  if (!accounts || accounts.length === 0) {
    console.log("NO_ACCOUNTS");
    process.exit(1);
  }
  console.log(`ACCOUNTS_FOUND:${accounts.length}`);
  // Print as JSON for Claude to parse
  console.log(JSON.stringify(accounts.map((a: any) => ({
    id: a.id,
    senderName: a.senderName,
    emailAddress: a.emailAddress,
  }))));
}

async function sharedPage() {
  try {
    const result = await api.get("/v1/SharedPageUrl");
    if (result?.url) {
      console.log(result.url);
    } else {
      console.log("https://run.reply.io/Dashboard/Material#/settings/email-accounts");
    }
  } catch {
    console.log("https://run.reply.io/Dashboard/Material#/settings/email-accounts");
  }
}

// Main
(async () => {
  const { action } = parseArgs(process.argv);
  try {
    switch (action) {
      case "list": await list(); break;
      case "check": await check(); break;
      case "shared-page": await sharedPage(); break;
      default:
        console.log("Usage: email-accounts.ts <list|check|shared-page>");
        process.exit(1);
    }
  } catch (e: any) {
    printError(e.message);
    process.exit(1);
  }
})();
