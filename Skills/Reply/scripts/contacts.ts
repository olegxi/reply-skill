// contacts.ts — Add/list/search/delete contacts

import { api } from "./api-client.js";
import { printHeader, printTable, printSuccess, printError, printInfo, parseArgs, truncate, formatDate, bold, green, red, dim, cyan, statusLabel } from "./utils.js";

async function add(flags: Record<string, string>) {
  if (!flags.email || !flags["first-name"]) {
    printError("Required: --email and --first-name");
    console.log("\nUsage: contacts.ts add --email john@co.com --first-name John [--last-name Smith] [--company Acme] [--title CEO] [--phone +1234] [--linkedin https://...] [--city NY] [--state NY] [--country US]");
    process.exit(1);
  }

  const body: any = {
    email: flags.email,
    firstName: flags["first-name"],
  };
  if (flags["last-name"]) body.lastName = flags["last-name"];
  if (flags.company) body.company = flags.company;
  if (flags.title) body.title = flags.title;
  if (flags.phone) body.phone = flags.phone;
  if (flags.linkedin) body.linkedInProfile = flags.linkedin;
  if (flags.city) body.city = flags.city;
  if (flags.state) body.state = flags.state;
  if (flags.country) body.country = flags.country;

  // Parse custom fields: --custom 'Key1=Val1,Key2=Val2'
  if (flags.custom) {
    body.customFields = flags.custom.split(",").map((pair) => {
      const [key, ...valParts] = pair.split("=");
      return { key: key.trim(), value: valParts.join("=").trim() };
    });
  }

  const result = await api.post("/v1/people", body);
  printSuccess(`Contact created/updated: ${result.firstName} ${result.lastName || ""} <${result.email}> (ID: ${result.id})`);
}

async function list(flags: Record<string, string>) {
  printHeader("Contacts");
  const page = flags.page || "1";
  const limit = flags.limit || "25";
  const people = await api.get(`/v1/people?page=${page}&limit=${limit}`);

  if (!people || people.length === 0) {
    printInfo("No contacts found.");
    return;
  }

  printTable(
    ["ID", "Email", "Name", "Company", "Title", "Added"],
    people.map((p: any) => [
      String(p.id),
      p.email,
      truncate(`${p.firstName || ""} ${p.lastName || ""}`.trim(), 25),
      truncate(p.company || "—", 20),
      truncate(p.title || "—", 20),
      formatDate(p.addingDate),
    ])
  );
  console.log(`\nShowing page ${page} (${people.length} contacts). Use --page N to paginate.`);
}

async function search(flags: Record<string, string>) {
  if (flags.email) {
    const result = await api.get(`/v1/people?email=${encodeURIComponent(flags.email)}`);
    if (result) {
      printSuccess(`Found: ${result.firstName} ${result.lastName || ""} <${result.email}> (ID: ${result.id})`);
      console.log(JSON.stringify(result, null, 2));
    } else {
      printInfo("Contact not found.");
    }
  } else if (flags.linkedin) {
    const result = await api.post("/v1/people/lookup", { linkedin: flags.linkedin });
    if (result?.ids?.length) {
      printSuccess(`Found contact IDs: ${result.ids.join(", ")}`);
    } else {
      printInfo("No contacts found for that LinkedIn URL.");
    }
  } else {
    printError("Provide --email or --linkedin to search.");
    process.exit(1);
  }
}

async function del(flags: Record<string, string>) {
  if (flags.email) {
    await api.del(`/v1/people/?email=${encodeURIComponent(flags.email)}`);
    printSuccess(`Deleted contact: ${flags.email}`);
  } else if (flags.id) {
    await api.del(`/v1/people/?id=${flags.id}`);
    printSuccess(`Deleted contact ID: ${flags.id}`);
  } else {
    printError("Provide --email or --id to delete.");
    process.exit(1);
  }
}

