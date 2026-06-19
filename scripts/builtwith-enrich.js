// builtwith-enrich.js
// Option 2: BuiltWith export → Apollo enrichment → Google Sheets.
//
// How to get the input file:
//   1. Go to builtwith.com → Technology Lookup
//   2. Search "Klaviyo" — filter by country (UK, Sweden, Norway, Denmark,
//      Finland, Netherlands, Germany, Estonia, Latvia, Lithuania)
//   3. Export CSV (requires BuiltWith paid plan — starts ~$50/mo)
//   4. Save as input/builtwith-export.csv
//
// The script filters for brands that also use Shopify (strong ICP signal),
// then enriches each domain via Apollo and writes to Google Sheets.
//
// Usage: node builtwith-enrich.js
// Env:   APOLLO_API_KEY, GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_JSON

const { google } = require('googleapis');
const fs         = require('fs');
const path       = require('path');

const APOLLO_KEY   = process.env.APOLLO_API_KEY;
const SHEET_ID     = process.env.GOOGLE_SHEET_ID;
const SERVICE_JSON = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

const CSV_PATH = path.join(__dirname, '..', 'input', 'builtwith-export.csv');

const TARGET_COUNTRIES = ['United Kingdom', 'Sweden', 'Norway', 'Denmark', 'Finland',
  'Netherlands', 'Germany', 'Estonia', 'Latvia', 'Lithuania', 'Ireland'];

if (!APOLLO_KEY || !SHEET_ID || !SERVICE_JSON) {
  console.error('Missing env vars: APOLLO_API_KEY, GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_JSON');
  process.exit(1);
}

function parseBuiltWith() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error('input/builtwith-export.csv not found.');
    console.error('Export from builtwith.com → Technology Lookup → Klaviyo → Export CSV');
    process.exit(1);
  }

  const lines  = fs.readFileSync(CSV_PATH, 'utf8').trim().split('\n');
  const header = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());

  const domainIdx  = header.findIndex(h => h.includes('domain'));
  const countryIdx = header.findIndex(h => h.includes('country'));
  const techIdx    = header.findIndex(h => h.includes('tech') || h.includes('categor'));

  const domains = [];

  for (const line of lines.slice(1)) {
    const cols    = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    const domain  = cols[domainIdx]  || '';
    const country = cols[countryIdx] || '';
    const techs   = cols[techIdx]    || '';

    if (!domain) continue;

    const inGeo      = TARGET_COUNTRIES.some(c => country.toLowerCase().includes(c.toLowerCase()));
    const hasShopify = techs.toLowerCase().includes('shopify');

    if (inGeo && hasShopify) domains.push(domain);
  }

  return [...new Set(domains)];
}

async function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: SERVICE_JSON,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

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

async function main() {
  console.log('Starting BuiltWith → Apollo enrichment...');

  const domains = parseBuiltWith();
  console.log(`Klaviyo + Shopify brands in target geos: ${domains.length}`);

  if (domains.length === 0) {
    console.log('No matching domains after filtering. Check country names and tech columns in your CSV.');
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
        new Date().toISOString().split('T')[0],
        org.name                                             || '',
        domain,
        person.name                                          || '',
        person.title                                         || '',
        person.email                                         || '',
        'builtwith_klaviyo',
        person.phone_numbers?.[0]?.sanitized_number          || '',
        org.num_employees                                    || '',
        org.annual_revenue_printed                           || '',
        org.industry                                         || '',
        [org.city, org.country].filter(Boolean).join(', ')  || '',
        org.linkedin_url                                     || '',
        org.primary_domain                                   || '',
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
