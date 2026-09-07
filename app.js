/* Borrower Copilot UI — deterministic rules live in rules.js. */

const state = {
  answers: {},
  questions: [],
  index: 0,
  result: null,
  sampleName: null
};

const $ = (id) => document.getElementById(id);

const sampleBorrowers = {
  priya: {
    name: "Priya",
    age: 29,
    loanType: "personal",
    loanPurpose: "wedding",
    requestedAmount: 800000,
    monthlyIncome: 110000,
    incomeType: "salaried",
    incomeStability: "stable",
    employmentYears: 5,
    monthlyExpenses: 28000,
    existingEmi: 14000,
    dependents: 0,
    creditScore: 780,
    emergencySavingsMonths: 3,
    hasCollateral: false,
    collateralValue: 0,
    recentEmiBounce: false
  },
  ravi: {
    name: "Ravi",
    age: 42,
    loanType: "business",
    loanPurpose: "business",
    requestedAmount: 1500000,
    monthlyIncome: 80000,
    incomeType: "self-employed",
    incomeStability: "variable",
    employmentYears: 14,
    documentedMonthlyIncome: 35000,
    documentedIncomeMismatch: true,
    monthlyExpenses: 25000,
    existingEmi: 0,
    dependents: 2,
    creditScore: null,
    emergencySavingsMonths: 2,
    hasCollateral: true,
    collateralValue: 4500000,
    recentEmiBounce: false,
    productiveLoan: "yes"
  },
  anita: {
    name: "Anita",
    age: 35,
    loanType: "vehicle",
    loanPurpose: "vehicle",
    requestedAmount: 150000,
    monthlyIncome: 30000,
    incomeLow: 26000,
    incomeType: "informal",
    incomeStability: "variable",
    monthlyExpenses: 18000,
    existingEmi: 9000,
    dependents: 2,
    creditScore: null,
    emergencySavingsMonths: 0,
    hasCollateral: false,
    collateralValue: 0,
    recentEmiBounce: true
  }
};

function formatINR(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Math.max(0, Math.round(Number(value) || 0)));
}

function formatPercent(value, digits = 1) {
  return `${(Number(value) * 100).toFixed(digits)}%`;
}

