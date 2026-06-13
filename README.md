# xano-apollo-webflow-engine

Email marketing agency lead engine for XYZ. Identifies companies visiting the site via Apollo.io, enriches contact data through a Xano agent, and writes qualified leads to Google Sheets automatically.

---

## How It Works

XYZ's Webflow site fires the Apollo tracking script on every page load. Apollo identifies which companies are visiting and what they're looking at. A Xano agent runs daily, pulls that visitor list from Apollo's API, enriches each company with contact-level data and firmographic data, scores them by intent, and writes the results straight into a Google Sheet — ready for outreach.

---

## System Flow

  Webflow (live site)
      ↓  Apollo tracking script fires on every page load
  Apollo.io
      ↓  identifies company + contact + intent level
  Xano Agent (daily background task)
      ↓  GET /v1/website_visitors
      ↓  POST /v1/people/search (enrich contacts)
      ↓  POST /v1/organizations/enrich (enrich company data)
      ↓  score intent: high / medium / low
  Xano DB (leads table)
      ↓  write enriched records
  Google Sheets (XYZ Leads)
      ↓  append rows via Sheets API
  Sales team reviews and acts

---

## Repo Structure

  flow/               Full system map and data field reference
  scripts/            Apollo tracking snippet — paste into Webflow head
  strategy/           ICP, outbound sequences, and intent scoring config
  xano/               Xano agent function stack instructions
  webflow/            Webflow deployment and verification steps
  sheets/             Google Sheets setup and Xano → Sheets write config

---

## Prerequisites

  - Apollo.io account (paid plan for contact-level tracking)
  - Apollo API key stored in Xano env vars as APOLLO_API_KEY
  - Webflow site with Site Settings access
  - Google Cloud Service Account with Sheets API enabled
  - Google Sheet created and shared with the service account email
  - XYZ's live domain added in Apollo under Website Visitors

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

  5. Configure Xano agent
     See xano/agent-instructions.md

  6. Run make check to confirm all connections are live

---

## Troubleshooting

  Script not registering in Apollo?
  → Published to staging instead of live domain — republish to live

  track_request returning 400?
  → Hit Apollo's domain limit (3 domains on free plan)
  → Remove an unused domain or upgrade

  Xano API calls returning 401?
  → API key expired — regenerate in Apollo → Settings → Integrations → API Keys
  → Update value in Xano env vars

  Rows not appearing in Google Sheet?
  → Check that the sheet is shared with the Google service account email
  → Confirm GOOGLE_JSON_KEY and GOOGLE_SHEET_ID are correct in Xano env vars

  Rate limit (429) in Xano?
  → Add a 1–2 second Delay step between loop iterations

---

## Scheduling (GitHub Actions)

The Xano enrichment function runs daily via a GitHub Actions cron job.

  Schedule: 7:00 AM UTC every day
  Workflow: .github/workflows/apollo-daily-run.yml
  Trigger: POST to Xano endpoint (URL stored in GitHub secret)
  Manual run: GitHub → Actions → Apollo Lead Enrichment → Run workflow

Required GitHub secret:

  XANO_ENRICHMENT_URL → https://x8ki-letl-twmt.n7.xano.io/api:apollo/run-apollo-enrichment

To add the secret:
  GitHub repo → Settings → Secrets and variables → Actions → New repository secret
  Name: XANO_ENRICHMENT_URL
  Value: https://x8ki-letl-twmt.n7.xano.io/api:apollo/run-apollo-enrichment

---

## Notes

  - Do not edit the Apollo snippet manually — Apollo manages it
  - The script goes in <head>, not <body>
  - Contact-level tracking covers U.S.-based visitors on paid Apollo plans
  - All API keys live in Xano env vars — never hardcode them anywhere
  - Run the Xano agent as a Background Task — foreground will timeout on large datasets
