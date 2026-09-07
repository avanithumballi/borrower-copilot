# Three Run-throughs

These are challenge-persona demonstrations. Values not supplied by the brief are explicitly labelled as prototype/demo assumptions in the app rather than presented as borrower-provided facts.

## Priya

### Challenge profile

- Age 29.
- Salaried software engineer.
- 5 years at a large MNC.
- Net income ₹1,10,000/month.
- Existing car EMI ₹14,000/month.
- Credit score 780.
- Rent ₹28,000/month.
- Wants ₹8,00,000 personal loan for a wedding.

### Demo assumptions

- Essential expenses are represented by ₹28,000/month because the brief supplies rent but not a full expense total.
- Emergency savings: 3 months.
- No collateral.
- No recent EMI bounce.
- Dependents: 0.

### Current model output

- Decision: **BORROW**.
- Conservative income: **₹1,10,000/month**.
- Safe EMI ceiling: **₹20,400/month**.
- Safe borrower amount: **₹9,01,645**.
- Likely lender sanction (modeled): **₹8,80,000**.
- Fair rate: **9.8%–15.8%**.
- Illustrative all-in APR: **10.6%–16.7%**.
- 20% income-drop stress ratio at the safe EMI ceiling: **39.1%**.
- Confidence: **High (100/100)**.

### Expected reasoning

The requested ₹8 lakh is below the modeled safe amount. Existing EMI is meaningful but not excessive relative to income. The strong credit profile narrows/prices the illustrative rate band more favourably.

## Ravi

### Challenge profile

- Age 42.
- Self-employed kirana store owner for 14 years.
- Cash income ₹40,000–₹80,000/month.
- ITR-equivalent income ₹35,000/month.
- Approximate unencumbered shop value ₹45,00,000.
- No formal loan history / no credit score.
- Wants ₹15,00,000 for stock and a delivery vehicle.

### Demo assumptions

- Essential expenses: ₹25,000/month.
- Existing EMI: ₹0.
- Emergency savings: 2 months.
- Dependents: 2.
- The shop is treated as eligible collateral for the prototype.
- Productive loan: yes.

### Current model output

- Decision: **BORROW LESS**.
- Conservative income: **₹35,000/month**.
- Safe EMI ceiling: **₹2,400/month**.
- Safe borrower amount: **₹1,03,722**.
- Likely lender sanction (modeled): **₹8,31,934**.
- Fair rate: **11.0%–16.5%** through the secured path.
- Illustrative all-in APR: **11.7%–17.2%**.
- Confidence: **Medium (88/100)** because the credit score is unknown.

### Expected reasoning

The model does not treat the high end of Ravi's cash-income range as guaranteed. It uses the documented ₹35,000/month. The collateral creates a secured-product route, but collateral alone does not make a large EMI safe. The requested ₹15 lakh is materially above the modeled safe borrower amount, so the borrower is told to borrow less.

## Anita

### Challenge profile

- Age 35.
- Delivery-platform rider + home tailoring.
- Income ₹26,000–₹30,000/month.
- Two children.
- Husband unemployed for 8 months.
- Three app loans.
- ₹35,000 outstanding at 30%+.
- One EMI bounced last month.
- Wants ₹1,50,000 for an electric scooter.

### Demo assumptions

- Conservative income: ₹26,000/month.
- Essential expenses: ₹18,000/month.
- Existing EMI: ₹9,000/month because the brief does not provide a monthly EMI figure.
- Emergency savings: 0 months.
- Dependents: 2.
- No collateral.
- Credit score unknown.

### Current model output

- Decision: **DON'T BORROW**.
- Conservative income: **₹26,000/month**.
- Safe EMI ceiling: **₹0/month**.
- Safe borrower amount: **₹0**.
- Likely lender sanction (modeled): **₹1,59,222** — shown only as a lender-side capacity estimate, not a recommendation.
- Fair rate: **13.0%–22.0%**.
- Illustrative all-in APR: **13.9%–23.0%**.
- Stress ratio: **43.3%** using the zero new-EMI ceiling.
- Confidence: **Medium (88/100)** because credit score is unknown.

### Expected reasoning

The recent EMI bounce and zero modeled new-EMI headroom trigger `DON'T BORROW`. The app deliberately does not let the modeled lender-side number override the borrower's repayment stress.

## Evaluation notes

The three personas exercise the important branches:

- Priya → stable salaried borrower with strong credit.
- Ravi → self-employed/documented-income mismatch + unknown credit + collateral → secured path.
- Anita → variable income + existing repayment stress + recent EMI bounce → don't borrow.