function setScreen(id) {
  document.querySelectorAll(".screen").forEach((screen) => screen.classList.remove("active"));
  $(id).classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function reset() {
  state.answers = {};
  state.questions = [];
  state.index = 0;
  state.result = null;
  state.sampleName = null;
  const banner = $("sampleBanner");
  if (banner) banner.hidden = true;
  closeSampleModal();
  setScreen("introScreen");
}

function buildQuestions() {
  const q = [
    {
      id: "loanPurpose", eyebrow: "Must-have", title: "What do you need the loan for?",
      help: "Purpose changes which product and pricing assumptions are relevant.", type: "select", required: true,
      options: [["wedding", "Wedding / personal expense"], ["business", "Business / working capital"], ["vehicle", "Vehicle"], ["education", "Education"], ["medical", "Medical"], ["home", "Home"], ["other", "Other"]],
      why: "Purpose establishes the product context for the estimate."
    },
    {
      id: "loanType", eyebrow: "Must-have", title: "What type of loan are you considering?",
      help: "Choose the product you expect to compare with a lender.", type: "select", required: true,
      options: [["personal", "Personal loan"], ["business", "Business loan"], ["vehicle", "Vehicle loan"], ["education", "Education loan"], ["other", "Other / unsure"]],
      why: "Different products have different prototype rate and fee assumptions."
    },
    {
      id: "requestedAmount", eyebrow: "Must-have", title: "How much do you want to borrow?",
      help: "Enter the amount you would actually ask the lender for.", type: "currency", required: true,
      why: "The request is compared with both estimated lender capacity and safe borrower capacity."
    },
    {
      id: "monthlyIncome", eyebrow: "Must-have", title: "What is your monthly take-home income?",
      help: "Use money that actually reaches you, not annual CTC.", type: "currency", required: true,
      why: "Monthly cash income is a core input to affordability."
    },
    {
      id: "incomeType", eyebrow: "Must-have", title: "How do you earn this income?",
      help: "Choose the option that best describes your primary income.", type: "options", required: true,
      options: [["salaried", "Salaried"], ["self-employed", "Self-employed"], ["informal", "Informal / variable"], ["mixed", "Mixed income"]],
      why: "Income type determines whether the model asks for a documented or low-end income figure."
    },
    {
      id: "incomeStability", eyebrow: "Must-have", title: "How stable has your income been?",
      help: "Think about the last 12 months rather than your best month.", type: "options", required: true,
      options: [["stable", "Very stable"], ["mostly-stable", "Mostly stable"], ["variable", "Variable"], ["highlyVariable", "Highly variable"]],
      why: "The model reduces safe repayment capacity when income is less predictable."
    },
    {
      id: "monthlyExpenses", eyebrow: "Must-have", title: "What are your essential household expenses each month?",
      help: "Include rent, food, utilities, education, transport and essentials. Exclude existing EMIs.", type: "currency", required: true,
      why: "Affordability should leave headroom after essential living costs."
    },
    {
      id: "existingEmi", eyebrow: "Must-have", title: "How much do you already pay in EMIs each month?",
      help: "Include all current loan and credit instalments.", type: "currency", required: true,
      why: "Existing debt reduces the safe room for a new EMI."
    },
    {
      id: "dependents", eyebrow: "Must-have", title: "How many people depend on your income?",
      help: "Include children, parents or others who rely materially on you.", type: "number", required: true,
      why: "Dependents provide important context for the borrower's financial buffer. Keep essential expenses comprehensive too."
    },
    {
      id: "creditScore", eyebrow: "Must-have", title: "What is your credit score?",
      help: "If you do not know it, choose that option. Unknown is not treated as zero or poor credit.", type: "options", required: true,
      options: [["780", "750 or above"], ["725", "700–749"], ["675", "650–699"], ["625", "Below 650"], ["", "I don't know"]],
      why: "Credit profile affects the illustrative rate band; unknown widens the range rather than becoming a bad score."
    },
    {
      id: "age", eyebrow: "Must-have", title: "How old are you?",
      help: "Use your current age.", type: "number", required: true,
      why: "Age is collected for borrower context and future tenure checks; it is not used as a credit-quality score in this prototype."
    },
    {
      id: "emergencySavingsMonths", eyebrow: "Additional", title: "How many months of essential expenses could your savings cover?",
      help: "Choose zero if you have no emergency savings.", type: "options", required: true,
      options: [["0", "None"], ["0.5", "Less than 1 month"], ["2", "1–3 months"], ["4.5", "3–6 months"], ["6", "6+ months"]],
      why: "A stronger emergency buffer gives more room for an income or expense shock."
    },
    {
      id: "recentEmiBounce", eyebrow: "Additional", title: "Has an EMI bounced or been missed recently?",
      help: "Answer yes if there has been a recent missed or bounced instalment.", type: "options", required: true,
      options: [["false", "No"], ["true", "Yes"]],
      why: "Recent repayment stress is a strong reason to avoid adding another obligation."
    }
  ];

  if (state.answers.incomeType === "self-employed") {
    q.splice(6, 0, {
      id: "documentedMonthlyIncome", eyebrow: "Self-employed path", title: "What monthly income can you document through ITR or reliable records?",
      help: "Enter the monthly equivalent of your documented income.", type: "currency", required: true,
      why: "When reported and documented income differs, the model uses the lower documented figure for affordability."
    });
  }

  if (state.answers.incomeType === "informal" || state.answers.incomeType === "mixed") {
    q.splice(6, 0, {
      id: "incomeLow", eyebrow: "Variable-income path", title: "What is the lowest normal monthly income you would plan around?",
      help: "Use a realistic low-end month, not an unusually bad month.", type: "currency", required: true,
      why: "Using a low-end normal income makes the borrowing estimate less dependent on a best month."
    });
  }

  const businessQuestion = {
    id: "productiveLoan", eyebrow: "Business path", title: "Will this borrowing directly generate additional income?",
    help: "Think about whether the loan has a credible path to increasing cash flow.", type: "options", required: true,
    options: [["yes", "Yes"], ["no", "No"], ["unsure", "Not sure"]],
    why: "A productive business loan has a stronger repayment case than borrowing that does not improve cash flow."
  };

  if (state.answers.loanType === "business") {
    q.splice(4, 0, businessQuestion);
  }

  const collateralQuestion = {
    id: "hasCollateral", eyebrow: "Additional", title: "Do you have collateral that could support a secured loan?",
    help: "Examples include property or gold that you actually own and could potentially pledge.", type: "options", required: true,
    options: [["false", "No"], ["true", "Yes"]],
    why: "Collateral can create a secured-product route with different pricing and sanction mechanics."
  };

  q.push(collateralQuestion);

  if (state.answers.hasCollateral === true || state.answers.hasCollateral === "true") {
    q.push({
      id: "collateralValue", eyebrow: "Secured-loan path", title: "What is the approximate current value of the collateral?",
      help: "Use a conservative current estimate.", type: "currency", required: true,
      why: "The prototype uses collateral value to apply its assumed loan-to-value ceiling."
    });
  }

  return q;
}

function inputValue(id) {
  const checked = document.querySelector(`[name="${id}"]:checked`);
  if (checked) return checked.value;
  const el = document.querySelector(`[name="${id}"]`);
  return el ? el.value : "";
}

function collectCurrentAnswer() {
  const q = state.questions[state.index];
  if (!q) return true;

  let value = inputValue(q.id);
  if (q.type === "currency" || q.type === "number") value = value === "" ? "" : Number(value);
  if (q.id === "recentEmiBounce" || q.id === "hasCollateral") value = value === "true";
  if (q.id === "creditScore") value = value === "" ? null : Number(value);

  // `null` is a deliberate, valid answer for an unknown credit score.
  // Other required questions must have a real value/selection.
  const missing = value === "" || value === undefined || Number.isNaN(value) ||
    (value === null && q.id !== "creditScore");
  if (q.required && missing) {
    showValidation("Please answer this question before continuing.");
    return false;
  }

  if (q.id === "age" && (value < 18 || value > 100)) {
    showValidation("Please enter an age between 18 and 100.");
    return false;
  }

  if ((q.type === "currency" || q.id === "dependents") && value < 0) {
    showValidation("Please enter a value of zero or more.");
    return false;
  }

  state.answers[q.id] = value;
  return true;
}

function showValidation(message) {
  const el = $("validationMessage");
  if (!el) return alert(message);
  el.textContent = message;
  el.hidden = false;
}

function clearValidation() {
  const el = $("validationMessage");
  if (el) el.hidden = true;
}

function renderQuestion() {
  state.questions = buildQuestions();
  const q = state.questions[state.index];
  if (!q) return runAssessment();

  clearValidation();
  const total = state.questions.length;
  const progress = Math.round(((state.index + 1) / total) * 100);

  $("progressLabel").textContent = `Question ${state.index + 1} of ${total}`;
  $("progressPercent").textContent = `${progress}%`;
  $("progressBar").style.width = `${progress}%`;
  $("questionEyebrow").textContent = q.eyebrow;
  $("questionTitle").textContent = q.title;
  $("questionHelp").textContent = q.help;
  $("questionWhy").textContent = `Why we ask: ${q.why}`;

  const body = $("questionBody");
  body.innerHTML = "";

  if (q.type === "currency" || q.type === "number") {
    const field = document.createElement("div");
    field.className = "field";
    const label = document.createElement("label");
    label.textContent = q.type === "currency" ? "Amount" : (q.id === "dependents" ? "Number of dependents" : "Age");
    label.htmlFor = q.id;
    const wrapper = document.createElement("div");
    wrapper.className = q.type === "currency" ? "input-prefix" : "";
    if (q.type === "currency") {
      const prefix = document.createElement("span");
      prefix.textContent = "₹";
      wrapper.appendChild(prefix);
    }
    const input = document.createElement("input");
    input.className = "input";
    input.id = q.id;
    input.name = q.id;
    input.type = "number";
    input.inputMode = q.type === "currency" ? "decimal" : "numeric";
    input.min = q.type === "currency" ? "0" : (q.id === "age" ? "18" : "0");
    input.max = q.id === "age" ? "100" : "";
    input.step = q.type === "currency" ? "1000" : "1";
    input.value = state.answers[q.id] ?? "";
    input.addEventListener("input", clearValidation);
    wrapper.appendChild(input);
    field.append(label, wrapper);
    body.appendChild(field);
  }

  if (q.type === "select") {
    const field = document.createElement("div");
    field.className = "field";
    const select = document.createElement("select");
    select.className = "select";
    select.name = q.id;
    select.id = q.id;
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Choose an option";
    placeholder.disabled = true;
    placeholder.selected = state.answers[q.id] == null;
    select.appendChild(placeholder);
    q.options.forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      option.selected = String(state.answers[q.id]) === String(value);
      select.appendChild(option);
    });
    select.addEventListener("change", clearValidation);
    field.appendChild(select);
    body.appendChild(field);
  }

  if (q.type === "options") {
    const grid = document.createElement("div");
    grid.className = "option-grid";
    q.options.forEach(([value, label], i) => {
      const wrapper = document.createElement("div");
      wrapper.className = "option";
      const input = document.createElement("input");
      input.type = "radio";
      input.id = `${q.id}-${i}`;
      input.name = q.id;
      input.value = value;
      const existing = state.answers[q.id];
      // null is a deliberate value for unknown credit score. For the unknown
      // option, an empty string must therefore still render as selected.
      if (q.id === "creditScore" && existing === null && value === "") input.checked = true;
      else if (existing !== undefined && existing !== null && String(existing) === String(value)) input.checked = true;
      input.addEventListener("change", clearValidation);
      const labelEl = document.createElement("label");
      labelEl.htmlFor = input.id;
      labelEl.textContent = label;
      wrapper.append(input, labelEl);
      grid.appendChild(wrapper);
    });
    body.appendChild(grid);
  }

  $("backBtn").style.visibility = state.index === 0 ? "hidden" : "visible";
  $("nextBtn").textContent = state.index === total - 1 ? "See my assessment" : "Continue";
}

