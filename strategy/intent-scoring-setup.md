# Apollo Intent Scoring Setup
# xano-apollo-webflow-engine / XYZ

---

## What This Does

Tells Apollo which pages on XYZ's site indicate strong buying intent.
Visitors to high-intent pages get flagged automatically so the Xano
agent can prioritize them in the Google Sheet output.

---

## Where to Configure This in Apollo

  Apollo → Website Visitors → click Edit on XYZ's domain
  → Advanced Intent Settings → Add new

---

## Recommended Intent Rules

  Add one rule per page. Adjust URLs to match XYZ's actual site structure.

  | Page              | URL Pattern        | Intent Level |
  |-------------------|--------------------|--------------|
  | Pricing           | /pricing           | High         |
  | Contact / Book    | /contact           | High         |
  | Book a call       | /book              | High         |
  | Case studies      | /case-studies      | High         |
  | Individual case   | /case-studies/*    | High         |
  | Services overview | /services          | Medium       |
  | Individual service| /services/*        | Medium       |
  | About page        | /about             | Medium       |
  | Blog articles     | /blog/*            | Low          |
  | Homepage          | /                  | Low          |

  Save after adding each rule.

---

## How This Flows into Xano

  The intent level Apollo assigns maps directly to the
  intent_label variable in the Xano agent function stack.

  In the Xano agent (Block 3b — Score Intent):

    if visitor.intent_strength = "high"   → intent_label = "high"
    if visitor.intent_strength = "medium" → intent_label = "medium"
    default                               → intent_label = "low"

  In the Google Sheet column G (intent):
    High intent rows should be reviewed same day
    Medium intent rows reviewed weekly
    Low intent rows reviewed monthly or ignored

---

## Optional — Google Sheet Conditional Formatting

  To highlight high-intent rows automatically in the sheet:

  Google Sheets → Format → Conditional Formatting
  Apply to range: G2:G1000
  Format rules:

    Rule 1:
      Condition: Text is exactly → high
      Format: green background, bold text

    Rule 2:
      Condition: Text is exactly → medium
      Format: yellow background

    Rule 3:
      Condition: Text is exactly → low
      Format: no fill (default)

---

## Notes

  - Update intent rules whenever XYZ adds new high-value pages
  - /pricing and /contact are almost always the strongest signals
  - If XYZ runs paid ads to a landing page, add that URL as High intent
  - Intent scoring works at company level on all plans and at person
    level on paid plans for U.S.-based visitors
