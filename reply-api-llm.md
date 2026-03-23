# Reply.io API Reference (LLM-Optimized)

## Base Info

- **Base URL**: `https://api.reply.io`
- **Versions**: V1 (`/v1/...`) and V2 (`/v2/...` or `/api/v2/...`) — can be used together
- **Auth**: Header `x-api-key: YOUR_API_KEY` (get from Settings > API Key)
- **Content-Type**: `application/json` for all POST/PUT/PATCH requests
- **Rate limit**: 15,000 API calls/month per user
- **Response codes**: 200 OK, 201 Created, 400 Bad input, 401 No user found, 403 Access denied, 404 Not found, 500 Server error

### Master API Key (Team Edition only)

For team-level auth, use the Master API Key with impersonation headers:
- `X-User-Id` or `X-User-Email` — acts as that user (only one needed)
- Without headers — acts as Team/Organization Owner
- Available only when Team Edition = ON or in Organizations

---

## 1. CAMPAIGNS (v1)

### Get Campaign Details (by Name)
`GET /v1/campaigns?name={campaignName}`
- URL-encode name (`Campaign One` → `Campaign+One`)
- **Throttle**: 10s between requests

### Get Campaign Details (by ID)
`GET /v1/campaigns?id={campaignId}`
- **Throttle**: 10s between requests

### Get List of Campaigns
`GET /v1/campaigns`
- Returns array of all campaigns
- **Throttle**: 10s between requests

**Campaign response fields** (shared across all campaign GETs):
```json
{
  "id": 51755,
  "name": "Campaign1",
  "created": "2018-03-02T13:54:18+00:00",
  "status": 2,          // 0=New, 2=Active, 4=Paused
  "emailAccounts": ["email@example.com"],
  "ownerEmail": "owner@example.com",
  "deliveriesCount": 5,
  "opensCount": 1,
  "repliesCount": 1,
  "bouncesCount": 0,
  "optOutsCount": 0,
  "outOfOfficeCount": 0,
  "peopleCount": 2,
  "peopleFinished": 0,
  "peopleActive": 2,
  "peoplePaused": 0
}
```

### Get Schedules (All)
`GET /v2/schedules`
- In Team Edition, returns schedules from all team accounts

### Get Default Schedule
`GET /v2/schedules/default`
- Returns only the user's default schedule

**Schedule response**: `{ id, name, timezoneId, mainTimings: [{ weekDay, isActive, timeRanges: [{ fromTime: {hour, minute}, toTime: {hour, minute} }] }], followUpTimings: [...], isDefault }`

---

## 2. PEOPLE / CONTACTS (v1)

### Get All Contacts
`GET /v1/people`
- Paginated: `{ people: [...], total, page, limit (default 100), pagesCount, next, previous }`

### Get Contact (by ID)
`GET /v1/people?id={contactId}`

### Get Contact (by Email)
`GET /v1/people?email={contactEmail}`

**Contact response fields**:
```json
{
  "id": 699466383,
  "email": "contact@example.com",
  "firstName": "Sam",
  "lastName": "Smith",
  "company": "Demo Inc",
  "city": "New York",
  "state": "",
  "country": "USA",
  "timeZoneId": "Eastern Standard Time",
  "title": "VP Sales",
  "phone": "+1234567890",
  "phoneStatus": "Valid",       // Valid, Invalid, Pending
  "linkedInProfile": "https://linkedin.com/in/...",
  "addingDate": "2025-07-10T11:19:18.32",
  "customFields": [{ "key": "FieldName", "value": "FieldValue" }],
  "companySize": "11-50",       // or "Empty"
  "industry": "Retail",
  "salesNavigatorUrl": "",
  "linkedInRecruiterUrl": "",
  "accountId": null,
  "creationSource": "API"       // API, Manually, CSV, etc.
}
```

### Get Contact Status in Campaign
`GET /v1/stats/status_in_campaign?email={email}`
- **Throttle**: 10s between requests
- Response: `{ "status": "Active" }`

### Get List of Campaigns for Contact
`GET /v1/people/{contactId}/sequences`
- Response: `[{ sequenceId, sequenceName, status, isSequenceOwner }]`
- `isSequenceOwner` is based on the API key used