function startAssessment(prefill = null, sampleName = null) {
  state.answers = prefill ? { ...prefill } : {};
  state.index = 0;
  state.result = null;
  state.sampleName = sampleName;
  const banner = $("sampleBanner");
  if (banner) {
    banner.hidden = !sampleName;
    $("sampleBannerName").textContent = sampleName || "";
  }
  state.questions = buildQuestions();
  setScreen("questionScreen");
  renderQuestion();
}

function goNext() {
  if (!collectCurrentAnswer()) return;
  const currentId = state.questions[state.index]?.id;
  state.questions = buildQuestions();
  const currentIndex = state.questions.findIndex((question) => question.id === currentId);

  if (currentIndex >= 0 && currentIndex < state.questions.length - 1) {
    state.index = currentIndex + 1;
    renderQuestion();
  } else {
    runAssessment();
  }
}

function goBack() {
  if (state.index === 0) return;
  const currentId = state.questions[state.index]?.id;
  collectCurrentAnswer();
  state.questions = buildQuestions();
  const currentIndex = state.questions.findIndex((question) => question.id === currentId);
  state.index = Math.max(0, currentIndex - 1);
  renderQuestion();
}

function runAssessment() {
  const raw = {
    ...state.answers,
    requestedAmount: Number(state.answers.requestedAmount),
    monthlyIncome: Number(state.answers.monthlyIncome),
    monthlyExpenses: Number(state.answers.monthlyExpenses),
    existingEmi: Number(state.answers.existingEmi),
    dependents: Number(state.answers.dependents),
    age: Number(state.answers.age),
    creditScore: state.answers.creditScore,
    emergencySavingsMonths: Number(state.answers.emergencySavingsMonths),
    hasCollateral: Boolean(state.answers.hasCollateral),
    collateralValue: Number(state.answers.collateralValue || 0),
    recentEmiBounce: Boolean(state.answers.recentEmiBounce)
  };

  state.result = window.BorrowerRules.assessBorrower(raw);
  renderResults();
  setScreen("resultsScreen");
}

