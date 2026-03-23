# Reply.io Skill

Manage your entire Reply.io outreach — contacts, campaigns, analytics, and more — directly from your AI assistant. Works with Claude, Perplexity, Codex, and any platform that supports skills.

![Reply.io](https://img.shields.io/badge/Reply.io-API%20v1%20%2B%20v2-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-tsx-3178C6)
![License](https://img.shields.io/badge/license-MIT-green)

## What It Does

Run your Reply.io sales engagement from conversational AI. No switching tabs, no clicking through dashboards — just tell your AI what you need.

**Example prompts:**
- *"Show me my top performing campaigns"*
- *"Upload contacts.csv and push them to my Q1 Outreach sequence"*
- *"Create a 3-step follow-up sequence for enterprise leads"*
- *"Mark john@acme.com as finished"*
- *"What's the reply rate on my Podcast Sequence?"*

## Features

### Contacts
- Add, search, list, and delete contacts
- Upload contacts from CSV with intelligent column mapping
- Push contacts to campaigns (single, bulk, or add-and-push)

### Campaigns (Sequences)
- Create multi-step email sequences with personalization variables
- Duplicate, start, pause, and archive campaigns
- View campaign steps and email content

### Analytics
- **Campaign stats** — deliveries, opens, replies, bounces, per-step breakdown, click tracking
- **Top campaigns** — ranked by reply rate
- **Account summary** — aggregate performance across all campaigns
- **Contact stats** — per-contact performance across all campaigns with email activity

### Contact Lifecycle
- Mark contacts as finished, replied, or opt them out of all campaigns
- View a contact's full history: which campaigns, what emails, open/reply status

### Email Accounts & Schedules
- List connected email accounts
- View, create, and manage sending schedules

### Guided Setup
- Full onboarding walkthrough: connect email, add contacts, create sequence, launch

## Quick Start

### 1. Get Your Reply.io API Key

Go to [Reply.io Settings > API Key](https://run.reply.io/Dashboard/Material#/settings/api) and copy your key.

### 2. Install

```bash
# Clone the repo
git clone https://github.com/olegxi/reply-skill.git

# Create .env with your API key
echo "REPLY_API_KEY=your_key_here" > reply-skill/.env
```

### 3. Use

Add this skill to your AI assistant's skills directory, or symlink it. Then invoke:
```
/reply
```

You'll see a dashboard with your account status, performance snapshot, and a menu of actions.

## Project Structure

```
SKILL.md              # Skill definition — routes, flows, instructions
scripts/
  api-client.ts       # HTTP client for Reply.io API (v1 + v2)
  campaigns.ts        # List, create, duplicate, start, pause, stats, top, summary
  contacts.ts         # Add, list, search, delete, finish, opt-out, replied, contact-stats
  csv-upload.ts       # Preview and upload CSV contacts with column mapping
  email-accounts.ts   # List and check connected email accounts
  onboarding.ts       # Dashboard, performance snapshot, and menu
  push-to-campaign.ts # Push contacts to campaigns (single, bulk, add-and-push)
  schedules.ts        # List, view, and create sending schedules
  utils.ts            # Terminal colors, table formatting, helpers
```

## Requirements

- **Node.js** 18+ (uses native `fetch`)
- **npx tsx** — TypeScript execution (installed automatically via npx)
- **Reply.io API key** — set in `.env` file

## API Coverage

The skill uses Reply.io API v1 and v2:

| Area | Endpoints |
|------|-----------|
| Campaigns | List, get, create, duplicate, start, pause, archive, update, steps |
| Contacts | CRUD, lookup, import from CSV, status in campaign |
| Actions | Push to campaign, remove from campaign, mark as finished/replied |
| Statistics | Campaign stats, step stats, click stats, contact stats |
| Email Accounts | List, check, shared page URL |
| Schedules | List, get, create |

Rate limits: 15,000 API calls/month. Some endpoints (campaign list, stats) have a 10-second throttle.

## License

MIT
