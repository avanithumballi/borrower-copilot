# Borrower Copilot — Lokta Build Challenge

A local-first borrower self-assessment prototype for the Lokta Build Challenge.

The product answers four borrower questions:

1. Should I borrow at all?
2. How much can a lender plausibly sanction versus how much can I safely carry?
3. What interest-rate band should I compare and negotiate against?
4. What EMI should I avoid crossing, including a stress case?

It then creates a one-page Negotiation Card.

## Run locally

No build step, package manager, API key, login, database, or backend is required.

### Option A — open directly

Open `index.html` in a modern browser.

### Option B — recommended local server

```bash
python -m http.server 5500
```

Then open `http://localhost:5500/`.

Run the command **from this folder**, not from its parent directory. If the browser shows a directory listing, the server is serving the parent folder; use the project folder as the working directory.

## Files

```text
borrower-copilot/
├── index.html
├── style.css
├── app.js
├── rules.js
├── RULES.md
├── RUN_THROUGHS.md
├── PROJECT_MAP.txt
└── tests/
    └── rules.test.js
```

## Architecture

- `index.html` contains the screens and accessible form structure.
- `style.css` contains the responsive product styling and print card layout.
- `app.js` owns interaction, adaptive question flow, validation, sample personas, and result rendering.
- `rules.js` is a deterministic, UI-independent rules engine. Calculations are exposed through `window.BorrowerRules` and can also be unit-tested with Node.
- `RULES.md` documents every major assumption and formula.
- `RUN_THROUGHS.md` records the three challenge personas and expected behaviour.

## Design decisions

### Lender number vs borrower number

The app deliberately shows two separate amounts:

- **Likely lender sanction (modeled):** a simplified lender-side capacity estimate.
- **Safe borrower amount:** the principal supported by the borrower's modeled safe EMI ceiling.

The safe amount is the negotiation ceiling. The lender-side amount is never presented as an approval.

### Unknown credit score

`I don't know` becomes `null`, not zero. It widens the illustrative rate band and lowers confidence.

### Conservative income

- Salaried: reported take-home income.
- Informal/mixed: low-end normal monthly income when supplied.
- Self-employed: the lower of reported and documented monthly income.

### Adaptive questions

The must-set is shared, then the app adds only relevant questions:

- self-employed → documented monthly income
- informal/mixed → low-end normal income
- business → whether the loan directly generates income
- collateral → collateral value

Dependents are collected as a core borrower-context input and affect confidence rather than being silently converted into an invented expense amount.

### Sample borrower UX

The sample button opens a proper chooser instead of a browser `prompt()`. Each persona can either:

- **Review answers:** open the pre-filled questionnaire and step through it.
- **See result:** jump directly to the result page for quick evaluation.

This avoids the confusing old flow where a browser prompt was followed by a long series of pre-filled Continue clicks when the evaluator only wanted to inspect a sample result.

## Testing

Run:

```bash
node tests/rules.test.js
```

The test suite covers the three personas, conservative income, decision outcomes, secured routing, unknown credit, APR fee uplift, EMI/principal inversion, stress behaviour, and tenure monotonicity.

## Important limitations

This is a challenge prototype, not a credit decision system. Rate bands, FOIR-style limits, LTV, processing fees, and comparison tenure are explicitly modeled assumptions. There is no bureau pull, bank-statement verification, lender policy feed, or contractual KFS/APR engine.

A real borrower should compare the lender's official Key Facts Statement / repayment schedule and actual fees before signing.

## Final bug fixes

- JavaScript now loads after the sample-borrower modal markup, so all controls including **Continue** receive their event handlers.
- The explicit **I don’t know** credit-score option is treated as a valid unknown value instead of blocking progression.
- Sample borrowers remain pre-filled while the review flow still uses the same questionnaire and rules engine.