function renderResults() {
  const r = state.result;
  const d = r.data;

  $("resultDecision").textContent = r.decision;
  $("resultSummary").textContent = `Based on your answers, conservative monthly income is ${formatINR(r.conservativeIncome)} and the modeled new-EMI ceiling is ${formatINR(r.safeEmi)}.`;
  $("confidenceBadge").textContent = `Confidence: ${r.confidence.level} (${r.confidence.score}/100)`;
  $("decisionValue").textContent = r.decision;
  $("decisionReason").textContent = r.reasons[0];
  $("lenderAmount").textContent = formatINR(r.lenderAmount);
  $("safeAmount").textContent = formatINR(r.safeAmount);
  $("rateBand").textContent = `${formatPercent(r.rateBand.low)} – ${formatPercent(r.rateBand.high)}`;
  $("aprBand").textContent = `${formatPercent(r.aprBand.low)} – ${formatPercent(r.aprBand.high)}`;
  $("rateReason").textContent = `Illustrative rate band using the ${r.rateBand.product} path and a ${formatPercent(r.feeRate)} processing-fee assumption for the all-in cost estimate.`;
  $("safeEmi").textContent = `${formatINR(r.safeEmi)} / month`;

  const comparisonPrincipal = d.requestedAmount > 0 ? d.requestedAmount : r.safeAmount;
  $("emi3").textContent = formatINR(window.BorrowerRules.calculateEmi(comparisonPrincipal, r.preferredRate, 36));
  $("emi5").textContent = formatINR(window.BorrowerRules.calculateEmi(comparisonPrincipal, r.preferredRate, 60));
  $("emi7").textContent = formatINR(window.BorrowerRules.calculateEmi(comparisonPrincipal, r.preferredRate, 84));
  $("emiReason").textContent = `₹${formatINR(r.safeEmi).replace("₹", "")} is a ceiling, not a target. A longer tenure lowers monthly EMI but increases total interest.`;

  $("stressTitle").textContent = `If income falls ${formatPercent(window.BorrowerRules.RULES.stress.incomeDrop, 0)}`;
  $("stressText").textContent = `At ${formatINR(r.stress.income)} of monthly income, existing EMI plus the modeled new EMI would consume ${formatPercent(r.stress.totalEmiRatio)} of income.`;
  $("stressRatio").textContent = formatPercent(r.stress.totalEmiRatio);

  const reasonList = $("reasonList");
  reasonList.innerHTML = "";
  r.reasons.forEach((reason) => {
    const li = document.createElement("li");
    li.textContent = reason;
    reasonList.appendChild(li);
  });
  if (r.confidence.missing.length) {
    const li = document.createElement("li");
    li.textContent = `Confidence is limited because these inputs were unavailable: ${r.confidence.missing.join(", ")}.`;
    reasonList.appendChild(li);
  }

  $("decisionPill").textContent = r.decision === "BORROW" ? "Within modeled capacity" : r.decision === "BORROW LESS" ? "Reduce the amount" : "Pause new borrowing";
  $("decisionPill").className = `decision-pill ${r.decision === "BORROW" ? "positive" : r.decision === "BORROW LESS" ? "warning" : "negative"}`;

  const assumptionCard = $("assumptionCard");
  if (assumptionCard) {
    const notes = [];
    if (state.sampleName === "Priya") notes.push("For this demo, ₹28,000 is treated as essential household expense and emergency savings are set to 3 months because the challenge does not provide those values.");
    if (state.sampleName === "Ravi") notes.push("For this demo, ₹25,000 is treated as essential household expense and 2 months of emergency savings are assumed; the stated ITR income of ₹35,000/month is used conservatively.");
    if (state.sampleName === "Anita") notes.push("For this demo, ₹18,000 essential expenses and ₹9,000 existing monthly EMI are explicit prototype assumptions because the challenge does not provide those monthly figures.");
    notes.push("Rate bands, FOIR/LTV thresholds, processing fees and the 60-month comparison tenure are prototype assumptions, not lender quotes or approval criteria. This tool is not a credit approval.");
    $("assumptionText").textContent = notes.join(" ");
    assumptionCard.hidden = false;
  }

  renderNegotiationCard();
}

