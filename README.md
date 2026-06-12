# xano-apollo-webflow-engine
Internal engine for small biz that connects Apollo.io website visitor tracking to Webflow and runs enrichment + lead workflows through Xano.

Webflow → Apollo.io visitor tracking engine for XYZ. Identifies companies hitting the site, enriches contact data via Apollo API through a Xano agent, and writes qualified leads to Google Sheets automatically.

Full Repo Structure
xano-apollo-webflow-engine/
├── README.md
├── .gitignore
├── Makefile
├── flow/
│   └── engine-flow.md          ← the full system map
├── scripts/
│   └── apollo-head-snippet.html
├── xano/
│   └── agent-instructions.md
├── webflow/
│   └── deployment-notes.md
└── sheets/
    └── sheets-setup.md         ← Google Sheets output layer

# xan.io-apollo-webflow-engine

Webflow → Apollo.io visitor tracking engine for XYZ small biz. 
Identifies companies hitting the site, enriches contact data via Apollo API through a Xano agent, and writes qualified leads to Google Sheets automatically.

---

## How It Works

XYZ's Webflow site fires the Apollo tracking script on every page load.
Apollo identifies which companies are visiting and what they're looking at.
A Xano agent runs daily, pulls that visitor list from Apollo's API, enriches
each company with contact-level data, scores them by intent, and writes the
results straight into a Google Sheet — ready for outreach without touching
a CRM or waiting on marketing.

---

## System Flow

  Webflow (live site)
      ↓  Apollo tracking script (head) fires on page load 
  Apollo.io
      ↓  logs company + intent data
  Xano Agent (scheduled daily)
      ↓  GET /website_visitors
      ↓  POST /people/search (enrich each visitor)
      ↓  score by intent level
  Xano DB (leads table)
      ↓  write enriched records
  Google Sheets (XYZ Leads Sheet)
      ↓  append new rows via Google Sheets API
  Sales team picks up from here

-

## Repo Structure

  flow/               Full system map and data field reference
  scripts/            Apollo tracking snippet — paste into Webflow head
  xano/               Xano agent function stack instructions
  webflow/            Webflow deployment and verification steps
  sheets/             Google Sheets setup and Xano → Sheets write config

---

## Prerequisites

  - Apollo.io account (paid plan for contact-level tracking)
  - Apollo API key stored in Xano (env vars or Secrets — already done)
  - Webflow site with Site Settings access
  - Google Cloud Service Account with Sheets API enabled
  - Google Sheet created and shared with the service account email
  - XYZ's live domain added in Apollo under Website Visitors

---

## Quick Start

  1. Grab Apollo snippet
     Apollo → Settings → Ideal Customer Profile → Website Visitors → Copy Code

  2. Deploy to Webflow
     Site Settings → Custom Code → Head Code → paste → Save → Publish (live domain)

  3. Verify connection
     Apollo → Website Visitors → Settings → Test Connection → wait for "Active"

  4. Set up Google Sheet
     See sheets/sheets-setup.md

  5. Configure Xano agent
     See xano/agent-instructions.md

  6. Run make check to confirm all connections are live (see Makefile)

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
  → Confirm GOOGLE_JSON_KEY and sheet ID are correct in Xano env vars

  Rate limit (429) in Xano?
  → Add a 1–2 second Delay step between loop iterations

---

## Notes

  - Do not edit the Apollo snippet manually — Apollo manages it
  - The script goes in <head>, not <body>
  - Contact-level tracking covers U.S.-based visitors on paid Apollo plans
  - All API keys live in Xano env vars — never hardcode them anywhere
  - Large data runs should be set as Xano background tasks, not foreground

# Secrets — never commit these
.env
*.env
secrets.json
service-account-key.json
*credentials*.json

# OS noise
.DS_Store
Thumbs.db

# Editor folders
.vscode/
.idea/

# xano-apollo-webflow-engine
# Run `make help` to see available commands

.PHONY: help check verify-apollo verify-sheet open-sheet open-apollo

help:
	@echo ""
	@echo "  xano-apollo-webflow-engine — available commands"
	@echo ""
	@echo "  make check          Run all connection checks"
	@echo "  make verify-apollo  Open Apollo visitor tracking settings"
	@echo "  make verify-sheet   Remind you how to verify the Google Sheet"
	@echo "  make open-sheet     Open the XYZ leads sheet in browser"
	@echo "  make open-apollo    Open Apollo website visitors in browser"
	@echo ""

