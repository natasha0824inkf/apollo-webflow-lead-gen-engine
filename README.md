# apollo-webflow-engine

Lead enrichment engine — Apollo visitor tracking → Google Sheets via GitHub Actions.

Identifies companies visiting the site, enriches contact and firmographic data, scores by intent, and appends rows to Google Sheets daily. No CRM required.

---

## How It Works

Apollo tracking script fires on every Webflow page load. A GitHub Actions cron job runs daily, pulls the visitor list from Apollo's API, enriches each company with contact and firmographic data via Apollo's people and organization endpoints, scores by intent, and appends rows to Google Sheets.

---

## System Flow

  Webflow
      ↓  Apollo tracking script fires on page load
  Apollo.io
      ↓  identifies company + intent level
  GitHub Actions (daily cron — 7AM UTC)
      ↓  GET /v1/website_visitors
      ↓  filter: skip low-intent + junk domains (Phase 2)
      ↓  POST /v1/people/search — enrich contacts
      ↓  POST /v1/organizations/enrich — enrich company data
      ↓  score intent: high / medium / low
  Google Sheets
      ↓  append rows via Sheets API
      ↓  alert on high-intent hits (Phase 2)

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

## Phase 1 — MVP (current)

Status: blocked on Apollo Website Visitors API scope (see issue #6).
Everything else is working: Google Sheets auth, contact enrichment, GitHub Actions runner.

What's built:
  - Apollo pixel on Webflow
  - scripts/apollo-enrich.js — visitors → enrichment → Sheets
  - scripts/enrich-from-csv.js — manual domain list → enrichment → Sheets
  - scripts/google-stack-hunter.js — Reddit/Google intent signal scraper
  - GitHub Actions cron (paused until Apollo key is updated)

Limitation: enriches all visitors without filtering — wastes credits on low-quality hits.
Fix is in Phase 2.

---

## Phase 2 — Precision Engine (next)

### 1. Pre-enrichment filter gate

Before hitting Apollo enrichment endpoints, qualify each visitor.
This avoids burning credits on leads that will never convert.

Filter logic (to be added to scripts/filters.js):
  - Skip if intent_strength is low and visit_count < 2
  - Skip if domain is a free email provider or known bot/ISP
  - Skip if annual_revenue is below threshold (revenue > headcount as ICP signal)
  - Skip if company is in a blocked industry (competitors, agencies, recruiters)
  - Flag if visitor hit /pricing or /contact — these bypass normal scoring

Why revenue not headcount: a 4-person DTC brand at £3M ARR is a better prospect
than a 50-person B2B SaaS with no ecom relevance. Headcount alone is a poor filter
for this ICP.

### 2. Deduplication

Current script appends a new row every run even if the same company was seen yesterday.
Phase 2 checks existing Sheet rows before appending — skip if domain seen in last 14 days.

### 3. High-intent alerts

Visitors who hit /pricing or /contact are flagged separately and trigger an immediate
Slack or email notification rather than waiting for the next morning's Sheet review.
These are processed in a separate lightweight action, not the daily batch.

### 4. Multi-source visitor identification

Apollo's Website Visitors API coverage is US-biased and requires a higher plan tier.
Phase 2 adds an alternative identification layer:

  Option A: Leadfeeder — EU/Nordics-native, API included in all paid plans, free tier
            available (100 companies, 7-day history). Drop-in replacement for the
            Apollo visitor fetch — rest of the pipeline stays identical.

  Option B: Warmly.ai — under evaluation. Claims person-level identification via
            data partnerships. Pending security and coverage review before connecting.

  The enrichment layer (people/search, organizations/enrich) stays Apollo regardless
  of which visitor ID source is used.

### 5. Logging discarded leads

Add reason-code logging when a lead is filtered out:
  DISCARD: low_intent | DISCARD: repeat_domain | DISCARD: revenue_below_threshold
This builds a feedback loop — patterns in discarded leads inform ICP refinement
and can flag unexpected traffic sources worth investigating.

---

## Alternative Lead Sources (available now, no Apollo visitor API needed)

### Option 3 — CSV seed (scripts/enrich-from-csv.js)

Add domains to input/domains.csv → node scripts/enrich-from-csv.js
Enriches via Apollo people/search + organizations/enrich. Works today.

Good seed sources:
  - Meta/TikTok ad libraries filtered by geo
  - DTC newsletters (Retail Brew, 2PM, The Hustle)
  - LinkedIn filtered by industry + geography
  - Brands running ads in target markets

### Option 2 — BuiltWith export (scripts/builtwith-enrich.js)

Export Klaviyo technology list from builtwith.com → input/builtwith-export.csv
Script filters Klaviyo + Shopify brands in target geos, enriches via Apollo.
Requires BuiltWith paid plan (~$50/mo). Highest ICP signal: brands already
paying for Klaviyo need a better operator, not convincing.

### Chaos scrape — no APIs (scripts/google-stack-hunter.js)

Reddit JSON API (no key) + optional Google Custom Search (100/day free).
Finds intent signals in ecom communities, scrapes contact pages for emails.
Output: output/leads.csv

  node scripts/google-stack-hunter.js            # Reddit only
  node scripts/google-stack-hunter.js --google   # + Google CSE
  node scripts/google-stack-hunter.js --sheets   # + write to Sheets

---

## Prerequisites

  - Apollo.io account (paid plan for Website Visitors API access)
  - Apollo API key with Website Visitors scope enabled
  - Webflow site with Site Settings access
  - Google Cloud Service Account with Sheets API enabled
  - Google Sheet shared with the service account email

---

## Quick Start

  1. Apollo → Settings → Ideal Customer Profile → Website Visitors → Copy Code
  2. Webflow → Site Settings → Custom Code → Head Code → paste → Publish (live domain only)
  3. Apollo → Website Visitors → Settings → Test Connection → wait for "Active"
  4. See sheets/sheets-setup.md for Google Sheet setup
  5. Add GitHub secrets: APOLLO_API_KEY, GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_JSON
  6. GitHub → Actions → Apollo Lead Enrichment — Daily Run → Run workflow

---

## Troubleshooting

  Apollo 401?
  → Key expired — regenerate in Apollo → Settings → Integrations → API Keys
  → Update APOLLO_API_KEY in GitHub secrets

  Apollo 404 on /v1/website_visitors?
  → Key does not have Website Visitors scope — create a new key with that scope
  → Or plan does not include this API — check billing
  → See issue #6

  Rows not appearing in Google Sheet?
  → Confirm sheet is shared with service account email (Editor access)
  → Confirm GOOGLE_SHEET_ID is the string between /d/ and /edit in the URL
  → Confirm GOOGLE_SERVICE_ACCOUNT_JSON is full JSON on a single line

  Rate limit (429)?
  → Script waits 1.5s between visitors — increase sleep() if needed

---

## Scheduling

  Schedule: 7:00 AM UTC daily (paused — see issue #6)
  Workflow: .github/workflows/apollo-daily-run.yml
  Manual:   GitHub → Actions → Apollo Lead Enrichment — Daily Run → Run workflow

---

## Notes

  - Apollo snippet goes in <head> not <body>
  - Never hardcode API keys — all secrets live in GitHub Actions secrets
  - EU visitor contact-level data is limited on Apollo — company-level only for most EU traffic
  - output/ folder is gitignored — CSV files from chaos scrape stay local only