function renderNegotiationCard() {
  const r = state.result;
  const d = r.data;
  const decisionText = r.decision === "BORROW"
    ? "The requested amount is within the model's safe borrowing capacity."
    : r.decision === "BORROW LESS"
      ? `Ask for no more than ${formatINR(r.safeAmount)} unless your cash-flow position improves.`
      : "Do not use a lender's maximum as a target. Stabilise repayment capacity first.";

  $("negotiationCardContent").innerHTML = `
    <p><strong>${decisionText}</strong></p>
    <div class="neg-grid">
      <div class="neg-item"><span>Requested</span><strong>${formatINR(d.requestedAmount)}</strong></div>
      <div class="neg-item"><span>Safe borrower amount</span><strong>${formatINR(r.safeAmount)}</strong></div>
      <div class="neg-item"><span>Likely lender amount (modeled)</span><strong>${formatINR(r.lenderAmount)}</strong></div>
      <div class="neg-item"><span>Fair interest rate</span><strong>${formatPercent(r.rateBand.low)} – ${formatPercent(r.rateBand.high)}</strong></div>
      <div class="neg-item"><span>Estimated all-in APR</span><strong>${formatPercent(r.aprBand.low)} – ${formatPercent(r.aprBand.high)}</strong></div>
      <div class="neg-item"><span>EMI ceiling</span><strong>${formatINR(r.safeEmi)} / month</strong></div>
    </div>
    <div class="negotiation-ask">
      <strong>What to ask the lender</strong>
      <span>“Please show me the interest rate, processing fee, net disbursal, total repayment and effective all-in cost. This self-assessment estimates a fair rate of ${formatPercent(r.rateBand.low)}–${formatPercent(r.rateBand.high)} for my supplied profile. I do not want my EMI to exceed ${formatINR(r.safeEmi)} per month.”</span>
    </div>
  `;
}

