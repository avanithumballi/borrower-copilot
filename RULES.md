# Borrower Copilot — Rules and Assumptions

This document is the audit trail for the deterministic rules engine.

**Important:** The values below are challenge-prototype assumptions. They are not universal lender underwriting rules, regulatory limits, lender quotes, approvals, or guarantees.

## 1. Conservative monthly income

| Income type | Modelled income |
|---|---|
| Salaried | Reported monthly take-home |
| Informal / mixed | Low-end normal monthly income when supplied; otherwise 80% of reported income |
| Self-employed | Lower of reported and documented monthly income |

The lower documented figure is intentional. Ravi's stated cash-income range reaches ₹80,000/month, but his ITR-equivalent income is ₹35,000/month, so the affordability model uses ₹35,000.

## 2. Safe EMI ceiling

The model uses two independent affordability views:

```text
disposable income
= conservative income - essential expenses - existing EMIs

disposable-based new-EMI limit
= 30% × disposable income

total-debt new-EMI limit
= 35% × conservative income - existing EMIs

safe new-EMI ceiling
= MIN(the two limits) × income-stability factor
```

Stability factors:

| Stability | Factor |
|---|---:|
| Very stable | 1.00 |
| Mostly stable | 0.90 |
| Variable | 0.80 |
| Highly variable | 0.70 |

The final ceiling cannot be negative.

### Why two affordability views?

A high income does not automatically mean a high safe EMI if essential expenses are high. Conversely, low expenses do not mean a borrower has spare capacity if existing EMIs are already large.

## 3. Product and rate bands

These are illustrative prototype positioning assumptions, not live quotes.

| Product | Base band |
|---|---:|
| Personal | 10.5%–16.5% |
| Business | 11.5%–18.5% |
| Secured | 9.5%–14.5% |
| Vehicle | 10.5%–17.5% |
| Education | 9.5%–14.5% |
| Medical | 10.5%–17.5% |
| Home | 8.5%–12.0% |
| Other | 11.5%–18.5% |

If collateral is present and has a positive value, the prototype uses the **secured** rate path.

Credit adjustments:

| Credit profile | Low/high adjustment |
|---|---:|
| 750+ | −0.75 percentage points |
| 700–749 | 0 points |
| 650–699 | +1.25 points |
| Below 650 | +2.5 points |
| Unknown | +1.0 point |

Additional illustrative adjustments:

- Recent EMI bounce: +1 point low / +2 points high.
- Informal or mixed income: +0.5 point low / +1 point high.
- Self-employed documented-income mismatch: +0.5 point low / +1 point high.
- Zero emergency savings: +0.5 point high.

The final range is clamped to an illustrative 8%–35% interval.

## 4. Processing fees

| Product | Assumed fee |
|---|---:|
| Personal | 2.0% |
| Business | 2.0% |
| Secured | 1.5% |
| Vehicle | 2.0% |
| Education | 1.0% |
| Home | 1.0% |
| Medical | 2.0% |
| Other | 2.0% |

These fees are used only for the illustrative all-in APR estimate.

## 5. Safe borrower amount

The preferred rate is the midpoint of the fair rate band.

```text
safe borrower amount
= principal supported by safe EMI
  at midpoint rate over 60 months
```

The amount is **not** capped to the request. This allows the UI to show that a borrower may have capacity above or below what they initially asked for.

## 6. Likely lender sanction — modeled

The lender-side estimate intentionally uses a different rule from the safe borrower number.

For unsecured products:

```text
lender new EMI capacity
= 50% × conservative income - existing EMI
```

For the secured route:

```text
lender new EMI capacity
= 55% × conservative income - existing EMI
```

The principal is then calculated at the midpoint rate over 60 months.

For secured loans:

```text
secured amount <= 60% × collateral value
```

Finally, the estimate is capped at 110% of the requested amount so the UI does not present an artificially huge lender number.

This number is a **modeled comparison**, not a lender approval prediction.

## 7. EMI

Standard amortising-loan formula:

```text
EMI = P × r × (1+r)^n
      -------------------
         (1+r)^n - 1
```

Where:

- `P` = principal
- `r` = monthly interest rate
- `n` = number of months

The UI compares 3, 5 and 7 years using the **requested amount** where available, so the borrower sees the real tenure trade-off for the amount they asked for.

The safe EMI is a ceiling, not a target. A longer tenure lowers monthly EMI but normally increases total interest paid.

## 8. Illustrative all-in APR

The prototype estimates an annualised rate using:

- principal
- nominal annual interest rate
- monthly EMI
- upfront processing-fee deduction from the amount received

It solves for the annual rate that makes the discounted EMI stream equal the net amount received.

This is an **illustrative comparison calculation**, not a contractual APR/KFS engine. A lender's official documentation should always be used for an actual offer.

## 9. Stress test

The default stress scenario is:

```text
monthly income falls by 20%
```

The stress view reports:

```text
(existing EMI + modeled new EMI) / stressed income
```

The modeled new EMI is the safe EMI ceiling, so the borrower can see what happens at the edge of the model's recommended capacity.

## 10. Decision rules

### DON'T BORROW

Triggered when any of these is true:

1. A recent EMI bounce/missed instalment is reported.
2. Existing EMI burden is at least 35% of conservative income.
3. Safe new-EMI capacity is zero.

### BORROW LESS

Triggered when the borrower is not already in `DON'T BORROW` and:

```text
requested amount > safe borrower amount
```

Business borrowing marked as not directly income-generating also downgrades a normal `BORROW` result to `BORROW LESS` because the repayment case is weaker.

### BORROW

Triggered when:

```text
requested amount <= safe borrower amount
```

and none of the `DON'T BORROW` conditions apply.

## 11. Confidence

Confidence measures how complete the supplied information is, not the probability of loan approval.

Known core inputs earn points for:

- monthly income
- household expenses
- existing EMIs
- credit score
- income stability
- emergency savings
- income type
- loan purpose
- loan type
- collateral status
- dependents

Unknown credit is explicitly preserved as unknown and lowers confidence.

High = 90–100, Medium = 65–89, Low <65.

## 12. Adaptive question paths

The shared must-set is followed by only relevant questions:

- Self-employed → documented monthly income.
- Informal/mixed → low-end normal income.
- Business → productive-loan question.
- Collateral = yes → collateral value.

Dependents are included as a core borrower-context question and affect the completeness/confidence score rather than creating an invented expense amount.

## 13. Known limitations

1. No bureau pull.
2. No bank-statement analysis.
3. No income verification.
4. No lender-specific underwriting.
5. No live lender-rate feed.
6. No contractual KFS/APR engine.
7. Household expenses are self-reported.
8. Prototype rate, FOIR and LTV assumptions can differ from actual lender policy.
9. A real lender may reach a substantially different eligible amount.
10. Sample-persona values that are not supplied in the challenge are explicitly labelled as demo assumptions in the UI.
