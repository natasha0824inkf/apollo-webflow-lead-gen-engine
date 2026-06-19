# xano-apollo-webflow-engine

Lead enrichment engine — Apollo visitor tracking → Google Sheets via GitHub Actions.

---

## How It Works

Apollo tracking script fires on every Webflow page load. A GitHub Actions cron job runs daily, pulls the visitor list from Apollo’s API, enriches each company with contact and firmographic data, scores by intent, and appends rows to Google Sheets.

---

## System Flow

  Webflow
      ↓  Apollo tracking script fires on page load
  Apollo.io
      ↓  identifies company + intent level
  GitHub Actions (daily cron — 7AM UTC)
      ↓  GET /v1/website_visitors
      ↓  POST /v1/people/search (enrich contacts)
      ↓  POST /v1/organizations/enrich (enrich company data)
      ↓  score intent: high / medium / low
  Google Sheets
      ↓  append rows via Sheets API

---

## Repo Structure

  config/             Query config for alternative lead source scripts
  flow/               Full system map and data field reference
  input/              Seed files for CSV-based enrichment
  scripts/            Enrichment scripts (Node.js) + Apollo tracking snippet
  strategy/           ICP, outbound sequences, and intent scoring config
  webflow/            Webflow deployment and verification steps
  sheets/             Google Sheets setup and column reference

---

## Prerequisites

  - Apollo.io account (paid plan for Website Visitors API access)
  - Apollo API key with Website Visitors scope enabled
  - Webflow site with Site Settings access
  - Google Cloud Service Account with Sheets API enabled
  - Google Sheet shared with the service account email

---

## Quick Start

  1. Grab Apollo snippet
     Apollo → Settings → Ideal Customer Profile → Website Visitors → Copy Code

  2. Deploy to Webflow
     Site Settings → Custom Code → Head Code → paste → Save → Publish (live domain only)

  3. Verify connection
     Apollo → Website Visitors → Settings → Test Connection → wait for “Active”

  4. Set up Google Sheet — see sheets/sheets-setup.md

  5. Add GitHub secrets (repo → Settings → Secrets and variables → Actions)

     APOLLO_API_KEY              → Apollo API key (Website Visitors scope required)
     GOOGLE_SHEET_ID             → ID from Sheet URL between /d/ and /edit
     GOOGLE_SERVICE_ACCOUNT_JSON → full service account JSON on a single line

  6. Trigger manually to test
     GitHub → Actions → Apollo Lead Enrichment — Daily Run → Run workflow

---

## Branches

  main                  Primary pipeline — Apollo visitors → Google Sheets
  feat/alt-lead-sources Option 2: BuiltWith export enrichment
                        Option 3: CSV seed enrichment (works without visitor API)
  feat/chaos-scrape     No-API lead sourcing via Reddit + Google Custom Search

---

## Alternative Lead Sources

### Option 3 — CSV seed (scripts/enrich-from-csv.js)

Add domains to input/domains.csv, run node scripts/enrich-from-csv.js.
Enriches via Apollo people/search + organizations/enrich. No visitor API needed.

Good seed sources:
  - Meta/TikTok ad libraries (filter by geo)
  - DTC newsletters (Retail Brew, 2PM, The Hustle)
  - LinkedIn search filtered by industry + geography
  - Brands found via niche browsing

### Option 2 — BuiltWith export (scripts/builtwith-enrich.js)

Export Klaviyo technology list from builtwith.com, save as input/builtwith-export.csv.
Script filters for Shopify + target geos, enriches via Apollo, writes to Sheets.
Requires BuiltWith paid plan (~$50/mo).

### Chaos scrape — no APIs (scripts/google-stack-hunter.js)

Zero dependencies. Reddit JSON API (no key) + optional Google Custom Search (100/day free).
Finds intent signals in ecom communities, scrapes contact pages for emails.
Output: output/leads.csv

  node scripts/google-stack-hunter.js            # Reddit only
  node scripts/google-stack-hunter.js --google   # + Google CSE
  node scripts/google-stack-hunter.js --sheets   # + write to Sheets

---

## Troubleshooting

  Apollo 401?
  → API key expired — regenerate in Apollo → Settings → Integrations → API Keys
  → Update APOLLO_API_KEY in GitHub secrets

  Apollo 404 on /v1/website_visitors?
  → Key does not have Website Visitors scope — create a new key with that scope
  → Or plan does not include Website Visitors API — check billing
  → See issue #6 for re-enable checklist

  Rows not appearing in Google Sheet?
  → Confirm sheet is shared with service account email (Editor access)
  → Confirm GOOGLE_SHEET_ID is the string between /d/ and /edit in the URL
  → Confirm GOOGLE_SERVICE_ACCOUNT_JSON is full JSON on a single line

  Rate limit (429)?
  → Script waits 1.5s between visitors — increase sleep() in the script if needed

---

## Scheduling

  Schedule: 7:00 AM UTC daily (currently paused — see issue #6)
  Workflow: .github/workflows/apollo-daily-run.yml
  Manual:   GitHub → Actions → Apollo Lead Enrichment — Daily Run → Run workflow

---

## Notes

  - Apollo snippet goes in <head>, not <body>
  - Never hardcode API keys — all secrets live in GitHub Actions secrets
  - Contact-level tracking is US-biased on Apollo — EU visitors get company-level only
