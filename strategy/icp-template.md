# ICP and Outbound Strategy
# xano-apollo-webflow-engine / XYZ

---

## Context

The Apollo tracking engine is live and working. Current visitor volume
is too low to generate consistent inbound leads passively. This doc
covers how to drive the right traffic to the site and use Apollo's
outbound database to build pipeline now while inbound compounds.

---

## The Problem with Waiting

Apollo can only identify visitors who arrive. It cannot create them.
Current traffic is mostly:
  - Competitors checking the site
  - Agencies prospecting XYZ
  - Random low-intent browsing

None of these are buyers. The fix is two-pronged:
  1. Outbound — go find ideal clients in Apollo and bring them in
  2. Inbound — create reasons for the right people to visit organically

---

## Ideal Client Profile (ICP)

Fill this out for XYZ before building any Apollo search or sequence.

  Industry:         [your target sector]
  Company size:     [employee range e.g. 50-500]
  Revenue range:    [e.g. $5M-$100M]
  Location:         [target countries or regions]
  Decision maker:   [job title e.g. CEO, Head of Operations, VP Sales]
  Pain they have:   [what problem does XYZ solve for them]
  Bad fit signals:  [who to exclude e.g. competitors, agencies, students]

---

## Building an ICP List in Apollo

  Apollo → Search → People (for contact-first)
  OR
  Apollo → Search → Companies (for account-first)

  Recommended filters to start:

    Industry          → [your target]
    Headcount         → [your sweet spot range]
    Job Title         → [decision maker title]
    Location          → [your target region]
    Technologies Used → [relevant tech stack if applicable]

  Save the search as a list:
    → Save to List → name it "XYZ ICP Outbound — [Month Year]"

  Start with 50-100 contacts. Do not blast thousands until
  the sequence copy is proven.

---

## Outbound Sequence Structure

  Build this in Apollo → Sequences → New Sequence

  Step 1 — Email (Day 1)
    Subject: quick question re [their company]
    Keep it under 5 lines. One specific observation about their
    business. One relevant outcome XYZ delivers. One soft CTA.
    No attachments. No pitch decks. No "I hope this finds you well."

  Step 2 — LinkedIn connect (Day 3)
    Short note only. Reference the email if they opened it.
    No pitch in the connection request.

  Step 3 — Email follow-up (Day 7)
    Two lines max. Reply to the original thread.
    Different angle — lead with a result or case study snippet.

  Step 4 — LinkedIn message (Day 14)
    Only if connected. One line. Ask a genuine question about
    their current situation.

  Step 5 — Final email (Day 21)
    Break-up email. Short, no hard feelings, leave the door open.
    These often get the highest reply rate.

  When they click a link and visit the site:
    → Apollo flags them as a website visitor
    → Xano agent picks them up on next daily run
    → Lead appears in Google Sheet with full context
    → Now you have a warm visitor with email history — follow up fast

---

## Key Metrics to Track

  Add these as columns to the XYZ Leads Google Sheet
  or track separately in Apollo analytics:

    Sequence open rate        target: >40%
    Reply rate                target: >5%
    Site visits from sequence track via Apollo visitor source
    Leads generated per week  track in Google Sheet
    Conversion to call        track manually

---

## Notes

  - Do not add anyone to a sequence without verifying the email
    is valid — Apollo shows a confidence score on each contact
  - Personalize at least the first line of every email
  - Review the sequence after 50 sends and adjust based on
    open and reply data before scaling up
  - Never send more than 50 cold emails per domain per day
    to protect XYZ's sending reputation
