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
