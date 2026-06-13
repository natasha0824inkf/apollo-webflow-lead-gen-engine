// apollo-enrich.js
// Pulls Apollo website visitors, enriches contacts + company data,
// appends rows to Google Sheet. Runs via GitHub Actions cron.
// No Xano required.

const { google } = require('googleapis');

const APOLLO_KEY   = process.env.APOLLO_API_KEY;
const SHEET_ID     = process.env.GOOGLE_SHEET_ID;
const SERVICE_JSON = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

if (!APOLLO_KEY || !SHEET_ID || !SERVICE_JSON) {
  console.error('Missing required env vars: APOLLO_API_KEY, GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_JSON');
  process.exit(1);
}

// --- Google Sheets auth ---

async function getAuth() {
  const auth = new google.auth.GoogleAuth({
    credentials: SERVICE_JSON,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return auth;
}

// --- Apollo API calls ---

async function getVisitors() {
  const res = await fetch('https://api.apollo.io/v1/website_visitors', {
    headers: {
      'x-api-key': APOLLO_KEY,
      'Content-Type': 'application/json',
    },
  });
  if (res.status === 401) throw new Error('Apollo 401 — API key invalid or expired');
  if (res.status === 403) throw new Error('Apollo 403 — plan does not include Website Visitors API');
  if (res.status === 404) throw new Error('Apollo 404 — Website Visitors API not available on this plan/key scope');
  if (!res.ok) throw new Error(`Apollo visitors: HTTP ${res.status}`);
  const data = await res.json();
  return data.website_visitors || [];
}

async function enrichContacts(domain) {
  const res = await fetch('https://api.apollo.io/v1/people/search', {
    method: 'POST',
    headers: {
      'x-api-key': APOLLO_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      q_organization_domains: [domain],
      per_page: 1,
    }),
  });
  if (!res.ok) return { people: [] };
  return res.json();
}

async function enrichCompany(domain) {
  const res = await fetch('https://api.apollo.io/v1/organizations/enrich', {
    method: 'POST',
    headers: {
      'x-api-key': APOLLO_KEY,
      'Content-Type': 'application/json',
    },
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

// --- Intent scoring ---

function scoreIntent(strength) {
  if (strength === 'high') return 'high';
  if (strength === 'medium') return 'medium';
  return 'low';
}

// --- Rate limit helper ---

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// --- Main ---

async function main() {
  console.log('Starting Apollo lead enrichment...');

  const auth = await getAuth();
  const visitors = await getVisitors();

  console.log(`Visitors found: ${visitors.length}`);

  if (visitors.length === 0) {
    console.log('No visitors to process. Done.');
    return;
  }

  let success = 0;
  let failed = 0;

  for (const visitor of visitors) {
    try {
      const [contacts, company] = await Promise.all([
        enrichContacts(visitor.domain),
        enrichCompany(visitor.domain),
      ]);

      const person = contacts.people?.[0] || {};
      const org    = company.organization  || {};

      const row = [
        visitor.last_visited_at                              || '',  // A: visit_date
        visitor.name                                         || '',  // B: company
        visitor.domain                                       || '',  // C: domain
        person.name                                          || '',  // D: contact_name
        person.title                                         || '',  // E: contact_title
        person.email                                         || '',  // F: contact_email
        scoreIntent(visitor.intent_strength),                        // G: intent
        'apollo_visitor',                                            // H: source
        person.phone_numbers?.[0]?.sanitized_number          || '',  // I: phone
        org.num_employees                                    || '',  // J: employee_count
        org.annual_revenue_printed                           || '',  // K: revenue_range
        org.industry                                         || '',  // L: industry
        [org.city, org.country].filter(Boolean).join(', ')  || '',  // M: hq_location
        visitor.visits_count                                 || '',  // N: visit_count
      ];

      await appendRow(auth, row);
      console.log(`✓ ${visitor.domain}`);
      success++;
    } catch (err) {
      console.error(`✗ ${visitor.domain}: ${err.message}`);
      failed++;
    }

    await sleep(1500);
  }

  console.log(`Done — ${success} written, ${failed} failed`);
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
