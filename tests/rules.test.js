const assert = require('assert');
const {
  assessBorrower,
  calculateEmi,
  calculateLoanFromEmi,
  calculateApr,
  getConservativeIncome
} = require('../rules.js');

const priya = {
  age: 29, loanType: 'personal', loanPurpose: 'wedding', requestedAmount: 800000,
  monthlyIncome: 110000, incomeType: 'salaried', incomeStability: 'stable',
  monthlyExpenses: 28000, existingEmi: 14000, dependents: 0, creditScore: 780,
  emergencySavingsMonths: 3, hasCollateral: false, collateralValue: 0, recentEmiBounce: false
};

const ravi = {
  age: 42, loanType: 'business', loanPurpose: 'business', requestedAmount: 1500000,
  monthlyIncome: 80000, incomeType: 'self-employed', incomeStability: 'variable',
  documentedMonthlyIncome: 35000, monthlyExpenses: 25000, existingEmi: 0, dependents: 2,
  creditScore: null, emergencySavingsMonths: 2, hasCollateral: true,
  collateralValue: 4500000, recentEmiBounce: false, productiveLoan: 'yes'
};

const anita = {
  age: 35, loanType: 'vehicle', loanPurpose: 'vehicle', requestedAmount: 150000,
  monthlyIncome: 30000, incomeType: 'informal', incomeStability: 'variable', incomeLow: 26000,
  monthlyExpenses: 18000, existingEmi: 9000, dependents: 2, creditScore: null,
  emergencySavingsMonths: 0, hasCollateral: false, recentEmiBounce: true
};

assert.strictEqual(getConservativeIncome(ravi), 35000);
assert.strictEqual(getConservativeIncome(anita), 26000);
assert.strictEqual(getConservativeIncome(priya), 110000);

const p = assessBorrower(priya);
assert.strictEqual(p.decision, 'BORROW');
assert.ok(p.safeAmount >= priya.requestedAmount);
assert.ok(p.lenderAmount > 0);
assert.ok(p.rateBand.low < p.rateBand.high);
assert.ok(p.aprBand.low > p.rateBand.low);
assert.strictEqual(p.safeEmi, 20400);
assert.ok(p.stress.totalEmiRatio > p.affordabilityRatio);

const r = assessBorrower(ravi);
assert.strictEqual(r.decision, 'BORROW LESS');
assert.strictEqual(r.rateBand.product, 'secured');
assert.strictEqual(r.conservativeIncome, 35000);
assert.ok(r.safeAmount < ravi.requestedAmount);
assert.ok(r.lenderAmount > 0);
assert.ok(r.reasons.some((x) => x.includes('documented')));
assert.ok(r.reasons.some((x) => x.includes('secured-product')));
assert.ok(r.confidence.missing.includes('credit score'));

const a = assessBorrower(anita);
assert.strictEqual(a.decision, "DON'T BORROW");
assert.strictEqual(a.safeEmi, 0);
assert.strictEqual(a.safeAmount, 0);
assert.ok(a.reasons.some((x) => x.includes('EMI bounce')));
assert.ok(a.reasons.some((x) => x.includes('No emergency savings')));

const emi = calculateEmi(800000, 0.1275, 60);
const principal = calculateLoanFromEmi(emi, 0.1275, 60);
assert.ok(Math.abs(principal - 800000) < 0.01);
assert.ok(calculateEmi(800000, 0.15, 36) > calculateEmi(800000, 0.15, 84));
assert.ok(calculateApr(800000, 0.10, 60, 0.02) > 0.10);

const unknown = assessBorrower({ ...priya, creditScore: null });
assert.strictEqual(unknown.rateBand.creditProfile, 'unknown');
assert.ok(unknown.rateBand.low > p.rateBand.low);
assert.ok(unknown.confidence.score < p.confidence.score);

console.log('All Borrower Copilot rule tests passed.');