check: verify-apollo verify-sheet
	@echo "✓ Check complete — confirm Active status in Apollo and rows in Sheet"

verify-apollo:
	@echo "→ Apollo: go to Website Visitors → Settings → Test Connection"
	@open "https://app.apollo.io/#/settings/website-visitors" 2>/dev/null || \
	echo "  Open: https://app.apollo.io/#/settings/website-visitors"

verify-sheet:
	@echo "→ Google Sheet: confirm Xano is writing rows to the leads tab"
	@echo "  Sheet ID should be set in Xano env vars as GOOGLE_SHEET_ID"

open-apollo:
	@open "https://app.apollo.io/#/settings/website-visitors" 2>/dev/null || \
	echo "Open: https://app.apollo.io/#/settings/website-visitors"

open-sheet:
	@echo "Set your sheet URL in this Makefile under open-sheet to enable this"


  sheets/sheets-setup.md
text

Copy
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

  DO NOT commit this JSON file. Add it to .gitignore (already done).

### Step 2 — Share the Sheet

  Open your Google Sheet (create one called "XYZ Leads" if not done)
  → Share → paste the service account email (ends in @...gserviceaccount.com)
  → Give it Editor access → Done

### Step 3 — Add to Xano Environment Variables

  Xano Dashboard → Settings → Environment Variables

  Add these:
    GOOGLE_JSON_KEY     → paste the full contents of the downloaded JSON file
    GOOGLE_SHEET_ID     → the ID from the Sheet URL (between /d/ and /edit)

  Scopes to use in Xano:
    https://www.googleapis.com/auth/spreadsheets

### Step 4 — Sheet Structure

  Set up these columns in Row 1 of your leads tab:

  | A             | B       | C            | D             | E               | F            | G          | H      |
  | visit_date    | company | domain       | contact_name  | contact_title   | contact_email| intent     | source |

---