async function statusInCampaign(flags: Record<string, string>) {
  if (!flags.email) {
    printError("Required: --email");
    process.exit(1);
  }
  const result = await api.get(`/v1/stats/status_in_campaign?email=${encodeURIComponent(flags.email)}`);
  console.log(JSON.stringify(result, null, 2));
}

async function campaigns(flags: Record<string, string>) {
  if (!flags.id) {
    printError("Required: --id (contact ID)");
    process.exit(1);
  }
  const result = await api.get(`/v1/people/${flags.id}/sequences`);
  console.log(JSON.stringify(result, null, 2));
}

async function finish(flags: Record<string, string>) {
  if (!flags.email) {
    printError("Required: --email");
    process.exit(1);
  }
  await api.post("/v1/actions/markasfinished", { email: flags.email });
  printSuccess(`Contact ${flags.email} marked as finished in all campaigns.`);
}

async function optOut(flags: Record<string, string>) {
  if (!flags.email) {
    printError("Required: --email");
    process.exit(1);
  }
  await api.post("/v1/actions/removepersonfromallcampaigns", { email: flags.email });
  printSuccess(`Contact ${flags.email} removed from all campaigns (opted out).`);
}

async function replied(flags: Record<string, string>) {
  if (!flags.email) {
    printError("Required: --email");
    process.exit(1);
  }
  await api.post("/v1/actions/markasreplied", { email: flags.email });
  printSuccess(`Contact ${flags.email} marked as replied in all campaigns.`);
}

async function contactStats(flags: Record<string, string>) {
  if (!flags.email) {
    printError("Required: --email");
    process.exit(1);
  }
  const email = flags.email.replace("@", "%40");
  const result = await api.get(`/v1/stats/person?email=${email}`);
  if (!result) {
    printInfo("Contact not found.");
    return;
  }

  printHeader(`Contact: ${result.fullName || result.email}`);
  console.log(`  Email:      ${result.email}`);
  console.log(`  Blocked:    ${result.isBlocked ? red("Yes") : green("No")}`);
  console.log(`  Opted out:  ${result.isOptedOut ? red("Yes") : green("No")}`);
  console.log();

  if (result.campaigns?.length) {
    printTable(
      ["Campaign", "Status", "Person Status", "Reply Date", "Inbox"],
      result.campaigns.map((c: any) => [
        truncate(c.name || "—", 30),
        typeof c.status === "number" ? statusLabel(c.status) : (c.status || "—"),
        c.personStatus || "—",
        c.replyDate ? formatDate(c.replyDate) : "—",
        c.inboxState || "—",
      ])
    );

    // Show email activity per campaign
    for (const c of result.campaigns) {
      if (c.emails?.length) {
        console.log(bold(`\n  ${c.name} — Emails:`));
        for (const e of c.emails) {
          const status = e.isOpened ? green("opened") : dim("not opened");
          const reply = e.isReplied ? ` | ${green("replied")}` : "";
          console.log(`    ${dim(formatDate(e.sentDate))} ${cyan(truncate(e.subject || "(no subject)", 50))} [${status}${reply}]`);
        }
      }
    }
  } else {
    printInfo("No campaign activity for this contact.");
  }
}

// Main
(async () => {
  const { action, flags } = parseArgs(process.argv);
  try {
    switch (action) {
      case "add": await add(flags); break;
      case "list": await list(flags); break;
      case "search": await search(flags); break;
      case "delete": await del(flags); break;
      case "status": await statusInCampaign(flags); break;
      case "campaigns": await campaigns(flags); break;
      case "finish": await finish(flags); break;
      case "opt-out": await optOut(flags); break;
      case "replied": await replied(flags); break;
      case "contact-stats": await contactStats(flags); break;
      default:
        console.log("Usage: contacts.ts <add|list|search|delete|status|campaigns|finish|opt-out|replied|contact-stats> [flags]");
        process.exit(1);
    }
  } catch (e: any) {
    printError(e.message);
    process.exit(1);
  }
})();
