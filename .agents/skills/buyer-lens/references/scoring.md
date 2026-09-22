# Scoring & Rubric Reference

Definitions and calibration rules for Trust Meter, Purchase Intent, and Friction Severity.

## Trust Meter (0–100)
- **Starting Baseline: 50/100** (Neutral skepticism).
- **Movement Rules:** Every movement must cite the exact element.
  - `+5 to +15`: Concrete verification (real interactive demo without login, exact screenshots, transparent pricing, verified customer names).
  - `-5 to -15`: Vagueness, buzzwords without explanation, missing pricing, broken links, cut-off mobile text.
  - `-20 or more`: Demanding admin or OAuth access before showing value, unverified grandiose claims ("5000% ROI"), dark patterns.

## Purchase Intent (0–100)
- **80–100: Immediate Buy / Sign Up.** Problem is acute, solution is concrete, price is a no-brainer, trust is established.
- **60–79: High Trial / Evaluation.** Will sign up for free or trial, but won't pay until they see their own data inside the tool.
- **40–59: Hesitant / "Bookmark for Later".** Interested in the promise, but an objection or lack of proof stops them from reaching for their card. (A polite "no").
- **20–39: Likely Bounce.** Too confusing, doesn't feel like a real tool, or asks too much too early.
- **0–19: Immediate Exit.** Visitor can't tell what it is within 5 seconds, or feels suspicious/scammy.

## Friction Severity
- **P0 (Deal Killer):** Causes immediate tab closure or refusal to proceed (e.g. asking for card before showing pricing, broken primary CTA, opaque value).
- **P1 (High Friction):** Creates lingering hesitation that compounds with later objections (e.g. unclear export format, hidden plan limitations).
- **P2 (Papercut):** Annoyance or cognitive load that slows the user down but doesn't alone kill the sale (e.g. minor typos, suboptimal contrast, cluttered table).