### Get Contacts with Stage Changes
`GET /api/v2/Contacts/prospects-by-status-changes?teamId={teamId}&fromDate={fromDate}&toDate={toDate}`
- Date range must not exceed 3 days
- Only contacts in a sequence are returned
- **Stage IDs**: 1=New, 2=Engaging, 3=Replied, 4=Interested, 5=Not interested, 6=Unresponsive, 7=Do not contact, 8=Bad contact info
- Response includes `stageId`, `stageName`, `stageChangedAtUTC`, `ownerId`, `ownerName`, `teamId`, `teamName` plus full contact fields

### Create a New Contact
`POST /v1/people`
```json
{
  "email": "contact@example.com",       // REQUIRED
  "firstName": "John",                  // REQUIRED
  "lastName": "Smith",
  "company": "Acme",
  "city": "", "state": "", "country": "USA",
  "timeZoneId": "US Eastern Standard Time",
  "title": "Manager",
  "phone": "+1234567890",
  "linkedInProfile": "https://linkedin.com/in/...",
  "customFields": [{ "key": "FieldName", "value": "Value" }]
}
```
- Also updates existing contact if email matches
- Returns 201 with full contact object

### Update Contact (by Email)
`POST /v1/people` — same body as Create, email used as key for matching

### Import Contacts from CSV
`POST /v1/people/import/schedules-embedded`
- Content-Type: `multipart/form-data`
- Form fields: `file` (CSV file), `options` (JSON string)
- Options: `{ csvUrl, overwriteExisting, mapping: { prospect: { email: "Email", firstName: "First Name", ... } }, listId, matchingFields }`
- `matchingFields`: empty/omit = match by email, `["id"]` = by Reply ID, `["linkedInprofileurl"]` = by LinkedIn
- Response: `{ importSessionId: "guid" }`

### Delete Contact (by ID)
`DELETE /v1/people/?id={contactId}`

### Delete Contact (by Email)
`DELETE /v1/people/?email={contactEmail}`

### Lookup Prospect ID by Email/LinkedIn
`POST /v1/people/lookup`
```json
{ "email": "contact@example.com" }
// OR
{ "linkedin": "https://www.linkedin.com/in/username" }
```
- Only one field per request
- Response: `{ "ids": [12345678] }`

---

## 2b. LISTS (v1)

### Create List
`POST /v1/people/lists`
- Body: `{ "name": "My List" }` (must be unique)
- Response: `{ id, name }`

### Get All Lists
`GET /v1/people/lists`
- Returns personal lists + shared lists in Team Edition Public Mode

### Get List (by ID)
`GET /v1/people/lists/{listID}`

### Get Contacts in List (by ID)
`GET /v1/people/list/{listId}`
- Paginated response with `people`, `total`, `page`, `limit`, `pagesCount`, `next`, `previous`

### Get Contacts in List (by Name)
`GET /v1/people/list?name={listName}`

### Delete List (by ID)
`DELETE /v1/people/lists/{listID}`
- Only lists owned by current user can be deleted

---

## 2c. ACCOUNTS IMPORT (v1)

### Import Accounts from CSV
`POST /v1/accounts/import`
- Content-Type: `multipart/form-data` with `file` and `options` fields
- Options object:
```json
{
  "ListId": 12345,                          // optional
  "MergeActionType": "OverwriteExisting",   // OverwriteExisting(0), UpdateMissing(1), Skip(2), Duplicate(3)
  "MergeMatchingCriteria": "Domain",        // AccountName(0), Domain(1), AccountId(2)
  "Mappings": [
    { "CsvFieldName": "Name", "ReplyFieldName": "Account name" }
  ]
}
```
- **Reply field names**: `Account name`, `Domain name`, `Domain secondary`, `Description`, `Phone number`, `Industry`, `Company size`, `LinkedIn profile`, `LinkedIn Recruiter`, `Twitter profile`, `Country`, `State`, `City`, `Email`, `First Name`, `Last Name`, `Full Name`, `Phone`, `Title`, `Company`, `TimeZoneId`, `Sales Navigator`
- Response: `{ errorsCount, importedCount, skippedCount, updatedCount }`
- Error codes: `MultiformPartMissed`, `MappingsNotPresent`, `HeaderMismatch`, `ReplyFieldNameMismatch`, `ImportFailed`, `FileIsCorrupted`, `AlreadyInProgress`, `MaxImportCountPerDayLimit`

