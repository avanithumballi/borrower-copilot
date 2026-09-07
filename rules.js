/*
  Borrower Copilot — deterministic rules engine.

  All thresholds in this file are clearly labelled prototype assumptions.
  They are NOT lender underwriting rules, regulatory limits, approvals,
  guarantees, or live market quotes.
*/

const RULES = {
  affordability: {
    maxTotalEmiRatio: 0.35,
    disposableIncomeEmiRatio: 0.30
  },

  stability: {
    stable: 1.00,
    "mostly-stable": 0.90,
    variable: 0.80,
    highlyVariable: 0.70
  },

  credit: {
    excellentMin: 750,
    goodMin: 700,
    fairMin: 650,
    unknownRateAdjustment: 0.010,
    weakAdjustment: 0.025,
    fairAdjustment: 0.0125,
    goodAdjustment: 0,
    excellentAdjustment: -0.0075
  },

  rate: {
    personal: { low: 0.105, high: 0.165 },
    business: { low: 0.115, high: 0.185 },
    secured: { low: 0.095, high: 0.145 },
    vehicle: { low: 0.105, high: 0.175 },
    education: { low: 0.095, high: 0.145 },
    medical: { low: 0.105, high: 0.175 },
    home: { low: 0.085, high: 0.120 },
    other: { low: 0.115, high: 0.185 }
  },

  processingFee: {
    personal: 0.020,
    business: 0.020,
    secured: 0.015,
    vehicle: 0.020,
    education: 0.010,
    medical: 0.020,
    home: 0.010,
    other: 0.020
  },

  stress: {
    incomeDrop: 0.20,
    rateIncrease: 0.02
  },

  lenderSanction: {
    maxUnsecuredFoir: 0.50,
    maxSecuredFoir: 0.55,
    maxSecuredLtv: 0.60,
    comparisonMonths: 60
  },

  decision: {
    severeOverRequestMultiplier: 1.25
  }
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function money(value) {
  return Math.max(0, Math.round(Number(value) || 0));
}

function getConservativeIncome(data) {
  const reported = Math.max(0, Number(data.monthlyIncome) || 0);

  if (data.incomeType === "informal" || data.incomeType === "mixed") {
    const low = Number(data.incomeLow);
    return low > 0 ? low : reported * RULES.stability.variable;
  }

  if (data.incomeType === "self-employed") {
    const documented = Number(data.documentedMonthlyIncome);
    if (documented > 0 && reported > 0) return Math.min(reported, documented);
    if (documented > 0) return documented;
  }

  return reported;
}

function stabilityFactor(stability) {
  return RULES.stability[stability] ?? 0.80;
}

function calculateDisposableIncome(data) {
  const income = getConservativeIncome(data);
  const expenses = Math.max(0, Number(data.monthlyExpenses) || 0);
  const existingEmi = Math.max(0, Number(data.existingEmi) || 0);
  return Math.max(0, income - expenses - existingEmi);
}

function calculateSafeEmi(data) {
  const income = getConservativeIncome(data);
  const expenses = Math.max(0, Number(data.monthlyExpenses) || 0);
  const existingEmi = Math.max(0, Number(data.existingEmi) || 0);

  if (income <= 0) return 0;

  const disposable = Math.max(0, income - expenses - existingEmi);
  const disposableLimit = disposable * RULES.affordability.disposableIncomeEmiRatio;
  const totalDebtLimit = income * RULES.affordability.maxTotalEmiRatio;
  const incomeLimit = Math.max(0, totalDebtLimit - existingEmi);

  return Math.max(
    0,
    Math.min(disposableLimit, incomeLimit) * stabilityFactor(data.incomeStability)
  );
}

function getProductKey(data) {
  if (data.hasCollateral && Number(data.collateralValue) > 0) return "secured";
  return data.loanType || "personal";
}

function getBaseRateBand(data) {
  const product = getProductKey(data);
  return RULES.rate[product] || RULES.rate.other;
}

function getCreditAdjustment(score) {
  if (score === null || score === undefined || score === "") {
    return { adjustment: RULES.credit.unknownRateAdjustment, profile: "unknown" };
  }

  const value = Number(score);
  if (!Number.isFinite(value)) {
    return { adjustment: RULES.credit.unknownRateAdjustment, profile: "unknown" };
  }

  if (value >= RULES.credit.excellentMin) {
    return { adjustment: RULES.credit.excellentAdjustment, profile: "excellent" };
  }
  if (value >= RULES.credit.goodMin) {
    return { adjustment: RULES.credit.goodAdjustment, profile: "good" };
  }
  if (value >= RULES.credit.fairMin) {
    return { adjustment: RULES.credit.fairAdjustment, profile: "fair" };
  }
  return { adjustment: RULES.credit.weakAdjustment, profile: "weak" };
}

function calculateRateBand(data) {
  const base = getBaseRateBand(data);
  const credit = getCreditAdjustment(data.creditScore);
  let low = base.low + credit.adjustment;
  let high = base.high + credit.adjustment;

  if (data.recentEmiBounce === true) {
    low += 0.010;
    high += 0.020;
  }

  if (data.incomeType === "informal" || data.incomeType === "mixed") {
    low += 0.005;
    high += 0.010;
  }

  if (data.incomeType === "self-employed" && data.documentedIncomeMismatch) {
    low += 0.005;
    high += 0.010;
  }

  if (Number(data.emergencySavingsMonths) === 0) high += 0.005;

  return {
    low: clamp(low, 0.08, 0.30),
    high: clamp(Math.max(high, low), 0.10, 0.35),
    creditProfile: credit.profile,
    product: getProductKey(data)
  };
}

function calculateEmi(principal, annualRate, months) {
  principal = Number(principal) || 0;
  annualRate = Number(annualRate) || 0;
  months = Number(months) || 0;

  if (principal <= 0 || months <= 0) return 0;
  const r = annualRate / 12;
  if (r === 0) return principal / months;

  return (principal * r * Math.pow(1 + r, months)) /
    (Math.pow(1 + r, months) - 1);
}

function calculateLoanFromEmi(emi, annualRate, months) {
  emi = Number(emi) || 0;
  annualRate = Number(annualRate) || 0;
  months = Number(months) || 0;

  if (emi <= 0 || months <= 0) return 0;
  const r = annualRate / 12;
  if (r === 0) return emi * months;

  return emi * (1 - Math.pow(1 + r, -months)) / r;
}

/*
  Illustrative all-in annualised cost.
  Processing fee is treated as an upfront deduction from proceeds.
  This is a comparison estimate, not a contractual APR/KFS calculation.
*/
function calculateApr(principal, annualRate, months, processingFeeRate) {
  principal = Math.max(0, Number(principal) || 0);
  const netProceeds = principal * (1 - Math.max(0, Number(processingFeeRate) || 0));
  if (principal <= 0 || netProceeds <= 0) return Math.max(0, annualRate);

  const emi = calculateEmi(principal, annualRate, months);
  let low = 0;
  let high = 1;

  for (let i = 0; i < 80; i++) {
    const mid = (low + high) / 2;
    const monthly = mid / 12;
    let pv = 0;
    for (let month = 1; month <= months; month++) {
      pv += emi / Math.pow(1 + monthly, month);
    }
    if (pv > netProceeds) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

function estimateLenderSanction(data, rateBand) {
  const income = getConservativeIncome(data);
  const existingEmi = Math.max(0, Number(data.existingEmi) || 0);
  const secured = rateBand.product === "secured";
  const foir = secured
    ? RULES.lenderSanction.maxSecuredFoir
    : RULES.lenderSanction.maxUnsecuredFoir;

  const lenderNewEmi = Math.max(0, income * foir - existingEmi);
  const benchmarkRate = (rateBand.low + rateBand.high) / 2;
  let amount = calculateLoanFromEmi(
    lenderNewEmi,
    benchmarkRate,
    RULES.lenderSanction.comparisonMonths
  );

  if (secured && Number(data.collateralValue) > 0) {
    amount = Math.min(amount, Number(data.collateralValue) * RULES.lenderSanction.maxSecuredLtv);
  }

  // A lender-side estimate should not be presented as an unlimited approval.
  // It is capped at 110% of the user's request so it remains a useful comparison.
  if (Number(data.requestedAmount) > 0) {
    amount = Math.min(amount, Number(data.requestedAmount) * 1.10);
  }

  return money(amount);
}

function calculateSafeAmount(data, safeEmi, rateBand) {
  const preferredRate = (rateBand.low + rateBand.high) / 2;
  return money(calculateLoanFromEmi(
    safeEmi,
    preferredRate,
    RULES.lenderSanction.comparisonMonths
  ));
}

function calculateConfidence(data) {
  const checks = [
    [Number(data.monthlyIncome) > 0, "monthly income", 12],
    [Number(data.monthlyExpenses) >= 0 && data.monthlyExpenses !== null, "household expenses", 12],
    [data.existingEmi !== null && data.existingEmi !== undefined, "existing EMIs", 10],
    [data.creditScore !== null && data.creditScore !== undefined && data.creditScore !== "", "credit score", 12],
    [Boolean(data.incomeStability), "income stability", 10],
    [data.emergencySavingsMonths !== null && data.emergencySavingsMonths !== undefined, "emergency savings", 10],
    [Boolean(data.incomeType), "income type", 10],
    [Boolean(data.loanPurpose), "loan purpose", 6],
    [Boolean(data.loanType), "loan type", 6],
    [data.hasCollateral !== null && data.hasCollateral !== undefined, "collateral status", 6],
    [Number(data.dependents) >= 0, "dependents", 6]
  ];

  let score = 0;
  const missing = [];
  for (const [known, label, points] of checks) {
    if (known) score += points;
    else missing.push(label);
  }

  if (data.hasCollateral && Number(data.collateralValue) <= 0) {
    missing.push("collateral value");
    score = Math.max(0, score - 4);
  }

  if (data.incomeType === "self-employed" && Number(data.documentedMonthlyIncome) <= 0) {
    missing.push("documented self-employed income");
    score = Math.max(0, score - 8);
  }

  const level = score >= 90 ? "High" : score >= 65 ? "Medium" : "Low";
  return { score: Math.min(100, score), level, missing };
}

function normaliseData(raw) {
  const data = {
    ...raw,
    requestedAmount: Number(raw.requestedAmount) || 0,
    monthlyIncome: Number(raw.monthlyIncome) || 0,
    incomeLow: raw.incomeLow === "" || raw.incomeLow == null ? null : Number(raw.incomeLow),
    documentedMonthlyIncome: raw.documentedMonthlyIncome === "" || raw.documentedMonthlyIncome == null
      ? null : Number(raw.documentedMonthlyIncome),
    monthlyExpenses: raw.monthlyExpenses === "" || raw.monthlyExpenses == null ? null : Number(raw.monthlyExpenses),
    existingEmi: raw.existingEmi === "" || raw.existingEmi == null ? null : Number(raw.existingEmi),
    age: raw.age === "" || raw.age == null ? null : Number(raw.age),
    creditScore: raw.creditScore === "" || raw.creditScore == null ? null : Number(raw.creditScore),
    emergencySavingsMonths: raw.emergencySavingsMonths === "" || raw.emergencySavingsMonths == null
      ? null : Number(raw.emergencySavingsMonths),
    collateralValue: Number(raw.collateralValue) || 0,
    dependents: raw.dependents === "" || raw.dependents == null ? null : Number(raw.dependents),
    otherHouseholdIncome: Number(raw.otherHouseholdIncome) || 0,
    recentEmiBounce: raw.recentEmiBounce === true || raw.recentEmiBounce === "true",
    hasCollateral: raw.hasCollateral === true || raw.hasCollateral === "true"
  };

  // The affordability model deliberately does not add a spouse/other income
  // amount unless the user chooses to model it as reliable household income.
  // This prototype keeps primary borrower income as the conservative base.
  if (data.monthlyExpenses === null) data.monthlyExpenses = 0;
  if (data.existingEmi === null) data.existingEmi = 0;
  if (data.dependents === null) data.dependents = 0;

  if (data.incomeType === "self-employed" && data.documentedMonthlyIncome > 0) {
    data.documentedIncomeMismatch = data.monthlyIncome > data.documentedMonthlyIncome * 1.10;
  }

  return data;
}

function assessBorrower(raw) {
  const data = normaliseData(raw);
  const conservativeIncome = getConservativeIncome(data);
  const safeEmi = calculateSafeEmi(data);
  const rateBand = calculateRateBand(data);
  const safeAmount = calculateSafeAmount(data, safeEmi, rateBand);
  const lenderAmount = estimateLenderSanction(data, rateBand);
  const preferredRate = (rateBand.low + rateBand.high) / 2;
  const feeRate = RULES.processingFee[rateBand.product] ?? RULES.processingFee.other;
  const comparisonPrincipal = Math.max(1, Number(data.requestedAmount) || safeAmount || 1);

  const aprLow = calculateApr(comparisonPrincipal, rateBand.low, 60, feeRate);
  const aprHigh = calculateApr(comparisonPrincipal, rateBand.high, 60, feeRate);

  const stressIncome = conservativeIncome * (1 - RULES.stress.incomeDrop);
  const stressNewEmi = safeEmi;
  const stressTotalEmiRatio = stressIncome > 0
    ? (data.existingEmi + stressNewEmi) / stressIncome
    : 1;

  let decision = "BORROW";
  const reasons = [];

  if (data.recentEmiBounce) {
    decision = "DON'T BORROW";
    reasons.push("A recent EMI bounce suggests current repayment stress. Stabilise existing repayments before taking on another loan.");
  }

  if (conservativeIncome > 0 && data.existingEmi / conservativeIncome >= RULES.affordability.maxTotalEmiRatio) {
    decision = "DON'T BORROW";
    reasons.push("Existing EMIs already consume 35% or more of conservative monthly income under this model.");
  }

  if (safeEmi <= 0) {
    decision = "DON'T BORROW";
    reasons.push("There is no positive monthly cash-flow headroom for a new EMI under the model.");
  }

  if (data.loanType === "business" && data.productiveLoan === "no") {
    reasons.push("This business borrowing is not expected to directly generate additional income, so the repayment case is weaker.");
    if (decision === "BORROW") decision = "BORROW LESS";
  }

  if (data.requestedAmount > 0 && safeAmount > 0 && data.requestedAmount > safeAmount) {
    decision = decision === "DON'T BORROW" ? decision : "BORROW LESS";
    reasons.push(
      data.requestedAmount > safeAmount * RULES.decision.severeOverRequestMultiplier
        ? "The requested amount is materially above the calculated safe borrowing amount."
        : "The requested amount is above the calculated safe borrowing amount."
    );
  }

  if (data.hasCollateral && data.collateralValue > 0) {
    reasons.push("Collateral creates a potential secured-product route; the displayed lender estimate is capped by the model's assumed loan-to-value ceiling.");
  }

  if (data.incomeType === "self-employed" && data.documentedIncomeMismatch) {
    reasons.push("Reported self-employed income is materially above documented income, so the model uses the lower documented figure for affordability.");
  }

  if (data.creditScore === null) {
    reasons.push("Credit score is unknown, so the rate range is widened rather than treating unknown as a poor score.");
  }

  if (data.emergencySavingsMonths === 0) {
    reasons.push("No emergency savings were reported, so the model treats the borrower as having less shock absorption.");
  }

  if (data.dependents > 0) {
    reasons.push(`The assessment records ${data.dependents} dependent${data.dependents === 1 ? "" : "s"}; this is shown for context and does not replace the household-expense input.`);
  }

  if (reasons.length === 0) {
    reasons.push("The requested borrowing is within the calculated cash-flow capacity under the information provided.");
  }

  const confidence = calculateConfidence(data);
  const affordabilityRatio = conservativeIncome > 0
    ? (data.existingEmi + safeEmi) / conservativeIncome
    : 1;

  return {
    data,
    conservativeIncome: money(conservativeIncome),
    disposableIncome: money(calculateDisposableIncome(data)),
    safeEmi: money(safeEmi),
    safeAmount,
    lenderAmount,
    rateBand,
    aprBand: { low: aprLow, high: aprHigh },
    feeRate,
    preferredRate,
    stress: {
      income: money(stressIncome),
      totalEmiRatio: stressTotalEmiRatio,
      newEmi: money(stressNewEmi)
    },
    affordabilityRatio,
    confidence,
    decision,
    reasons,
    negotiationAmount: safeAmount,
    assumptions: {
      comparisonMonths: RULES.lenderSanction.comparisonMonths,
      lenderFoir: rateBand.product === "secured" ? RULES.lenderSanction.maxSecuredFoir : RULES.lenderSanction.maxUnsecuredFoir,
      securedLtv: rateBand.product === "secured" ? RULES.lenderSanction.maxSecuredLtv : null
    }
  };
}

if (typeof window !== "undefined") {
  window.BorrowerRules = {
    RULES,
    assessBorrower,
    calculateEmi,
    calculateLoanFromEmi,
    calculateApr,
    getConservativeIncome,
    calculateSafeEmi,
    calculateRateBand
  };
}

if (typeof module !== "undefined") {
  module.exports = {
    RULES,
    assessBorrower,
    calculateEmi,
    calculateLoanFromEmi,
    calculateApr,
    getConservativeIncome,
    calculateSafeEmi,
    calculateRateBand
  };
}
