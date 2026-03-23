// csv-upload.ts — CSV preview and upload with Claude-driven column mapping

import { readFileSync, existsSync, createReadStream } from "fs";
import { api } from "./api-client.js";
import { printHeader, printTable, printSuccess, printError, printInfo, printWarning, parseArgs } from "./utils.js";

// Reply.io standard contact fields
const REPLY_FIELDS = [
  "email", "firstName", "lastName", "company", "title", "phone",
  "city", "state", "country", "linkedInProfile", "companySize", "industry",
  "timeZoneId",
];

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

async function preview(flags: Record<string, string>) {
  const filePath = flags.file;
  if (!filePath || !existsSync(filePath)) {
    printError(`CSV file not found: ${filePath}`);
    process.exit(1);
  }

  printHeader("CSV Preview");

  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n").filter((l) => l.trim());
  if (lines.length === 0) {
    printError("CSV file is empty.");
    process.exit(1);
  }

  const headers = parseCSVLine(lines[0]);
  const previewRows = lines.slice(1, 4).map(parseCSVLine);

  console.log("CSV Columns and Sample Data:");
  printTable(headers, previewRows);
  console.log(`\nTotal rows: ${lines.length - 1}`);

  // Fetch custom fields to show available Reply fields
  console.log("\n--- Available Reply.io Fields ---");
  console.log("Standard: " + REPLY_FIELDS.join(", "));

  try {
    const customFields = await api.get("/v1/custom-fields/all");
    if (customFields?.length) {
      console.log("Custom fields: " + customFields.map((f: any) => `${f.title} (${f.fieldType === 0 ? "text" : "number"})`).join(", "));
    }
  } catch {
    // Custom fields fetch failed, not critical
  }

  // Output structured data for Claude to map
  console.log("\n--- CSV_HEADERS_JSON ---");
  console.log(JSON.stringify(headers));
  console.log("--- END ---");
}

async function upload(flags: Record<string, string>) {
  const filePath = flags.file;
  if (!filePath || !existsSync(filePath)) {
    printError(`CSV file not found: ${filePath}`);
    process.exit(1);
  }

  if (!flags.mapping) {
    printError("Required: --mapping (JSON object mapping Reply fields to CSV column names)");
    console.log('Example: --mapping \'{"email":"Email Address","firstName":"First Name"}\'');
    process.exit(1);
  }

  const mapping = JSON.parse(flags.mapping);

  const options: any = {
    overwriteExisting: flags.overwrite === "true",
    mapping: { prospect: mapping },
  };
  if (flags["list-id"]) {
    options.listId = parseInt(flags["list-id"]);
  }

  printInfo(`Uploading ${filePath}...`);

  // Use FormData for multipart upload
  const fileBlob = new Blob([readFileSync(filePath)], { type: "text/csv" });
  const formData = new FormData();
  formData.append("file", fileBlob, filePath.split("/").pop() || "contacts.csv");
  formData.append("options", JSON.stringify(options));

  const result = await api.postFormData("/v1/people/import/schedules-embedded", formData);

  if (result?.importSessionId) {
    printSuccess(`CSV upload started. Import session ID: ${result.importSessionId}`);
  } else {
    printSuccess("CSV upload completed.");
    console.log(JSON.stringify(result, null, 2));
  }
}

// Main
(async () => {
  const { action, flags } = parseArgs(process.argv);
  try {
    switch (action) {
      case "preview": await preview(flags); break;
      case "upload": await upload(flags); break;
      default:
        console.log("Usage: csv-upload.ts <preview|upload> --file /path/to/file.csv [--mapping '{...}'] [--list-id 123] [--overwrite true]");
        process.exit(1);
    }
  } catch (e: any) {
    printError(e.message);
    process.exit(1);
  }
})();