function openSampleModal() {
  $("sampleModal").hidden = false;
  document.body.classList.add("modal-open");
}

function closeSampleModal() {
  const modal = $("sampleModal");
  if (modal) modal.hidden = true;
  document.body.classList.remove("modal-open");
}

function chooseSample(key, mode) {
  const sample = sampleBorrowers[key];
  if (!sample) return;
  closeSampleModal();
  if (mode === "results") {
    state.answers = { ...sample };
    state.result = window.BorrowerRules.assessBorrower(sample);
    state.sampleName = sample.name;
    renderResults();
    setScreen("resultsScreen");
  } else {
    startAssessment(sample, sample.name);
  }
}

$("startBtn").addEventListener("click", () => startAssessment());
$("demoBtn").addEventListener("click", openSampleModal);
$("closeSampleBtn").addEventListener("click", closeSampleModal);
$("sampleModal").addEventListener("click", (event) => {
  if (event.target === $("sampleModal")) closeSampleModal();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeSampleModal();
});
document.querySelectorAll("[data-sample][data-mode]").forEach((button) => {
  button.addEventListener("click", () => chooseSample(button.dataset.sample, button.dataset.mode));
});

$("nextBtn").addEventListener("click", goNext);
$("backBtn").addEventListener("click", goBack);
$("resetBtn").addEventListener("click", reset);
$("againBtn").addEventListener("click", reset);
$("printBtn").addEventListener("click", () => window.print());