---

## 3. ACTIONS (v1)

### Create and Push Contact to Sequence
`POST /v1/actions/addandpushtocampaign`
```json
{
  "campaignId": 51155,        // REQUIRED
  "email": "a@b.com",         // REQUIRED
  "firstName": "Sam", "lastName": "Smith",
  "company": "Acme", "city": "", "state": "", "country": "USA",
  "timeZoneId": "US Eastern Standard Time",
  "title": "Title", "notes": "Notes",
  "phone": "+1234567890",
  "linkedInProfile": "https://linkedin.com/in/...",
  "customFields": [{ "key": "Field", "value": "Val" }]
}
```

### Push Contact to Sequence
`POST /v1/actions/pushtocampaign`
- Body: `{ "campaignId": 51155, "email": "a@b.com" }`
- Contact must NOT be in any active campaign

### ForcePush Contact to Sequence
`POST /v1/actions/pushtocampaign`
- Body: `{ "campaignId": 51155, "email": "a@b.com", "forcePush": true }`
- Moves contact even if already in another campaign

### Bulk Push Contacts to Sequence
`POST /v1/Actions/pushContactsToSequence`
```json
{
  "ContactIds": [123, 456, 789],
  "SequenceId": 782,
  "OverwriteExisting": true     // force-push if true
}
```
- Response: `{ affectedIdList: [...], skippedByOwner, skippedByInvalidEmail, skippedByOptedOutStatus, skipped }`

### Remove Contact from One Sequence
`POST /v1/actions/removepersonfromcampaignbyid`
- Body: `{ "campaignId": 51155, "email": "a@b.com" }`

### Remove Contact from All Sequences
`POST /v1/actions/removepersonfromallcampaigns`
- Body: `{ "email": "a@b.com" }`

### Mark Contact as Replied (by Email)
`POST /v1/actions/markasreplied`
- Body: `{ "email": "a@b.com" }` — marks in ALL campaigns

### Mark Contact as Replied (by Domain)
`POST /v1/actions/markasreplied`
- Body: `{ "domain": "company.com" }` — marks ALL contacts with this domain

### Mark Contact as Finished (by Email)
`POST /v1/actions/markasfinished`
- Body: `{ "email": "a@b.com" }`

### Mark Contact as Finished (by Domain)
`POST /v1/actions/markasfinished`
- Body: `{ "domain": "company.com" }`

### Unmark Contact as Out of Office
`POST /v1/actions/unmark-as-out-of-office`
- Body: `{ "email": "a@b.com" }`
- Response: `{ "contactCount": 1 }`

### Move Contacts to Lists
`POST /v1/Actions/moveContactsToLists`
- Body: `{ "ContactIds": [123, 456], "ListIds": [42646] }`

---

## 4. TEMPLATES (v1)

### Get Template (by ID)
`GET /v1/templates?id={templateId}`
- Response: `{ id, name, subject, body, categoryId }`

### Get List of Templates
`GET /v1/templates`
- Response: `{ userTemplates: [...], teamTemplates: [...], communityTemplates: [...] }`

---

## 5. STATISTICS (v1)

### Get Contact Statistics
`GET /v1/stats/person?email={email}`
- Escape `@` as `%40` in the URL
- **Throttle**: 10s between requests
- Response includes `id`, `email`, `fullName`, `isBlocked`, `isOptedOut`, and `campaigns` array with per-campaign stats (`id`, `name`, `status`, `personStatus`, `replyDate`, `replyText`, `inboxState`, `emails[]`)

### Get Contact Statistics (Team Edition)
`GET /v1/stats/person?email={email}`
- Adds `isContactOwner` and `isSequenceOwner` fields
- 404 if no access to the contact

### Get Campaign Statistics
`GET /v1/stats/GetPeopleSentPerCampaign?campaignId={campaignId}`
- **Throttle**: 10s
- Response: `{ campaignId, campaignName, deliveredProspectsCount }`

