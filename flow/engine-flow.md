# Engine Flow — Full System Map
# xano-apollo-webflow-engine / XYZ

---

## End-to-End Flow

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

## Data Fields at Each Stage

  From Apollo website_visitors call:
    - company_name         (visitor.name)
    - domain               (visitor.domain)
    - intent_level         (visitor.intent_strength → high / medium / low)
    - last_visited_at      (visitor.last_visited_at)
    - visit_count          (visitor.visits_count)

  Added after people/search enrichment:
    - contact_name         (enriched_contacts.people[0].name)
    - contact_title        (enriched_contacts.people[0].title)
    - contact_email        (enriched_contacts.people[0].email)
    - phone                (enriched_contacts.people[0].phone_numbers[0].sanitized_number)
    - contact_id           (enriched_contacts.people[0].id)

  Added after organizations/enrich:
    - employee_count       (company_data.organization.num_employees)
    - revenue_range        (company_data.organization.annual_revenue_printed)
    - industry             (company_data.organization.industry)
    - hq_location          (company_data.organization.city + country)

  Written to Xano leads table and Google Sheet:
    - all fields above
    - source               = "apollo_visitor"
    - run_date             = now()

---

## Google Sheet Column Map

  A: visit_date
  B: company
  C: domain
  D: contact_name
  E: contact_title
  F: contact_email
  G: intent
  H: source
  I: phone
  J: employee_count
  K: revenue_range
  L: industry
  M: hq_location
  N: visit_count

---

## Environment Variables Required in Xano

  APOLLO_API_KEY      → Apollo.io API key
  GOOGLE_JSON_KEY     → Google service account JSON (full file contents)
  GOOGLE_SHEET_ID     → ID from the XYZ Leads Sheet URL (between /d/ and /edit)

  All live in: Xano Dashboard → Settings → Environment Variables

---

## Files in This Repo and What They Do

  scripts/apollo-head-snippet.html   → paste into Webflow head
  webflow/deployment-notes.md        → how to deploy and verify in Webflow
  xano/agent-instructions.md         → full Xano function stack
  xano/claude-agent-instructions.md  → Claude system prompt for this project
  sheets/sheets-setup.md             → Google Sheets one-time setup + write logic
  flow/engine-flow.md                → this file, the full system map
  strategy/icp-template.md           → blank ICP and outbound template
  strategy/icp-xyz-email-agency.md   → XYZ-specific ICP, sequences, and filters
  strategy/intent-scoring-setup.md   → Apollo page intent configuration
  Makefile                           → team command shortcuts
  .gitignore                         → blocks secrets and OS files from commits
