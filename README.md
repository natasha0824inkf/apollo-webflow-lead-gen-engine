# xano-apollo-webflow-engine

Lead engine for agencyjr.com. Identifies companies visiting the site via Apollo.io, enriches contact and firmographic data, and writes qualified leads to Google Sheets automatically via GitHub Actions.

---

## How It Works

The Webflow site fires the Apollo tracking script on every page load. Apollo identifies which companies are visiting and what they're looking at. A GitHub Actions cron job runs daily, pulls that visitor list from Apollo's API, enriches each company with contact-level data and firmographic data, scores them by intent, and writes the results straight into a Google Sheet — ready for outreach.

---

## System Flow

  Webflow (live site)
      ↓  Apollo tracking script fires on every page load
  Apollo.io
      ↓  identifies company + contact + intent level
  GitHub Actions (daily cron — 7AM UTC)
      ↓  GET /v1/website_visitors
      ↓  POST /v1/people/search (enrich contacts)
      ↓  POST /v1/organizations/enrich (enrich company data)
      ↓  score intent: high / medium / low
  Google Sheets (AJR Leads)
      ↓  append rows via Sheets API
  Sales team reviews and acts

---

## Repo Structure

  flow/               Full system map and data field reference
  input/              Seed files for alternative enrichment scripts
  scripts/            Apollo enrichment scripts (Node.js) + tracking snippet
  strategy/           ICP, outbound sequences, and intent scoring config
  webflow/            Webflow deployment and verification steps
  sheets/             Google Sheets setup and column reference

---

## Prerequisites

  - Apollo.io account (paid plan for Website Visitors API access)
  - Apollo API key with Website Visitors scope enabled
  - Webflow site with Site Settings access
  - Google Cloud Service Account with Sheets API enabled
  - Google Sheet created and shared with the service account email
  - agencyjr.com added in Apollo under Website Visitors

---

## Quick Start

  1. Grab Apollo snippet
     Apollo → Settings → Ideal Customer Profile → Website Visitors → Copy Code

  2. Deploy to Webflow
     Site Settings → Custom Code → Head Code → paste → Save → Publish (live domain only)

  3. Verify connection
     Apollo → Website Visitors → Settings → Test Connection → wait for "Active"

  4. Set up Google Sheet
     See sheets/sheets-setup.md

  5. Add GitHub secrets (repo → Settings → Secrets and variables → Actions)

     APOLLO_API_KEY             → Apollo API key (Website Visitors scope required)
     GOOGLE_SHEET_ID            → ID from Sheet URL between /d/ and /edit
     GOOGLE_SERVICE_ACCOUNT_JSON → full contents of service account JSON file (one line)

  6. Trigger manually to test
     GitHub → Actions → Apollo Lead Enrichment — Daily Run → Run workflow

---

## Troubleshooting

  Script not registering in Apollo?
  → Published to staging instead of live domain — republish to live

  Apollo 401?
  → API key expired — regenerate in Apollo → Settings → Integrations → API Keys
  → Update APOLLO_API_KEY in GitHub secrets

  Apollo 404 on /v1/website_visitors?
  → API key does not have Website Visitors scope — create a new key with that scope enabled
  → Or plan does not include Website Visitors API — upgrade in Apollo billing
  → Use alternative scripts in feat/alt-lead-sources branch while blocked

  Rows not appearing in Google Sheet?
  → Confirm sheet is shared with the service account email (Editor access)
  → Confirm GOOGLE_SHEET_ID is correct (string between /d/ and /edit in the Sheet URL)
  → Confirm GOOGLE_SERVICE_ACCOUNT_JSON is the full JSON on a single line

  Rate limit (429)?
  → The script already waits 1.5 seconds between visitors — increase sleep() if needed

---

## Scheduling

  Schedule: 7:00 AM UTC every day (currently paused — see issue #6)
  Workflow: .github/workflows/apollo-daily-run.yml
  Manual run: GitHub → Actions → Apollo Lead Enrichment — Daily Run → Run workflow

---

## Alternative Lead Sources (feat/alt-lead-sources branch)

The Apollo Website Visitors API requires a paid plan scope that may not be
included on the current account. While that is resolved, two alternative
enrichment scripts are available that bypass the visitor API entirely and
still write enriched rows to Google Sheets.

### Option 2 — BuiltWith export enrichment (scripts/builtwith-enrich.js)

Target: 7-8 figure DTC/ecom brands in UK/EU/Nordics/Baltics already running
Klaviyo + Shopify — the highest-signal ICP match.

How it works:
  1. Export a CSV from builtwith.com → Technology Lookup → search "Klaviyo"
     Filter by country (UK, Sweden, Norway, Denmark, Finland, etc.)
     Requires BuiltWith paid plan (~$50/mo)
  2. Save export as input/builtwith-export.csv
  3. Run: node scripts/builtwith-enrich.js
  Script filters for brands also running Shopify, enriches each domain
  via Apollo people/search + organizations/enrich, writes to Sheets.

Why this ICP: brands already paying for Klaviyo are already bought in on
email. They need a better operator, not convincing.

### Option 3 — CSV seed enrichment (scripts/enrich-from-csv.js)

Target: any domain list — manual research, DTC newsletters, Instagram/TikTok
ads, LinkedIn, conference attendee lists, etc.

How it works:
  1. Add domain names (one per line) to input/domains.csv
  2. Run: node scripts/enrich-from-csv.js
  Script enriches each domain via Apollo and writes to Sheets.
  No visitor API needed. Works today with existing credentials.

Good sources for the seed list:
  - DTC brands in Retail Brew, 2PM, The Hustle newsletters
  - Brands running Meta/TikTok ads in target geos (use ad libraries)
  - Shopify stores discovered via niche browsing or competitor research
  - LinkedIn search: ecommerce + UK/EU + 10-200 employees
  - Brands that follow or engage with agencyjr.com on social

Both scripts use the same Google Sheets credentials and Apollo API key
as the main visitor enrichment script. Same column structure, same sheet.

---

## Notes

  - Do not edit the Apollo snippet manually — Apollo manages it
  - The script goes in <head>, not <body>
  - Contact-level tracking covers U.S.-based visitors on paid Apollo plans
  - Never hardcode API keys — all secrets live in GitHub Actions secrets
