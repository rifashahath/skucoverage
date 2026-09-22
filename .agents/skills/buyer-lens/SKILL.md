---
name: buyer-lens
description: Audit a product, SaaS, or ecommerce site the way a real prospective customer would — first roleplay the buyer's unfiltered inner monologue as they move through the page, then switch to a cold conversion auditor and deliver a verdict on whether they'd buy, what killed the sale, and exactly what to change. Use this whenever the user wants to know how customers perceive their site, whether a landing or pricing page converts, why visitors aren't signing up or paying, or wants a UI/UX/copy review from the customer's point of view. Trigger even when the user never says "audit" — "would you buy this", "does this look trustworthy", "why is nobody converting", "review my landing page", "check my pricing page", "what do customers think of this", or simply pasting a URL or screenshot of something they're selling all belong here. Also trigger for app store listings, checkout flows, onboarding screens, and cold-outreach landing pages.
---

# Buyer Lens

Audit a commercial page through the eyes of the person who has to reach for their card, then translate that experience into a fix list.

## Why this is two passes, not one

A normal UX review tells the owner their CTA contrast is low and their hero copy is vague. Both may be true and neither explains the lost sale. Purchases die in a specific order: the visitor fails to recognise themselves in the first seconds, or trust collapses at the moment they're asked for access to something they care about, or an unanswered objection lands one scroll before the price. Analysis-first reviews miss this because they evaluate the page as an artifact instead of as an experience that runs on a clock.

So: **simulate the decision first, analyse it second.** Pass 1 is lived, first-person, in the moment, with no benefit of hindsight. Pass 2 reads the transcript of pass 1 as evidence and turns it into a ranked fix list. Never blend them — the moment the persona starts giving advice, they stop being a customer and the signal is gone.

## Step 0 — Get the actual page

Never audit from imagination. Establish what you're actually looking at first.

**If given a URL**: fetch it. Many modern product sites are client-rendered SPAs (TanStack Start, React Router, Next with client boundaries) and a fetch will return a near-empty HTML shell with a `<div id="root">` and a script tag. If the fetched body has no real marketing copy, say so plainly and ask for screenshots or the rendered text — do not proceed by guessing what's probably on the page.

**If given screenshots**: read every visible string, including microcopy, badges, footer links, and form labels. Note what is cut off or below the fold.

**If given source files or a repo**: read the route/page components and extract the rendered copy. Flag anything conditional that a first-time visitor might never see.

**If coverage is partial**: state which surfaces you have (e.g. landing only, no pricing page, no checkout) and audit only those. An audit that invents a pricing page is worse than useless — the owner will "fix" something that doesn't exist.

Before continuing, list in one or two lines: what you have, what you're missing, and whether that gap limits the verdict.

## Step 1 — Build the buyer

A generic "user" produces generic findings. Construct a specific person with something at stake. Derive them from the product itself — who it's priced for, who the copy speaks to, what job it claims to do.

Define, in four or five lines:

- **Who they are and their job** — title, company size, what their day looks like
- **The trigger** — what happened this week that made them go looking. Nobody lands on a product page for no reason.
- **Budget authority** — can they expense this alone, or do they need someone's approval? This changes everything about how price lands.
- **What they've already tried** — the competitor, the spreadsheet, the freelancer, the doing-nothing. Every buyer arrives with a status quo.
- **Their scar tissue** — what they've been burned by before. Tools that promised automation and delivered a CSV. Free trials that held data hostage.

If the product has genuinely distinct segments, run two personas — typically the cheapest plausible buyer and the highest-value one, because they fail at different points. Don't run more than three; the report gets mushy.

`references/personas.md` has archetypes for SaaS, ecommerce/Shopify, marketplace, consumer app, and agency buyers, plus guidance on choosing between them.

## Step 2 — The walkthrough (strictly in character)

Write first person, present tense, as the persona experiences the page top to bottom. This is an inner monologue, not a review. It should read like a recorded think-aloud session: reactions, irritation, skimming, mistrust, the sentence they reread, the thing they scroll past entirely.

Move through these beats. Each one is a real point where buyers drop off.

1. **The 5-second test** — What is this? Is it for me? React to only what's above the fold. If you can't tell what it does, say so and note that many people leave right here.
2. **Trust scan** — Does this look like a real company or a weekend project? Who made it? Logos, proof, screenshots, a real domain, a privacy policy, anything with a name attached. Be honest about signals of thinness.
3. **Comprehension** — What do I actually get, in concrete terms? Not "AI-powered insights" — a file? a dashboard? a report? Where does the output go? Name the moment this becomes clear or the moment you give up on it.
4. **Believability** — Any number, guarantee, or claim on this page gets weighed. "50x ROI", "5,000+ categories", "1-click fix" — do I believe it, and what would make me believe it? Unsourced specificity reads as invented.
5. **The ask** — What is this product asking me to hand over? Email, card, account access, admin permissions. Weigh what's asked against what's proven so far. Access requests before proof is delivered are a common sale-killer.
6. **Price reaction** — React before rationalising. What did I expect, what did I see, what did I compare it to? Note whether the page gives an anchor or leaves you to invent one.
7. **Objections as they surface** — Log each one the moment it occurs, in your own words, and whether the page ever answers it. Objections raised and left unanswered compound; the fourth one usually ends it.
8. **The action moment** — Do I click? What do I expect to happen next? Does the button tell me? Do I hesitate, open a new tab to check the company, or go back to Google?
9. **Exit verdict** — Buy now, start free, bookmark for later, ask someone else, or leave. "Bookmark for later" is a polite no; call it that.

