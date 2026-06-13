# Xano Agent Instructions
# xano-apollo-webflow-engine / XYZ

---

## What This Agent Does

Runs on a daily schedule. Pulls the list of companies that visited XYZ's website
from Apollo, enriches each one with contact data and firmographic data, scores
them by intent, writes records to the Xano leads table, and appends rows to the
XYZ Leads Google Sheet.

---

## Environment Variables Required

  APOLLO_API_KEY      → Apollo API key
  GOOGLE_JSON_KEY     → Google service account JSON (full file contents)
  GOOGLE_SHEET_ID     → ID from XYZ Leads sheet URL (between /d/ and /edit)

  All live in: Xano Dashboard → Settings → Environment Variables

---

## Pre-Flight Checks Before Building

  1. Test Apollo key:
     GET https://api.apollo.io/v1/website_visitors
     Header: x-api-key → {{env.APOLLO_API_KEY}}
     Expect: 200 response with visitor array

  2. Test Google auth:
     Run the Google Service Account Token function from the Xano snippet library
     Expect: access_token returned

  3. Confirm Google Sheet exists with correct headers in Row 1:
     A: visit_date     B: company       C: domain         D: contact_name
     E: contact_title  F: contact_email G: intent         H: source
     I: phone          J: employee_count K: revenue_range  L: industry
     M: hq_location    N: visit_count

---

## Setup Steps in Xano

### Step 1 — Install Google Sheets Snippet

  Xano Dashboard → Snippets → search "Google Sheets"
  Install: Google Service Account snippet
  This adds two functions to your instance:
    - google_service_account_token (handles OAuth)
    - google_sheet_api (base request handler)

### Step 2 — Create Background Task

  Xano Dashboard → Background Tasks → New Task
  Name: apollo_lead_enrichment_daily
  Schedule: Daily (set your preferred time, e.g. 7:00 AM)
  Type: Background (not foreground — this may process many records)

### Step 3 — Build the Function Stack

  --- BLOCK 1: Authenticate with Google ---

  Function: google_service_account_token
  Input: scope = https://www.googleapis.com/auth/spreadsheets
  Output: save as var → google_token

  --- BLOCK 2: Get Apollo Visitors ---

  External API Request
    Method: GET
    URL: https://api.apollo.io/v1/website_visitors
    Headers:
      x-api-key: {{env.APOLLO_API_KEY}}
      Content-Type: application/json
    Output: save as var → visitor_list

  --- BLOCK 3: Loop Over Visitors ---

  For Each: visitor_list.website_visitors
  Iterator variable name: visitor

    --- BLOCK 3a: Enrich with People Search ---

    External API Request
      Method: POST
      URL: https://api.apollo.io/v1/people/search
      Headers:
        x-api-key: {{env.APOLLO_API_KEY}}
        Content-Type: application/json
      Body:
        {
          "q_organization_domains": ["{{visitor.domain}}"],
          "page": 1,
          "per_page": 3
        }
      Output: save as var → enriched_contacts

    --- BLOCK 3b: Enrich Company Data ---

    External API Request
      Method: POST
      URL: https://api.apollo.io/v1/organizations/enrich
      Headers:
        x-api-key: {{env.APOLLO_API_KEY}}
        Content-Type: application/json
      Body:
        { "domain": "{{visitor.domain}}" }
      Output: save as var → company_data

    Maps:
      employee_count → company_data.organization.num_employees
      revenue_range  → company_data.organization.annual_revenue_printed
      industry       → company_data.organization.industry
      hq_location    → company_data.organization.city +
                       company_data.organization.country

    --- BLOCK 3c: Score Intent ---

    Conditional (switch on visitor.intent_strength):
      "high"   → set intent_label = "high"
      "medium" → set intent_label = "medium"
      default  → set intent_label = "low"

    --- BLOCK 3d: Write to Xano Leads Table ---

    DB Request: Add or Edit Record → leads table
    Fields to map:
      visit_date     → visitor.last_visited_at
      company_name   → visitor.name
      domain         → visitor.domain
      contact_name   → enriched_contacts.people[0].name
      contact_title  → enriched_contacts.people[0].title
      contact_email  → enriched_contacts.people[0].email
      phone          → enriched_contacts.people[0].phone_numbers[0].sanitized_number
      intent_level   → intent_label
      employee_count → company_data.organization.num_employees
      revenue_range  → company_data.organization.annual_revenue_printed
      industry       → company_data.organization.industry
      hq_location    → company_data.organization.city + company_data.organization.country
      visit_count    → visitor.visits_count
      source         → "apollo_visitor"
      run_date       → now()

    --- BLOCK 3e: Append Row to Google Sheet ---

    External API Request
      Method: POST
      URL: https://sheets.googleapis.com/v4/spreadsheets/
           {{env.GOOGLE_SHEET_ID}}/values/Sheet1!A:N:append
           ?valueInputOption=USER_ENTERED
      Headers:
        Authorization: Bearer {{google_token}}
        Content-Type: application/json
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

    Column order matches Sheet headers:
      A: visit_date      B: company         C: domain          D: contact_name
      E: contact_title   F: contact_email   G: intent          H: source
      I: phone           J: employee_count  K: revenue_range   L: industry
      M: hq_location     N: visit_count

    --- BLOCK 3f: Delay ---

    Delay: 1500ms
    (prevents hitting Apollo's rate limit on large visitor lists)

    --- BLOCK 3g: Optional — Push High Intent to Apollo Sequence ---

    Conditional: if intent_label = "high"
      External API Request
        Method: POST
        URL: https://api.apollo.io/v1/emailer_campaigns/
             {YOUR_SEQUENCE_ID}/add_contact_ids
        Headers:
          x-api-key: {{env.APOLLO_API_KEY}}
          Content-Type: application/json
        Body:
          {
            "contact_ids": ["{{enriched_contacts.people[0].id}}"]
          }

---

## Error Handling

  Wrap each External API Request block in a Try/Catch:

  401 → log "API key invalid" → stop task → send alert
  400 → log "Bad request or domain limit hit" → skip record → continue
  429 → log "Rate limit" → increase delay to 3000ms → retry once
  Empty people array → log "No contacts found for {{visitor.domain}}"
        → still write company row to sheet with blank contact fields

---

## Testing

  Before enabling the schedule:
  1. Run the task manually once
  2. Check Xano logs for any errors
  3. Open XYZ Leads Google Sheet
  4. Confirm rows are appearing with correct data in all 14 columns (A through N)
  5. Check Xano leads table for matching records

---

## Notes

  - Run as Background Task — foreground will timeout on large datasets
  - enriched_contacts.people[0] grabs the top-matched contact per company
    change [0] to loop all contacts if needed later
  - Apollo visitor data can take up to 24 hours to populate
    after the Webflow script goes live
  - Keep old versions of the function stack before making changes —
    use Xano's built-in version history