## How Xano Writes to the Sheet

  In the Xano function stack (see xano/agent-instructions.md):

  After enriching each lead record:

  Step 1 — Run the Google Service Account token function
           (use Xano's built-in Google Sheets snippet as the base)

  Step 2 — External API Request
    Method: POST
    URL: https://sheets.googleapis.com/v4/spreadsheets/
         {{env.GOOGLE_SHEET_ID}}/values/Sheet1!A1:H1:append
         ?valueInputOption=USER_ENTERED
    Header: Authorization: Bearer {{google_access_token}}
    Body:
      {
        "values": [
          [
            "{{visit_date}}",
            "{{company_name}}",
            "{{domain}}",
            "{{contact_name}}",
            "{{contact_title}}",
            "{{contact_email}}",
            "{{intent_level}}",
            "apollo_visitor"
          ]
        ]
      }

  This appends a new row per lead. Existing rows are never overwritten.

---

## Notes

  - Xano has a native Google Sheets snippet you can install directly
    from their snippet library to handle auth — use it as your base
  - Large runs (100+ visitors) should be run as a Xano background task
  - The sheet is append-only by design — duplicates can be filtered
    in the sheet using a formula on the domain column if needed
flow/engine-flow.md
text

Copy
# Engine Flow — Full System Map
# xano-apollo-webflow-engine / XYZ

---

## End-to-End Flow

  [Visitor lands on XYZ Webflow site]
          ↓
  [Apollo script fires in <head>]
          ↓
  [Apollo logs: company, pages visited, intent level]
          ↓
  [Xano agent triggers — daily schedule]
          ↓
  [GET apollo.io/v1/website_visitors]
  → returns: company name, domain, intent, visit timestamp
          ↓
  [POST apollo.io/v1/people/search per company]
  → returns: contact name, title, email (paid plan, US-based)
          ↓
  [Score intent: high / medium / low]
          ↓
  [Write to Xano leads table]
          ↓
  [Append row to Google Sheet — XYZ Leads]
          ↓
  [Optional: push high-intent contacts to Apollo sequence]
          ↓
  [Sales team reviews sheet and acts]

---

## Data Fields at Each Stage

  From Apollo visitor call:
    - company_name
    - domain
    - intent_level (high / medium / low)
    - last_visited_at

  Added after people/search enrichment:
    - contact_name
    - contact_title
    - contact_email

  Written to Google Sheet + Xano DB:
    - all of the above
    - source = "apollo_visitor"
    - run_date (timestamp of Xano agent run)

---

## Environment Variables Required in Xano

  APOLLO_API_KEY        → Apollo.io API key (already added)
  GOOGLE_JSON_KEY       → Google service account JSON (full contents)
  GOOGLE_SHEET_ID       → ID from the XYZ Leads Sheet URL

---

## Files in This Repo and What They Do

  scripts/apollo-head-snippet.html   → paste into Webflow head
  webflow/deployment-notes.md        → how to deploy and verify in Webflow
  xano/agent-instructions.md         → full Xano function stack
  sheets/sheets-setup.md             → Google Sheets one-time setup + write logic
  flow/engine-flow.md                → this file, the full system map
  Makefile                           → team command shortcuts
  .gitignore                         → blocks secrets and OS files from commits

scripts/apollo-head-snippet.html
html

Copy
<!--
  Apollo.io Website Visitor Tracking Script
  xano-apollo-webflow-engine / XYZ

  INSTRUCTIONS:
  1. Do NOT edit the contents of the script tag below
  2. Copy your actual snippet from Apollo:
     Settings → Ideal Customer Profile → Website Visitors → Copy Code
  3. Replace the placeholder script below with your copied version
  4. Paste into Webflow: Site Settings → Custom Code → Head Code
  5. Save → Publish to LIVE domain only (not staging)

  Apollo manages this script — never modify it manually.
-->

<!-- START Apollo Tracking Script -->
<script>
  /* REPLACE THIS COMMENT BLOCK WITH YOUR ACTUAL APOLLO SNIPPET
     It will look something like this structure:

     !function(e,t,n,i,u,a,s){...}(window,document,"script",
     "https://assets.apollo.io/...", "YOUR_UNIQUE_KEY");

     Copy it exactly as Apollo generates it — do not retype it.
  */
</script>
<!-- END Apollo Tracking Script -->
webflow/deployment-notes.md
text

Copy
# Webflow Deployment Notes
# xano-apollo-webflow-engine / XYZ

---

## Before You Start

Make sure you have:
  - Your Apollo tracking snippet copied from Apollo
    (Settings → Ideal Customer Profile → Website Visitors → Copy Code)
  - Editor or Admin access to XYZ's Webflow site settings
  - XYZ's live domain already added in Apollo under Website Visitors

---

## Step-by-Step Deployment

### Step 1 — Open Webflow Site Settings

  Go to webflow.com → log in
  Hover over the XYZ site card
  Click the gear icon (top right of the card) → Site Settings

### Step 2 — Find the Head Code Section

  Inside Site Settings → click the Custom Code tab
  Scroll to the Head Code section
  You may already have other scripts here (Google Analytics, GTM, etc.)
  That's fine — they won't interfere

### Step 3 — Paste the Apollo Snippet

  Click into the Head Code text area
  Go to the last line of any existing code
  Hit Enter to create a new line
  Paste the Apollo snippet exactly as copied
  Click Save Changes

### Step 4 — Publish to Live Domain

  Click the Publish button (top right in Webflow)
  Click Publish to Selected Domains
  Select ONLY the live domain (e.g. xyz.com)

  Do NOT publish to staging only — Apollo cannot validate
  or track from a staging URL. It must be the live domain.

### Step 5 — Verify in Apollo

  Go back to Apollo
  Website Visitors → Settings → click Test Connection
  Wait about 60 seconds
  Status should show a green "Active" indicator

  If it doesn't flip to Active after 2 minutes:
  → Double-check you published to the live domain
  → Open Chrome DevTools on the live site
    Sources tab → confirm assets.apollo.io appears
    Network tab → reload → search "track_request" → should return 204

---

## If You Already Have Scripts in Head Code

  Paste Apollo's snippet below all existing scripts
  Do not wrap it in any conditional logic
  Do not modify the snippet contents

---

## Cookie Consent Banner

  If XYZ's site has a cookie consent banner:
  → Configure it so Apollo's script fires ONLY after consent is granted
  → Classify Apollo under Analytics or Marketing in your
    consent management platform settings
  → If not configured, Apollo may track visitors before consent
    is given — which can be a legal issue depending on your audience

---

## Single-Page App Note

  Webflow standard sites are fine with the direct head paste.
  If XYZ's Webflow site uses custom interactions or SPA-style
  page transitions where the page doesn't fully reload on navigation:
  → Deploy via Google Tag Manager instead
  → Set the trigger to fire on All Pages AND on route/history changes
  → This ensures Apollo tracks every page visit, not just the first load

---

## Rollback

  If something breaks after publishing:
  → Webflow → Site Settings → Publishing → restore a previous version
  → Remove the Apollo snippet from Head Code → Save → Republish
  → The Apollo connection will go inactive but nothing else will break

---

## Checklist

  [ ] Apollo snippet copied from Apollo (not retyped)
  [ ] Pasted into Webflow Head Code on a new line
  [ ] Saved in Webflow
  [ ] Published to live domain (not staging)
  [ ] Test Connection clicked in Apollo
  [ ] Status shows Active in Apollo
  [ ] track_request returning 204 in DevTools (optional but recommended)
  [ ] Cookie consent configured if applicable
  
That's the full repo complete. Here's a summary of every file and its job:

README.md
Full project overview, flow, setup, troubleshooting
.gitignore
Blocks secrets and OS junk from commits
Makefile
Team command shortcuts
flow/engine-flow.md
Full system map and data field reference
scripts/apollo-head-snippet.html
Apollo snippet placeholder + instructions
webflow/deployment-notes.md
Step-by-step Webflow deploy + checklist
xano/agent-instructions.md
Full Xano function stack
sheets/sheets-setup.md
Google Sheets one-time setup + write logic

Issue #1 — Deploy Apollo Tracking Script to Webflow
Label: setup webflow Priority: High — nothing works until this is done


Title: Deploy Apollo tracking script to Webflow live domain

## What
Paste the Apollo visitor tracking snippet into Webflow's Head Code
section and publish to the live XYZ domain.

## Steps
- [ ] Log into Apollo → Settings → Ideal Customer Profile →
      Website Visitors → Copy Code
- [ ] Log into Webflow → Site Settings → Custom Code → Head Code
- [ ] Paste snippet on a new line below existing scripts
- [ ] Save Changes
- [ ] Publish to live domain only (not staging)

## Done When
Apollo → Website Visitors → Settings → Test Connection
shows green "Active" status.

## Reference
webflow/deployment-notes.md
Issue #2 — Verify Apollo Domain is Added for XYZ
Label: setup apollo Priority: High — must be done before or alongside Issue #1


Title: Add and verify XYZ live domain in Apollo Website Visitors

## What
Make sure XYZ's live domain is registered in Apollo so it knows
what site to track. Without this the script has nothing to report to.

## Steps
- [ ] Apollo → Website Visitors → Add Website
- [ ] Enter full live domain URL (e.g. https://xyz.com)
- [ ] Choose tracking type:
      Company only  OR  Company & Person (paid plan required for person)
- [ ] Acknowledge cookie and data collection policy
- [ ] Save
- [ ] Confirm domain appears in the list with a pending/active status

## Done When
Domain is listed in Apollo Website Visitors and status moves
to Active after script deployment in Issue #1.

## Reference
README.md → Prerequisites
Issue #3 — Confirm Apollo API Key in Xano
Label: setup xano Priority: High — Xano agent cannot run without this


Title: Confirm Apollo API key is correctly stored in Xano env vars

## What
The Apollo API key was added to Xano a few weeks ago. Confirm it's
still valid, in the right place, and correctly named before building
the agent function stack.

## Steps
- [ ] Xano Dashboard → Settings → Environment Variables
      Look for: APOLLO_API_KEY
- [ ] If not there → check Xano Dashboard → Secrets
- [ ] Test the key is still valid:
      Make a test GET request to https://api.apollo.io/v1/website_visitors
      with header x-api-key: {{env.APOLLO_API_KEY}}
      Should return 200, not 401
- [ ] If 401 → regenerate key in Apollo:
      Settings → Integrations → API Keys → create new → update in Xano

## Done When
Test API call returns 200 with valid response data.

## Reference
xano/agent-instructions.md → Authentication
Issue #4 — Set Up Google Sheet for Lead Output
Label: setup sheets Priority: Medium — needed before first agent run


Title: Create and configure XYZ Leads Google Sheet

## What
Create the Google Sheet that the Xano agent will write enriched
lead records into after each daily run.

## Steps
- [ ] Create a new Google Sheet named "XYZ Leads"
- [ ] Set up Row 1 headers in this exact order:
      A: visit_date
      B: company
      C: domain
      D: contact_name
      E: contact_title
      F: contact_email
      G: intent
      H: source
- [ ] Set up Google Cloud Service Account:
      console.cloud.google.com → APIs & Services →
      Enable Google Sheets API →
      IAM & Admin → Service Accounts → Create →
      Name: xano-sheets-writer →
      Keys → Add Key → JSON → download
- [ ] Share the sheet with the service account email
      (ends in @...gserviceaccount.com) → Editor access
- [ ] Add to Xano Environment Variables:
      GOOGLE_JSON_KEY → paste full JSON file contents
      GOOGLE_SHEET_ID → ID from sheet URL (between /d/ and /edit)

## Done When
Xano can authenticate with Google and the sheet is ready to receive rows.

## Reference
sheets/sheets-setup.md
Issue #5 — Build Xano Agent Function Stack
Label: xano agent Priority: Medium — depends on Issues #3 and #4 being done first


Title: Build Xano agent function stack for Apollo → Sheets pipeline

## What
Build the full Xano agent that runs daily, pulls visitor data from
Apollo, enriches it, and writes leads to the Google Sheet.

## Steps
- [ ] Install Google Service Account snippet from Xano snippet library
- [ ] Create new API endpoint or background task in Xano
- [ ] Build function stack:
      Step 1 — GET apollo.io/v1/website_visitors
               Header: x-api-key → {{env.APOLLO_API_KEY}}
      Step 2 — For each visitor:
               POST apollo.io/v1/people/search
               Body: { "q_organization_domains": [visitor.domain] }
      Step 3 — Score intent: high / medium / low
      Step 4 — Write to Xano leads table
      Step 5 — Append row to Google Sheet via Sheets API
      Step 6 (optional) — Push high-intent contacts to Apollo sequence
- [ ] Add 1–2 second Delay between loop iterations (avoid 429 errors)
- [ ] Set as Background Task with daily schedule
- [ ] Run once manually to confirm rows appear in Google Sheet

## Done When
Agent runs successfully, leads table is populated in Xano,
and new rows appear in XYZ Leads Google Sheet.

## Reference
xano/agent-instructions.md
sheets/sheets-setup.md → How Xano Writes to the Sheet
Issue #6 — First Live Agent Run and QA
Label: qa launch Priority: Low — final step, do after all others are closed


Title: Run agent for first time and QA full pipeline end to end

## What
With everything in place, do a full end-to-end test of the engine
from Webflow visit through to Google Sheet row.

## Steps
- [ ] Visit XYZ's live site from a known company network or VPN
      (so Apollo can identify the company)
- [ ] Wait up to 24 hours for Apollo to register the visit
- [ ] Trigger the Xano agent manually (don't wait for schedule)
- [ ] Confirm visitor appears in Apollo Website Visitors
- [ ] Confirm enriched record written to Xano leads table
- [ ] Confirm new row appears in XYZ Leads Google Sheet
- [ ] Check all 8 columns are populated correctly
- [ ] Enable daily schedule on the Xano background task
- [ ] Run make check from repo root as final sanity check

## Done When
Full pipeline confirmed working end to end.
Daily schedule enabled.
Team notified the engine is live.

## Reference
flow/engine-flow.md
Makefile → make check
Suggested Order to Close Issues
#2 → #1 → #3 → #4 → #5 → #6
The exact sequence: domain first, then script, then confirm the key, then sheet, then build the agent, then QA the whole thing live.

GitHub Project Board
Board Name: xano-apollo-webflow-engine Layout: Table + Board view (Kanban)

Columns
📋 Backlog
Everything not started yet
🔧 In Progress
Actively being worked on
🔍 Needs Review
Done but needs a check
✅ Done
Closed and confirmed working
🚫 Blocked
Waiting on something external
Issues mapped to board at start
#2 Verify Apollo domain
🔧 In Progress
Do this first
#1 Deploy Webflow script
📋 Backlog
Unblock after #2
#3 Confirm API key in Xano
📋 Backlog
Can run parallel to #1
#4 Set up Google Sheet
📋 Backlog
Unblock after #3
#5 Build Xano agent
📋 Backlog
Needs #3 and #4 done
#6 QA full pipeline
📋 Backlog
Final step
Custom Fields to add to each Issue card
Priority
Single select
🔴 High / 🟡 Medium / 🟢 Low
Owner
Person
assign to team member
Depends On
Text
e.g. "Needs #3 closed first"
Est. Time
Text
e.g. "30 min"
Pinned Board Description

Tracks all setup and launch tasks for the XYZ Apollo → Webflow → Xano →
Google Sheets lead engine. Work top to bottom: domain → script → API key
→ sheet → agent → QA. Close #2 and #1 before touching anything in Xano.


