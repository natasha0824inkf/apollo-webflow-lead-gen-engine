// google-stack-hunter.js
// Chaos branch — zero Apollo, zero Xano, zero paid APIs required.
//
// Two data sources:
//   1. Reddit JSON API (no key) — finds DTC brand owners/founders
//      discussing email marketing pain points in relevant subreddits
//   2. Google Custom Search API (free key, 100 queries/day) — finds
//      Shopify + Klaviyo stores in target EU/Nordics/Baltics geos
//
// For each result, scrapes the brand's contact page for a public email.
// Falls back to generic patterns (hello@, info@, contact@) if nothing found.
//
// Output: output/leads.csv + optional Google Sheets append
//
// Usage:
//   node google-stack-hunter.js              — Reddit only (no keys needed)
//   node google-stack-hunter.js --google     — + Google CSE (needs keys)
//   node google-stack-hunter.js --sheets     — + write to Google Sheets
//
// Env (optional):
//   GOOGLE_CSE_API_KEY          — Google Custom Search API key
//   GOOGLE_CSE_ID               — Custom Search Engine ID
//   GOOGLE_SHEET_ID             — Sheet ID for --sheets mode
//   GOOGLE_SERVICE_ACCOUNT_JSON — Service account JSON for --sheets mode

const fs   = require('fs');
const path = require('path');

const QUERIES    = require('../config/hunter-queries.json');
const OUTPUT_DIR = path.join(__dirname, '..', 'output');
const CSV_PATH   = path.join(OUTPUT_DIR, 'leads.csv');

const USE_GOOGLE = process.argv.includes('--google');
const USE_SHEETS = process.argv.includes('--sheets');

// --- Helpers ---

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function extractEmails(text) {
  const matches = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) || [];
  return matches.filter(e =>
    !e.match(/\.(png|jpg|gif|css|js|svg|woff)/i) &&
    !e.includes('sentry') &&
    !e.includes('example')
  );
}

function extractDomain(url) {
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

// --- Source 1: Reddit (no API key) ---

async function searchReddit() {
  const leads = [];
  const { subreddits, intent_keywords, filter_keywords } = QUERIES.reddit;

  for (const sub of subreddits) {
    for (const kw of intent_keywords) {
      try {
        const url = `https://www.reddit.com/r/${sub}/search.json?q=${encodeURIComponent(kw)}&restrict_sr=1&sort=new&limit=25`;
        const res = await fetch(url, { headers: { 'User-Agent': 'lead-hunter/1.0' } });
        if (!res.ok) continue;

        const data  = await res.json();
        const posts = data?.data?.children || [];

        for (const { data: post } of posts) {
          const title     = (post.title || '').toLowerCase();
          const hasIntent = filter_keywords.some(f => title.includes(f));
          if (!hasIntent) continue;

          leads.push({
            source: `reddit/r/${sub}`,
            signal: kw,
            author: post.author || '',
            title:  post.title  || '',
            url:    `https://reddit.com${post.permalink}`,
            domain: '',
            email:  '',
            note:   'manual follow-up — find brand in profile/comments',
          });
        }

        await sleep(800);
      } catch (err) {
        console.error(`Reddit ${sub}/${kw}: ${err.message}`);
      }
    }
  }

  return leads;
}

// --- Source 2: Google Custom Search (free key, 100 req/day) ---

async function searchGoogle() {
  const key = process.env.GOOGLE_CSE_API_KEY;
  const cx  = process.env.GOOGLE_CSE_ID;

  if (!key || !cx) {
    console.log('⚠  GOOGLE_CSE_API_KEY or GOOGLE_CSE_ID not set — skipping Google search');
    console.log('   Get a free key at console.developers.google.com (100 queries/day free)');
    return [];
  }

  const leads = [];

  for (const query of QUERIES.google.queries) {
    try {
      const url = `https://www.googleapis.com/customsearch/v1?key=${key}&cx=${cx}&q=${encodeURIComponent(query)}&num=10`;
      const res = await fetch(url);
      if (!res.ok) { console.error(`Google CSE error: ${res.status}`); continue; }

      const data  = await res.json();
      const items = data.items || [];

      for (const item of items) {
        const domain = extractDomain(item.link || item.displayLink || '');
        if (!domain) continue;

        const email = await scrapeContactEmail(domain);

        leads.push({
          source: 'google_cse',
          signal: query,
          author: '',
          title:  item.title || '',
          url:    item.link  || '',
          domain,
          email,
          note: '',
        });

        await sleep(1000);
      }

      await sleep(1200);
    } catch (err) {
      console.error(`Google query failed: ${err.message}`);
    }
  }

  return leads;
}

// --- Contact page email scraper ---

async function scrapeContactEmail(domain) {
  for (const p of QUERIES.contact_paths) {
    try {
      const res = await fetch(`https://${domain}${p}`, {
        signal: AbortSignal.timeout(5000),
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      if (!res.ok) continue;

      const html   = await res.text();
      const emails = extractEmails(html);

      const priority = emails.find(e => /^(hello|hi|contact|info|team|studio)@/i.test(e));
      if (priority) return priority;
      if (emails[0]) return emails[0];
    } catch {
      // timeout or refused — try next path
    }
  }

  return `hello@${domain}`;
}

// --- CSV writer ---

function writeCsv(leads) {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const header = 'source,signal,author,title,url,domain,email,note';
  const rows   = leads.map(l =>
    [l.source, l.signal, l.author, l.title, l.url, l.domain, l.email, l.note]
      .map(v => `"${String(v).replace(/"/g, '""')}"`)
      .join(',')
  );

  fs.writeFileSync(CSV_PATH, [header, ...rows].join('\n'));
  console.log(`\n✓ ${leads.length} leads written to ${CSV_PATH}`);
}

// --- Optional: Google Sheets append ---

async function writeToSheets(leads) {
  if (!process.env.GOOGLE_SHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    console.log('⚠  Sheets env vars not set — skipping Sheets write');
    return;
  }

  const { google } = require('googleapis');
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  const values = leads.map(l => [
    new Date().toISOString().split('T')[0],
    l.source, l.signal, l.author, l.title, l.url, l.domain, l.email, l.note,
  ]);

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: 'ChaosLeads!A:I',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });

  console.log(`✓ ${leads.length} rows appended to Google Sheets (ChaosLeads tab)`);
}

// --- Main ---

async function main() {
  console.log('Starting Google Stack Hunter...\n');
  console.log('Sources:', ['Reddit (always)', USE_GOOGLE && 'Google CSE', USE_SHEETS && 'Google Sheets'].filter(Boolean).join(', '));
  console.log('');

  const redditLeads = await searchReddit();
  console.log(`Reddit: ${redditLeads.length} intent signals found`);

  const googleLeads = USE_GOOGLE ? await searchGoogle() : [];
  if (USE_GOOGLE) console.log(`Google CSE: ${googleLeads.length} stores found`);

  const all = [...redditLeads, ...googleLeads];

  writeCsv(all);

  if (USE_SHEETS) await writeToSheets(all);

  console.log('\nNext step: open output/leads.csv, qualify top 10 manually, add domains to input/domains.csv for full enrichment');
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