**Running trust meter.** Start at 50/100 and update it after each beat, every time naming the exact element that moved it: `Trust 50 → 38 — no company name anywhere, footer is just three dead links`. Forcing yourself to cite the element prevents vague vibes and gives the owner something they can actually locate on the page.

**Evidence discipline.** React only to what is verifiably there. Quote real strings from the page. If you never saw a testimonial, you never saw one — do not fill the gap with a plausible one. If a screenshot cuts off, say the content was cut off.

**Stay in character.** No recommendations, no "they should really", no UX vocabulary. Customers don't say "the information architecture is unclear", they say "I've scrolled twice and I still don't know what I'm buying".

## Step 3 — Calibration: skeptical by default

The strong default pull is to be encouraging about something the user built. Resist it — a flattering audit costs them real money, because they ship the thing and the silence that follows teaches them nothing.

Calibrate to a buyer who:

- has three other tabs open and no obligation to stay
- has been disappointed by this category before
- reads marketing claims as claims, not facts
- assumes a missing detail is hidden rather than accidentally omitted
- is not impressed by design polish alone, and is actively suspicious of polish that outruns substance

A pass where nothing goes wrong is almost always a failed simulation, not a perfect page. If the walkthrough produced no hesitation, you were being nice — rerun it. Equally, don't manufacture problems that aren't there: if a section genuinely works, say so in one line and move on. The persona should be hard to please, not incapable of being pleased.

Where the product's claims are checkable, check them. A buyer who opens the docs, the pricing page, or a competitor tab is doing what real buyers do, and a claim that falls apart under thirty seconds of scrutiny is a finding worth more than any copy suggestion.

## Step 4 — The auditor report (out of character)

Break character with a clear visual divider. You are now a conversion auditor reading the walkthrough as evidence. Cold, specific, commercial. Use this structure exactly:

```
# Buyer Lens Audit — [site/page]
**Persona:** [one line]  |  **Surfaces reviewed:** [what you actually saw]

## Verdict
[Would they buy? One paragraph, no hedging. Lead with the answer.]
**Purchase intent: X/100** — [one line on what the number means]
**Trust: start 50 → end X**

## What killed it
[The 1–3 things that actually lost the sale, in the order they hit.
For each: the moment, the element, and why it breaks buying — not "improve trust signals".]

## Friction inventory
[Ranked by revenue impact, not by ease of fixing. Each entry:
severity, what it is, where it is, and the fix in one line.]

## Objection map
| Objection (buyer's words) | Raised at | Answered? | Where it should be answered |

## Fix list
[Ordered. Each item: the specific change, and the before → after where it's copy.
Rewrite the actual line. "Make the hero clearer" is not a fix.]

## What already works
[Short. Real strengths only, so they don't break them while fixing the rest.]

## The one change
[If they do exactly one thing this week, what and why.]
```

Rules for the report:

- **Rank by money, not effort.** A hard fix that unblocks the sale outranks a trivial fix that doesn't.
- **Rewrite, don't describe.** For every copy problem, write the replacement line. The owner should be able to paste it.
- **Be locatable.** "The third bullet under the pricing table" beats "the value proposition section".
- **Score honestly.** `references/scoring.md` has the purchase-intent rubric, trust-meter mechanics, and friction severity definitions. Use it — an unanchored number invites the owner to read whatever they want into it.
- **Separate fixable from structural.** Some findings are copy; some mean the product isn't ready to sell yet. Say which is which. If the honest answer is "this doesn't convert because the thing it promises doesn't exist yet", say that — it's the most valuable sentence in the report.

`references/objections.md` holds the objection taxonomy by product type, with the standard answer pattern and placement for each.

## Scope notes

**Pricing pages** get their own treatment: anchor, plan naming, what's deliberately withheld, whether the cheapest plan is usable or bait, and whether the buyer can self-serve or has to talk to someone.

**Checkout and signup flows** are audited step by step with drop-off called at each field. Every field is a tax; ask what each one buys the business.

**Access requests** (OAuth scopes, admin permissions, collaborator access, connected accounts) deserve a dedicated beat. The buyer is being asked to trust the product with something real, usually before the product has proven anything. Note exactly what's requested, what the page says about why, and what it doesn't say.

**Cold-traffic pages** are audited with zero prior context — no brand knowledge, no warm intro. A page that only works for people who already know the company is a page with no top of funnel.

## Anti-patterns

- Slipping into recommendations during the walkthrough — it destroys the only thing pass 1 produces
- Reviewing the page as a designer ("nice use of whitespace") instead of as a buyer
- Generic findings that would apply to any site ("add social proof") — name the specific proof this specific buyer needs at this specific moment
- Auditing intentions instead of the page: what the owner meant is irrelevant, only what's rendered counts
- Inventing page content to fill a gap in the inputs
- A gentle verdict to spare feelings, which is the single most expensive thing this skill can do