### Get Campaign Step Statistics
`GET /v1/Stats/CampaignStep?campaignId={id}&stepId={stepId}&from={unixTimestamp}&to={unixTimestamp}`
- `from`/`to` use Unix timestamps
- Response: `{ campaignId, campaignName, stepId, stepNumber, contactedPeople, peopleSentTo, openedPeople, repliedPeople, bouncedPeople, clickedPeople, deliveryRate, openRate, replyRate, interestedRate, sentEmails, openedEmails, repliedEmails, bouncedEmails, clickedEmails }`
- Returns 400 if step/campaign deleted or archived

### Get Campaign Click Statistics
`GET /v1/Stats/CampaignClicks?campaignId={campaignId}`
- Response: `{ campaignId, stepClicks: [{ stepId, links: [{ textToDisplay, title, url, clicks, lastClickDate }] }] }`

---

## 6. DOMAIN BLACKLISTING (v1)

### Get Blacklisted (All/Domains/Emails)
`GET /v1/Blacklist?outputType=All|Domains|Emails`
- Response: `{ "domains": ["email@test.com", "yahoo.com"] }`

### Add to Blacklist
`POST /v1/Blacklist?domain={domain}` or `POST /v1/Blacklist?email={email}`

### Remove from Blacklist
`DELETE /v1/Blacklist?domain={domain}` or `DELETE /v1/Blacklist?email={email}`

---

## 7. EMAIL ACCOUNTS (v1)

### Get List of Email Accounts
`GET /v1/emailAccounts`
- Response: `[{ id, senderName, emailAddress, signature }]`

### Get Email Account Shared Page
`GET /v1/SharedPageUrl`
- Response: `{ "url": "https://run.reply.io/hosted/..." }`
- 403 if shared page not enabled

### Add New Email Account
`POST /v1/EmailAccounts`
```json
{
  "Email": "sender@example.com",
  "Daily Limit": "49",
  "SenderName": "John Smith",
  "SmtpHost": "smtp.gmail.com", "SmtpPort": "465", "SmtpPassword": "pass", "SmtpSsl": true,
  "ImapHost": "imap.gmail.com", "ImapPort": "993", "ImapPassword": "pass", "ImapSsl": true
}
```
- Only "other provider" setup supported via API
- Response: `{ "id": 12345 }`

### Update Email Account
`POST /v1/EmailAccounts` — same body as Add, email used as key

### Delete Email Account (by ID)
`DELETE /v1/EmailAccounts` — Body: `{ "id": 12345 }`

### Delete Email Account (by Email)
`DELETE /v1/EmailAccounts` — Body: `{ "Email": "sender@example.com" }`

---

## 8. CUSTOM FIELDS (v1)

### Get All Custom Fields
`GET /v1/custom-fields/all`
- Response: `[{ id, title, fieldType }]`
- **fieldType**: 0 = Text, 1 = Number

### Get Custom Field by ID
`GET /v1/custom-fields/{id}`

### Add Custom Field
`POST /v1/custom-fields`
- Body: `{ "title": "FieldName", "type": 0 }` (0=Text, 1=Number)

### Update Custom Field
`PUT /v1/custom-fields/{id}`
- Body: `{ "title": "NewName", "type": 1 }`

### Delete Custom Field
`DELETE /v1/custom-fields/{id}`
- Response: `true`

---

## 9. WEBHOOKS (v2)

**Base path**: `/api/v2/webhooks`

### Webhook Events
Available event types: `email_sent`, `email_replied`, `reply_categorized`, `email_opened`, `email_clicked`, `email_bounced`, `opt_out`, `out_of_office`, `auto_reply`

### Get Webhook by ID
`GET /api/v2/webhooks/{webhookId}`

### List All Webhooks
`GET /api/v2/webhooks`

### Get Webhook Logs
`GET /api/v2/webhooks/{webhookId}/logs`
- Returns logs for non-2xx responses: `{ eventId, subscriptionId, httpStatus, date }`

### Add Webhook
`POST /api/v2/webhooks`
```json
{
  "event": "email_replied",
  "url": "https://your-server.com/hook",
  "payload": {
    "includeEmailUrl": false,
    "includeProspectCustomFields": true
  }
}
```
- `payload` section is optional
- Response 201: `{ "id": "2" }`

