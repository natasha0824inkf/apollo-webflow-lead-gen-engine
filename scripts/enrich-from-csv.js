// enrich-from-csv.js
// Option 3: CSV seed + automated enrichment — no visitor API needed.
// Drop domain names into input/domains.csv, run this script,
// get enriched rows written to Google Sheets.
//
// Works today with existing Apollo + Google Sheets credentials.
// Domains can come from anywhere: manual research, DTC newsletters,
// Instagram ads, LinkedIn, BuiltWith exports, etc.
//
// Usage: node enrich-from-csv.js
// Env:   APOLLO_API_KEY, GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_JSON

const { google } = require('googleapis');
const fs         = require('fs');
const path       = require('path');

const APOLLO_KEY   = process.env.APOLLO_API_KEY;
const SHEET_ID     = process.env.GOOGLE_SHEET_ID;
const SERVICE_JSON = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

const CSV_PATH = path.join(__dirname, '..', 'input', 'domains.csv');

if (!APOLLO_KEY || !SHEET_ID || !SERVICE_JSON) {
  console.error('Missing env vars: APOLLO_API_KEY, GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_JSON');
  process.exit(1);
}

// --- Parse CSV ---

function readDomains() {
  const lines = fs.readFileSync(CSV_PATH, 'utf8').trim().split('\n');
  return lines.slice(1).map(l => l.trim()).filter(Boolean);
}

// --- Google Sheets auth ---

async function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: SERVICE_JSON,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

// --- Apollo enrichment ---

async function enrichContact(domain) {
  const res = await fetch('https://api.apollo.io/v1/people/search', {
    method: 'POST',
    headers: { 'x-api-key': APOLLO_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      q_organization_domains: [domain],
      person_titles: ['founder', 'co-founder', 'ceo', 'head of email', 'email marketing manager', 'cmo', 'director of marketing', 'ecommerce manager'],
      per_page: 1,
    }),
  });
  if (!res.ok) return { people: [] };
  return res.json();
}

async function enrichCompany(domain) {
  const res = await fetch('https://api.apollo.io/v1/organizations/enrich', {
    method: 'POST',
    headers: { 'x-api-key': APOLLO_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain }),
  });
  if (!res.ok) return { organization: {} };
  return res.json();
}

// --- Google Sheets write ---

async function appendRow(auth, row) {
  const sheets = google.sheets({ version: 'v4', auth });
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'Sheet1!A:N',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// --- Main ---

async function main() {
  console.log('Starting CSV-seeded lead enrichment...');

  const domains = readDomains();
  console.log(`Domains to enrich: ${domains.length}`);

  if (domains.length === 0) {
    console.log('input/domains.csv is empty. Add domain names (one per line) and re-run.');
    return;
  }

  const auth = await getAuth();
  let success = 0;
  let failed  = 0;

  for (const domain of domains) {
    try {
      const [contacts, company] = await Promise.all([
        enrichContact(domain),
        enrichCompany(domain),
      ]);

      const person = contacts.people?.[0] || {};
      const org    = company.organization  || {};

      const row = [
        new Date().toISOString().split('T')[0],                      // A: date_added
        org.name                                             || '',   // B: company
        domain,                                                       // C: domain
        person.name                                          || '',   // D: contact_name
        person.title                                         || '',   // E: contact_title
        person.email                                         || '',   // F: contact_email
        'manual_seed',                                                // G: source
        person.phone_numbers?.[0]?.sanitized_number          || '',   // H: phone
        org.num_employees                                    || '',   // I: employee_count
        org.annual_revenue_printed                           || '',   // J: revenue_range
        org.industry                                         || '',   // K: industry
        [org.city, org.country].filter(Boolean).join(', ')  || '',   // L: hq_location
        org.linkedin_url                                     || '',   // M: linkedin
        org.primary_domain                                   || '',   // N: primary_domain
      ];

      await appendRow(auth, row);
      console.log(`✓ ${domain} — ${person.name || 'no contact found'}`);
      success++;
    } catch (err) {
      console.error(`✗ ${domain}: ${err.message}`);
      failed++;
    }

    await sleep(1500);
  }

  console.log(`Done — ${success} enriched, ${failed} failed`);
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
