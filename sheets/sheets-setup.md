# Google Sheets Setup
# xano-apollo-webflow-engine / XYZ

---

## What This Does

The Xano agent writes enriched lead records from Apollo into a Google Sheet
after each daily run. This gives the sales team a clean, always-updated
lead list without logging into Xano or Apollo.

---

## One-Time Setup

### Step 1 — Google Cloud Service Account

  Go to: console.cloud.google.com
  → Create a project (or use existing XYZ project)
  → APIs & Services → Enable → search "Google Sheets API" → Enable
  → IAM & Admin → Service Accounts → Create Service Account
  → Name it something like xano-sheets-writer
  → Keys tab → Add Key → JSON → download the file

  DO NOT commit this JSON file. It is already blocked by .gitignore.

### Step 2 — Share the Sheet

  Open your Google Sheet (create one called "XYZ Leads" if not done)
  → Share → paste the service account email (ends in @...gserviceaccount.com)
  → Give it Editor access → Done

### Step 3 — Add to Xano Environment Variables

  Xano Dashboard → Settings → Environment Variables

  Add these:
    GOOGLE_JSON_KEY     → paste the full contents of the downloaded JSON file
    GOOGLE_SHEET_ID     → the ID from the Sheet URL (between /d/ and /edit)

  Scope used in Xano:
    https://www.googleapis.com/auth/spreadsheets

### Step 4 — Sheet Column Structure

  Set up these headers in Row 1 of your leads tab (columns A through N):

  | Col | Header         |
  |-----|----------------|
  | A   | visit_date     |
  | B   | company        |
  | C   | domain         |
  | D   | contact_name   |
  | E   | contact_title  |
  | F   | contact_email  |
  | G   | intent         |
  | H   | source         |
  | I   | phone          |
  | J   | employee_count |
  | K   | revenue_range  |
  | L   | industry       |
  | M   | hq_location    |
  | N   | visit_count    |

---

## How Xano Writes to the Sheet

  In the Xano function stack (see xano/agent-instructions.md), Block 3e:

  External API Request
    Method: POST
    URL: https://sheets.googleapis.com/v4/spreadsheets/
         {{env.GOOGLE_SHEET_ID}}/values/Sheet1!A:N:append
         ?valueInputOption=USER_ENTERED
    Header: Authorization: Bearer {{google_token}}
    Body:
      {
        "values": [[
          "{{visitor.last_visited_at}}",
          "{{visitor.name}}",
          "{{visitor.domain}}",
          "{{enriched_contacts.people[0].name}}",
          "{{enriched_contacts.people[0].title}}",
          "{{enriched_contacts.people[0].email}}",
          "{{intent_label}}",
          "apollo_visitor",
          "{{enriched_contacts.people[0].phone_numbers[0].sanitized_number}}",
          "{{company_data.organization.num_employees}}",
          "{{company_data.organization.annual_revenue_printed}}",
          "{{company_data.organization.industry}}",
          "{{company_data.organization.city}}, {{company_data.organization.country}}",
          "{{visitor.visits_count}}"
        ]]
      }

  This appends a new row per lead. Existing rows are never overwritten.

---

## Optional — Conditional Formatting for Intent

  Google Sheets → Format → Conditional Formatting
  Apply to range: G2:G1000

  Rule 1: Text is exactly "high"   → green background, bold
  Rule 2: Text is exactly "medium" → yellow background
  Rule 3: Text is exactly "low"    → no fill (default)

---

## Notes

  - Xano has a native Google Sheets snippet in their snippet library —
    install it to handle service account auth as your base
  - Large runs (100+ visitors) must run as a Xano background task
  - The sheet is append-only by design — filter duplicates by domain
    using a formula on column C if needed