### Update Webhook
`PUT /api/v2/webhooks/{webhookId}`
```json
{
  "event": "email_replied",
  "url": "https://your-server.com/hook",
  "isDisabled": false,
  "payload": { "includeEmailUrl": true, "includeProspectCustomFields": false }
}
```
- 204 on success

### Delete Webhook
`DELETE /api/v2/webhooks/{webhookId}`
- 204 on success

### Test Webhook (by event + URL)
`POST /api/v2/webhooks/test`
- Body: `{ "event": "email_sent", "url": "https://webhook.site/your-id" }`
- 204 on success

### Test Webhook (by subscription ID)
`POST /api/v2/webhooks/{subscriptionId}/test`
- 204 on success, 404 if not found or disabled

---

## 10. REPORTS (v2)

### Get Email Content
`GET /api/v2/emails/{emailMessageId}/content`
- Response: `{ subject, htmlBody, textBody }`

### Generate Email Report
`GET /api/v2/reports/generate-email-report?callbackUrl={url}&reportType={type}&$filter={filter}`
- Returns 202, check `LOCATION` header for download URL

### Download Email Report
`GET /api/v2/reports/download?token={token}&type={type}`
- Returns CSV-format plain text with campaign stats
- 404 if report not ready yet

---

## 11. CAMPAIGNS v2 (Create/Manage)

### Create Campaign
`POST /v2/campaigns`

**Request body**:
```json
{
  "name": "My Campaign",                              // REQUIRED
  "emailAccounts": ["email1@test.com"],                // REQUIRED
  "useDefaultEmailAccountFallback": true,              // optional, uses default if true
  "ScheduleId": 5005,                                  // optional, uses default if omitted
  "settings": {
    "emailsCountPerDay": 125,
    "daysToFinishProspect": 7,
    "EmailSendingDelaySeconds": 55,
    "DailyThrottling": 125,
    "useDailyThrottling": true,
    "disableOpensTracking": false,
    "RepliesHandlingType": "Continue sending emails",  // or "Mark person as finished"
    "enableLinksTracking": true
  },
  "steps": [
    {
      "number": "1",
      "InMinutesCount": "0",        // >=0 for step 1, >1 for later steps
      "templates": [
        {
          "body": "Hello {{FirstName}}!",       // custom text
          "subject": "Quick question",
          "CcList": "cc@company.com"
        }
      ]
    },
    {
      "number": "2",
      "InMinutesCount": "1440",      // 1 day delay
      "templates": [
        { "emailTemplateId": 23952 }  // use existing template
      ]
    }
  ]
}
```

**Multiple variants**: Add multiple objects in `templates` array for A/B testing.

**Response**: Returns 201 with full campaign object including generated `id`, `status: "New"`, `scheduleId`, and populated `steps`.

### Get Campaign Steps
`GET /v2/campaigns/{campaignId}/steps`
- Response: `[{ id, number, inMinutesCount, templates: [{ id, emailTemplateId, emailTemplateName, body, subject, ccList, attachmentsIds }] }]`

### Get Campaign Step by ID
`GET /v2/campaigns/{campaignId}/steps/{stepId}`

### Add Step to Campaign
`POST /v2/campaigns/{campaignId}/steps`
```json
{
  "number": "2",
  "InMinutesCount": "60",
  "templates": [{ "body": "Follow-up text", "subject": "Following up" }]
}
```

### Update Campaign Step
`PATCH /v2/campaigns/{campaignId}/steps/{stepId}`
```json
{
  "inMinutesCount": 30,
  "templates": [{ "id": 676723, "body": "Updated body", "subject": "Updated subject" }]
}
```

### Delete Campaign Step
`DELETE /v2/campaigns/{campaignId}/steps/{stepId}`
- Cannot delete if: campaign archived/deleted, only 1 step left, or emails already sent from step
- Response: `{ "wasDeleted": true }`

### Update Campaign Settings
`PATCH /v2/campaigns/{campaignId}`
```json
{
  "name": "Updated Name",
  "emailAccounts": ["new@email.com"],
  "settings": {
    "EmailsCountPerDay": 150,
    "daysToFinishProspect": 250,
    "emailSendingDelaySeconds": 300,
    "disableOpensTracking": false,
    "repliesHandlingType": "Continue sending emails",
    "enableLinksTracking": false
  }
}
```

### Start Campaign
`POST /v2/campaigns/{campaignId}/start`
- Response: `{ id, name, emailAccounts, created, status: "Active", isArchived }`

### Pause Campaign
`POST /v2/campaigns/{campaignId}/pause`
- Response: `{ id, name, emailAccounts, created, status: "Paused", isArchived }`

### Archive Campaign
`POST /v2/campaigns/{campaignId}/archive`
- Response: `{ ..., status: "Paused", isArchived: true }`

### Activate/Pause Email Step Variant
`POST /v2/campaigns/{stepId}/variants/toggle`
```json
{ "activate": false, "variantIds": [97765] }
```
- Response: `[{ stepId, emailVariants: [{ variantId, isDisabled }] }]`
- Note: `isDisabled: false` means ENABLED

---

## 12. BRANDED LINKS (v2)

### Add Branded Link
`POST /api/v2/branded-links`

**Link types**: 1 = Opt Out Link, 2 = Opens Link, 3 = Click Track Link

**Match modes** (use one):
- `"IsForMatchedEmailAccounts": true` — match sending domain
- `"isForAllEmailAccounts": true` — match all email accounts
- `"emailAccountId": "105987"` — match specific email account

```json
{ "linkType": "1", "CustomDomain": "links.yourdomain.com", "IsForMatchedEmailAccounts": true }
```
- Always added as Reserved + Deactivated
- Response: `{ id, cnameHost, txtHost, cnameValue, txtValue }`

### Change Branded Link State
`PUT /api/v2/branded-links/{brandedLinkId}/active`
- Body: `true` (activate) or `false` (deactivate)
- May take time to process

---

## 13. BILLING (v2)

### Get Billing Info
`GET /v2/billing/info`
```json
{
  "nextInvoiceTotal": 2047.50,
  "currency": "USD",
  "teamMembers": {
    "currentMemberCount": 4,
    "prepaid": 7,
    "available": 3,
    "isUnlimited": false
  }
}
```

---

## 14. SCHEDULES (v2)

### Create Schedule
`POST /v2/schedules`
```json
{
  "name": "Business Hours",
  "excludeHolidays": true,
  "timezoneId": "Pacific Standard Time",
  "useProspectTimezone": true,
  "useFollowUpSchedule": false,
  "mainTimings": [
    {
      "weekDay": "Monday",
      "isActive": true,
      "timeRanges": [{ "fromTime": {"hour": 9, "minute": 0}, "toTime": {"hour": 17, "minute": 0} }]
    },
    { "weekDay": "Saturday", "isActive": false, "timeRanges": [{ "fromTime": {"hour": 0, "minute": 0}, "toTime": {"hour": 24, "minute": 0} }] }
  ],
  "followUpTimings": []
}
```
- At least one active weekday required
- `toTime` must be after `fromTime`
- Response: `{ "id": 123 }`

### Get Schedule by ID
`GET /v2/schedules/{id}`

### Delete Schedule by ID
`DELETE /v2/schedules/{id}`

### Set Schedule as Default
`POST /v2/schedules/{id}/set-default`

---

## 15. DIRECT EMAILS (v2)

### Send Direct Email to Prospect
`POST /v2/prospects/{prospectId}/emails`
```json
{
  "emailAccountId": 77112,
  "subject": "Quick question",
  "body": "Hi {{FirstName}},<br><br>Your message here"
}
```

### Send Test Email
`POST /v2/emails/test`
```json
{
  "EmailAccountId": 79999,
  "Email": "test@gmail.com",
  "Subject": "Test Subject",
  "Body": "Test body content"
}
```

---

## Throttling Summary

| Endpoint group | Throttle |
|---|---|
| Campaign details (GET by name/id/list) | 10s between requests |
| Contact statistics | 10s between requests |
| Campaign statistics | 10s between requests |
| Everything else | No throttle |
