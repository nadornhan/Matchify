/* ==========================================================================
   Matchify - Intelligent Talent Matching Platform
   ========================================================================== */

/* ---------- Constants ---------- */
const FREE_RECOMMENDATION_LIMIT = 10;
const STORAGE = window.MatchifyData.STORAGE;

const APP_STATUS_LABELS = {
  applied: "Applied",
  shortlisted: "Shortlisted",
  interview_scheduled: "Interview Scheduled",
  rejected: "Rejected"
};

const DEFAULT_INTEGRATIONS = {
  google_meet: true,
  google_calendar: true,
  gmail: false,
  linkedin: false,
  slack: false,
  greenhouse: false
};

const INTEGRATION_CATALOG = [
  { key: "google_meet", name: "Google Meet", desc: "Auto-generate video links for scheduled interviews.", letter: "M", color: "#1a73e8", bg: "#e8f0fe" },
  { key: "google_calendar", name: "Google Calendar", desc: "Sync interviews to your calendar in real-time.", letter: "C", color: "#0f9d58", bg: "#e6f4ea" },
  { key: "gmail", name: "Gmail", desc: "Send interview invites and updates straight from Matchify.", letter: "G", color: "#d93025", bg: "#fce8e6" },
  { key: "linkedin", name: "LinkedIn", desc: "Import candidate profiles and post jobs to LinkedIn.", letter: "in", color: "#0a66c2", bg: "#e3eef9" },
  { key: "slack", name: "Slack", desc: "Get notified about new applicants and interview feedback.", letter: "S", color: "#611f69", bg: "#f4ecf5" },
  { key: "greenhouse", name: "Greenhouse ATS", desc: "Sync jobs, candidates, and hiring stages automatically.", letter: "GH", color: "#247a4d", bg: "#e8f3ec" }
];

const educationRank = {
  "High School": 1,
  Diploma: 2,
  Bachelor: 3,
  "Bachelor's Degree": 3,
  Master: 4,
  "Master's Degree": 4,
  PhD: 5
};

const synonymGroups = [
  ["software engineer", "software developer", "developer", "programmer", "coder", "swe", "engineer"],
  ["frontend", "front-end", "front end", "ui developer", "ui engineer", "react developer"],
  ["backend", "back-end", "back end", "api developer", "server engineer"],
  ["fullstack", "full-stack", "full stack"],
  ["data scientist", "data science", "data analyst", "ml engineer", "machine learning engineer"],
  ["ux designer", "ui designer", "product designer", "ux/ui designer", "ux"],
  ["devops", "site reliability engineer", "sre", "platform engineer"],
  ["qa", "tester", "quality assurance", "test engineer"],
  ["pm", "product manager", "project manager"],
  ["javascript", "js", "ecmascript"],
  ["typescript", "ts"],
  ["python", "py"]
];

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function saveArray(key, data) {
  MatchifyData.saveCollection(key, data).catch((err) => {
    console.error("Matchify save failed:", key, err);
  });
}

function loadSessionUser() {
  return MatchifyData.loadSessionUser();
}

function saveSessionUser(user) {
  MatchifyData.saveSessionUser(user);
  MatchifyData.setIntegrationsUserId(user ? user.id : null);
}

/* ---------- Application state (loaded from Supabase / localStorage on init) ---------- */
let users = [];
let candidates = [];
let jobs = [];
let applications = [];
let interviews = [];
let sourcingHistory = [];
let messages = [];
let companies = [];
let reviews = [];
let integrations = { ...DEFAULT_INTEGRATIONS };

/* Seed companies + reviews on first run */
const SEED_COMPANIES = [
  { name: "Nimbus Data Systems", color: "#2250f4", industry: "Cloud Computing", rating: 4.8, reviewsCount: 412, salariesCount: 2500, questionsCount: 45, mockOpenJobs: 180, description: "Nimbus is a leading cloud computing platform powering data infrastructure for thousands of teams worldwide." },
  { name: "Verdant Spire", color: "#17a862", industry: "Renewable Energy", rating: 4.5, reviewsCount: 1253, salariesCount: 1200, questionsCount: 72, mockOpenJobs: 94, description: "Verdant Spire develops next-generation renewable energy systems for residential and commercial customers." },
  { name: "Nexus Robotics", color: "#9333ea", industry: "Robotics & AI", rating: 4.9, reviewsCount: 834, salariesCount: 950, questionsCount: 38, mockOpenJobs: 112, description: "Nexus Robotics builds intelligent automation hardware and software to redefine modern manufacturing." },
  { name: "Aura Health Tech", color: "#0ea5b7", industry: "Healthcare Technology", rating: 4.6, reviewsCount: 562, salariesCount: 820, questionsCount: 24, mockOpenJobs: 45, description: "Aura Health Tech connects clinicians and patients with smart digital tools to improve outcomes." },
  { name: "Lumina Creative", color: "#ec4899", industry: "Creative Agency", rating: 4.3, reviewsCount: 428, salariesCount: 3100, questionsCount: 145, mockOpenJobs: 88, description: "Lumina Creative produces award-winning brand storytelling and digital experiences." },
  { name: "Orbit Logistics", color: "#f97316", industry: "Logistics & Supply Chain", rating: 4.7, reviewsCount: 1845, salariesCount: 4500, questionsCount: 210, mockOpenJobs: 340, description: "Orbit Logistics moves the world with global supply-chain solutions and last-mile fulfilment." }
];

const SEED_REVIEW_TEMPLATES = [
  { rating: 4, title: "Great people", position: "PM", location: "Sydney NSW", body: "Great people. Hard working. Good culture, knowledgeable staff, good employee benefits. Process improvements underway, good pay, diverse workforce. Great offices, work from home, central location.", likes: 12, dislikes: 1 },
  { rating: 5, title: "Excellent growth opportunities", position: "Senior Developer", location: "Melbourne VIC", body: "I have been here for 3 years and the career progression is unmatched. The teams are highly collaborative and management genuinely cares about your well-being and professional development.", likes: 34, dislikes: 2 },
  { rating: 3, title: "Good benefits but high pressure", position: "Analyst", location: "Brisbane QLD", body: "The salary and bonuses are very competitive. However, the work-life balance can suffer during peak seasons. You are expected to deliver high-quality work under tight deadlines.", likes: 5, dislikes: 3 }
];

async function seedCompaniesIfEmpty() {
  if (companies.length === 0) {
    companies = SEED_COMPANIES.map((c) => ({
      id: createId("co"),
      name: c.name,
      color: c.color,
      industry: c.industry,
      seededRating: c.rating,
      seededReviewsCount: c.reviewsCount,
      salariesCount: c.salariesCount,
      questionsCount: c.questionsCount,
      mockOpenJobs: c.mockOpenJobs,
      description: c.description,
      whyJoinUs: "Be part of a mission-driven team that values innovation, transparency, and continuous learning. Competitive compensation, hybrid work, and meaningful career growth.",
      detailedRatings: {
        "Work-life balance": (c.rating - 0.2).toFixed(1),
        "Pay and benefits": (c.rating - 0.1).toFixed(1),
        "Job security": (c.rating - 0.3).toFixed(1),
        "Management": (c.rating - 0.4).toFixed(1),
        "Culture": (c.rating - 0.2).toFixed(1)
      },
      saying: {
        positive: ["Trust in colleagues", "Fair pay for job", "Personal appreciation"],
        negative: ["General feeling of work happiness", "Energising work tasks"]
      },
      createdAt: Date.now()
    }));
    await MatchifyData.saveCollection(STORAGE.companies, companies);
  }
  if (reviews.length === 0) {
    const seeded = [];
    companies.slice(0, 6).forEach((co, idx) => {
      SEED_REVIEW_TEMPLATES.forEach((tpl, i) => {
        seeded.push({
          id: createId("rev"),
          companyName: co.name,
          authorName: null,
          rating: tpl.rating,
          title: tpl.title,
          position: tpl.position,
          location: tpl.location,
          body: tpl.body,
          likes: tpl.likes,
          dislikes: tpl.dislikes,
          createdAt: Date.now() - (idx * 86400000 * 12 + i * 86400000 * 4)
        });
      });
    });
    reviews = seeded;
    await MatchifyData.saveCollection(STORAGE.reviews, reviews);
  }
}

let currentUser = null;

function saveIntegrations() {
  MatchifyData.saveIntegrations(integrations).catch((err) => {
    console.error("Matchify integrations save failed:", err);
  });
}

function migrateApplicationsInMemory() {
  applications.forEach((app) => {
    if (app.status === "applied" && !app.employerStatus) app.employerStatus = "applied";
    if (typeof app.viewedByEmployer !== "boolean") app.viewedByEmployer = false;
    if (typeof app.candidateArchived !== "boolean") app.candidateArchived = false;
    if (!Array.isArray(app.events)) {
      app.events = [];
      if (app.status === "applied") {
        app.events.push({ kind: "submitted", label: "Application successfully submitted.", at: app.createdAt || Date.now() });
      }
    }
  });
}

/* Helper: push a timeline event */
function pushAppEvent(app, kind, label) {
  if (!app) return;
  if (!Array.isArray(app.events)) app.events = [];
  app.events.push({ kind, label, at: Date.now() });
}

/* Mark an employer's view as "Viewed by Employer" on relevant applications */
function markCandidateViewedByEmployer(candidateUserId, employerUserId) {
  let changed = false;
  applications.forEach((app) => {
    if (app.candidateUserId !== candidateUserId) return;
    if (app.status !== "applied") return;
    if (app.candidateArchived) return;
    const job = jobs.find((j) => j.id === app.jobId);
    if (!job || job.userId !== employerUserId) return;
    if (!app.viewedByEmployer) {
      app.viewedByEmployer = true;
      pushAppEvent(app, "viewed", "Viewed by employer.");
      changed = true;
    }
  });
  if (changed) saveArray(STORAGE.applications, applications);
}

let candidateSkillsDraft = [];
let candidateLicensesDraft = [];
let candidateCertificationsDraft = [];
let jobSkillsDraft = [];
let workExperienceDraft = [];
let editingJobId = null;
let activeEmployerJobId = null;
let employerJobsView = "list";
let jobsFilterTitle = "";
let jobsFilterLocation = "";
let activeJobDetailId = null;
let activeRecommendationJobId = null;
let candidateRecTier = "basic";
let myJobsTab = "saved";
let activeThreadKey = null;
let threadFilter = "all";
let messagesOnlineStatus = true;
let applicationsTab = "all";
let applicationsJobFilterId = "";
let applicationsSearchText = "";
let interviewRange = "week";
let activeSourcingJobId = null;
let analyticsRangeDays = 30;
let sourcingSessionCandidates = new Set();
let prefillInterviewApplicationId = null;

/* ---------- DOM helpers ---------- */
function $(id) { return document.getElementById(id); }
function show(el, visible = true) { if (el) el.classList.toggle("hidden", !visible); }

/* ---------- Fuzzy search ---------- */
function levenshtein(a, b) {
  a = (a || "").toLowerCase();
  b = (b || "").toLowerCase();
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const dp = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) dp[j] = j;
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      if (a[i - 1] === b[j - 1]) {
        dp[j] = prev;
      } else {
        dp[j] = 1 + Math.min(prev, dp[j], dp[j - 1]);
      }
      prev = tmp;
    }
  }
  return dp[b.length];
}

function expandWithSynonyms(text) {
  const lower = ` ${text.toLowerCase()} `;
  const expansions = new Set([text.toLowerCase()]);
  synonymGroups.forEach((group) => {
    if (group.some((term) => lower.includes(` ${term} `) || lower.includes(term))) {
      group.forEach((term) => expansions.add(term));
    }
  });
  return Array.from(expansions);
}

function tokenize(text) {
  return (text || "")
    .toLowerCase()
    .split(/[\s,;/]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function fuzzyTokenMatches(token, targetText) {
  if (!token) return true;
  const target = (targetText || "").toLowerCase();
  if (!target) return false;
  if (target.includes(token)) return true;

  const targetTokens = tokenize(target);
  if (targetTokens.some((t) => t.includes(token) || token.includes(t))) return true;

  if (token.length >= 4) {
    const tolerance = Math.max(1, Math.floor(token.length * 0.25));
    if (targetTokens.some((t) => Math.abs(t.length - token.length) <= tolerance + 1 && levenshtein(token, t) <= tolerance)) {
      return true;
    }
  }
  return false;
}

function fuzzyMatch(query, targetText) {
  if (!query || !query.trim()) return true;
  const expanded = expandWithSynonyms(query);
  const target = (targetText || "").toLowerCase();
  for (const phrase of expanded) {
    if (!phrase) continue;
    if (target.includes(phrase)) return true;
  }
  const queryTokens = tokenize(query);
  if (!queryTokens.length) return true;
  return queryTokens.every((token) => fuzzyTokenMatches(token, target));
}

/* ---------- Routing ---------- */
const PAGE_IDS = [
  "landingPage",
  "candidateAuthPage",
  "employerAuthPage",
  "candidateFindJobsPage",
  "candidateMyJobsPage",
  "candidateProfilePage",
  "employerDashboardPage",
  "employerPostJobPage",
  "employerCandidatesPage",
  "employerApplicationsPage",
  "employerInterviewsPage",
  "employerSourcingPage",
  "employerToolsPage",
  "employerAnalyticsPage",
  "employerCompanyPage",
  "messagesPage",
  "candidateApplyConfirmPage",
  "candidateApplicationDetailPage",
  "companiesPage",
  "companyDetailPage",
  "premiumPage"
];

function navigateTo(pageId) {
  PAGE_IDS.forEach((id) => show($(id), id === pageId));
  document.querySelectorAll(".nav-link[data-page]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.page === pageId);
  });
  updateEmployerSidebarActive(pageId);
  closeJobDetail();
  closeCandidateDetail();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateEmployerSidebarActive(pageId) {
  const sidebarMap = {
    employerDashboardPage: "employerDashboardPage",
    employerApplicationsPage: "employerDashboardPage",
    employerPostJobPage: null,
    employerCandidatesPage: "employerCandidatesPage",
    employerSourcingPage: "employerSourcingPage",
    employerInterviewsPage: "employerInterviewsPage",
    employerAnalyticsPage: "employerAnalyticsPage",
    employerToolsPage: "employerToolsPage",
    employerCompanyPage: "employerCompanyPage",
    messagesPage: "messagesPage",
    premiumPage: "premiumPage"
  };
  const sidebarActive = sidebarMap[pageId] !== undefined ? sidebarMap[pageId] : pageId;
  document.querySelectorAll(".sidebar-link").forEach((btn) => {
    btn.classList.toggle("active", sidebarActive && btn.dataset.page === sidebarActive);
  });
}

function runPageInit(page) {
  if (page === "candidateProfilePage") loadCandidateForm();
  if (page === "candidateMyJobsPage") renderMyJobs();
  if (page === "candidateFindJobsPage") renderFindJobs();
  if (page === "employerDashboardPage") {
    employerJobsView = "list";
    activeEmployerJobId = null;
    renderEmployerJobsPage();
  }
  if (page === "employerPostJobPage" && !editingJobId) loadJobForm(null);
  if (page === "employerCandidatesPage") {
    renderCandidatesGrid();
    refreshRecommendationJobSelector();
  }
  if (page === "employerApplicationsPage") renderApplicationsPage();
  if (page === "employerInterviewsPage") renderInterviewsPage();
  if (page === "employerSourcingPage") renderSourcingPage();
  if (page === "employerAnalyticsPage") renderEmployerAnalytics();
  if (page === "employerToolsPage") renderIntegrations();
  if (page === "employerCompanyPage") loadEmployerCompanyForm();
  if (page === "messagesPage") renderMessagesPage();
  if (page === "companiesPage") renderCompaniesPage();
  if (page === "premiumPage") renderPremiumPage();
}

/* ---------- Header / nav visibility ---------- */
function refreshChrome() {
  const isCandidate = currentUser && currentUser.role === "Candidate";
  const isEmployer = currentUser && currentUser.role === "Employer";
  document.body.classList.toggle("employer-mode", isEmployer);
  show($("candidateNav"), isCandidate);
  show($("employerTopNav"), isEmployer);
  show($("employerSidebar"), isEmployer);
  show($("logoutBtn"), isCandidate);
  refreshMessageBadges();
}

function refreshMembershipUI() {
  const employerBtn = $("employerMembershipBtn");
  const isPremium = !!(currentUser && currentUser.membership);
  const badge = $("profileMembershipBadge");
  if (badge) {
    badge.classList.toggle("premium", isPremium);
    badge.classList.toggle("standard", !isPremium);
    badge.innerHTML = isPremium
      ? '<svg viewBox="0 0 24 24" width="11" height="11" fill="#f5b400" stroke="#f5b400" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg> Premium Member'
      : "Standard Member";
  }
  refreshEmployerCompanyBadge();
  if (employerBtn) {
    employerBtn.classList.toggle("is-premium", isPremium);
    employerBtn.textContent = isPremium ? "★ Premium Member" : "Upgrade to Premium";
  }
}

function refreshEmployerCompanyBadge() {
  const badge = $("employerCompanyBadge");
  if (!badge) return;
  const isPremium = !!(currentUser && currentUser.membership);
  badge.classList.toggle("premium", isPremium);
  badge.classList.toggle("standard", !isPremium);
  badge.textContent = isPremium ? "Premium Employer" : "Standard Employer";
}

function loadEmployerCompanyForm() {
  if (!currentUser || currentUser.role !== "Employer") return;
  const user = users.find((u) => u.id === currentUser.id);
  if (!user) return;
  $("employerCompanyName").value = user.company || "";
  $("employerCompanyEmail").value = user.contactEmail || user.email || "";
  $("employerCompanyWebsite").value = user.companyWebsite || "";
  $("employerCompanyIndustry").value = user.companyIndustry || "";
  $("employerCompanySize").value = user.companySize || "";
  $("employerCompanyLocation").value = user.companyLocation || "";
  $("employerCompanyDescription").value = user.companyDescription || "";
  setStatus($("employerCompanyStatus"), "", null);
  refreshEmployerCompanyBadge();
}

function saveEmployerCompanyForm(event) {
  event.preventDefault();
  if (!currentUser || currentUser.role !== "Employer") return;
  const user = users.find((u) => u.id === currentUser.id);
  if (!user) return;

  const companyName = $("employerCompanyName").value.trim();
  const contactEmail = $("employerCompanyEmail").value.trim();
  if (!companyName) {
    setStatus($("employerCompanyStatus"), "Company name is required.", "error");
    return;
  }
  if (!contactEmail) {
    setStatus($("employerCompanyStatus"), "Contact email is required.", "error");
    return;
  }

  const prevCompany = user.company || "";
  user.company = companyName;
  user.contactEmail = contactEmail;
  user.companyWebsite = $("employerCompanyWebsite").value.trim();
  user.companyIndustry = $("employerCompanyIndustry").value.trim();
  user.companySize = $("employerCompanySize").value;
  user.companyLocation = $("employerCompanyLocation").value.trim();
  user.companyDescription = $("employerCompanyDescription").value.trim();

  saveArray(STORAGE.users, users);
  currentUser.company = companyName;
  saveSessionUser(currentUser);

  if (prevCompany !== companyName) {
    jobs.forEach((job) => {
      if (job.userId === currentUser.id) job.company = companyName;
    });
    saveArray(STORAGE.jobs, jobs);
  }

  setStatus($("employerCompanyStatus"), "Company profile saved successfully.", "ok");
  refreshEmployerCompanyBadge();
  if ($("jobCompany")) $("jobCompany").value = companyName;
  if (activeCompanyId && activeCompanyId.toLowerCase() === companyName.toLowerCase()) {
    renderCompanyDetail();
  }
}

function toggleMembership() {
  if (!currentUser) return;
  /* Membership upgrades are now handled via the Premium page payment flow.
     This helper now just navigates the user there. */
  navigateTo("premiumPage");
  renderPremiumPage();
}

function setMembership(active) {
  if (!currentUser) return;
  const user = users.find((u) => u.id === currentUser.id);
  if (!user) return;
  user.membership = !!active;
  saveArray(STORAGE.users, users);
  currentUser.membership = user.membership;
  saveSessionUser(currentUser);
  refreshMembershipUI();
  if (currentUser.role === "Candidate") {
    if (typeof renderFindJobs === "function") renderFindJobs();
  } else if (currentUser.role === "Employer") {
    if (typeof renderRecommendedCandidates === "function") renderRecommendedCandidates();
  }
}

/* ============================================================
   PREMIUM / MEMBERSHIP PAGE
   ============================================================ */
let billingCycle = "monthly";

const PREMIUM_PLANS = {
  Candidate: {
    title: "Supercharge your job search",
    subtitle: "Choose the plan that best fits your career goals. Premium members get hired 3x faster on average.",
    whyTitle: "Why choose Premium?",
    basic: {
      tagline: "Essential tools to get your profile out there and start applying.",
      features: [
        "Basic job matching algorithms",
        "Standard profile visibility",
        "Apply to up to 50 jobs per month",
        "Standard email support"
      ]
    },
    premium: {
      tagline: "Advanced tools to stand out and find your perfect match.",
      features: [
        "Advanced semantic fuzzy search & matching",
        "Priority profile visibility to employers",
        "Unlimited job applications",
        "See exact match scores for every job",
        "Featured badge on your profile",
        "24/7 Priority support"
      ],
      pricing: { monthly: 19, yearlyMonthly: 15, yearlyTotal: 180 }
    },
    why: [
      { icon: "bolt", title: "Get noticed faster", body: "Your profile appears at the top of employer search results, increasing your chances of getting hired." },
      { icon: "star", title: "Better matches", body: "See your exact compatibility scores with jobs so you know where to focus your energy." },
      { icon: "check", title: "Apply without limits", body: "Never hit an application cap. Apply to as many dream jobs as you want each month." }
    ]
  },
  Employer: {
    title: "Supercharge your hiring",
    subtitle: "Choose the plan that fits your company's hiring needs. Premium employers find perfect matches 3x faster.",
    whyTitle: "Why choose Premium for Employers?",
    basic: {
      tagline: "Essential tools to post jobs and review top applications.",
      features: [
        "Post up to 3 active jobs",
        "View top 10 candidate matches per job",
        "Basic semantic search capabilities",
        "Standard company profile",
        "Email support"
      ]
    },
    premium: {
      tagline: "Advanced tools to build your team with the best talent.",
      features: [
        "Unlimited active job posts",
        "Unlock ALL candidate matches",
        "Advanced semantic search with custom filtering",
        "Featured company profile",
        "Direct messaging to passive candidates",
        "24/7 Priority support & account manager"
      ],
      pricing: { monthly: 199, yearlyMonthly: 159, yearlyTotal: 1908 }
    },
    why: [
      { icon: "bolt", title: "Fill roles faster", body: "Access our entire talent pool and reach out directly to candidates before they even apply." },
      { icon: "star", title: "Better quality hires", body: "Our advanced semantic matching ensures you're only spending time on highly qualified candidates." },
      { icon: "check", title: "Enhance your brand", body: "Stand out with a featured company profile that showcases your culture to top talent." }
    ]
  }
};

function renderPremiumPage() {
  if (!currentUser) {
    navigateTo("landingPage");
    return;
  }
  const role = currentUser.role;
  const plan = PREMIUM_PLANS[role];
  if (!plan) return;

  $("premiumTitle").textContent = plan.title;
  $("premiumSubtitle").textContent = plan.subtitle;

  /* Billing toggle state */
  document.querySelectorAll("#billingToggle .billing-opt").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.billing === billingCycle);
  });

  /* Basic */
  $("planBasicTagline").textContent = plan.basic.tagline;
  $("planBasicFeatures").innerHTML = plan.basic.features.map(featureItemHtml).join("");

  /* Premium */
  $("planPremiumTagline").textContent = plan.premium.tagline;
  $("planPremiumFeatures").innerHTML = plan.premium.features.map(featureItemHtml).join("");

  const isYearly = billingCycle === "yearly";
  const price = isYearly ? plan.premium.pricing.yearlyMonthly : plan.premium.pricing.monthly;
  $("planPremiumAmount").textContent = `$${price}`;
  const billedEl = $("planPremiumBilled");
  if (isYearly) {
    billedEl.classList.remove("hidden");
    billedEl.textContent = `Billed $${plan.premium.pricing.yearlyTotal.toLocaleString()} yearly`;
  } else {
    billedEl.classList.add("hidden");
  }

  /* Current plan state */
  const isPremium = !!currentUser.membership;
  const basicCta = $("planBasicCta");
  const premCta = $("planPremiumCta");
  const premLabel = $("planPremiumCtaLabel");
  if (isPremium) {
    basicCta.classList.remove("is-current");
    basicCta.textContent = "Downgrade";
    premCta.classList.add("is-current");
    premLabel.textContent = "Current Plan";
  } else {
    basicCta.classList.add("is-current");
    basicCta.textContent = "Current Plan";
    premCta.classList.remove("is-current");
    premLabel.textContent = "Upgrade to Premium";
  }

  /* Why choose Premium */
  $("whyPremiumTitle").lastChild.textContent = " " + plan.whyTitle;
  $("whyPremiumGrid").innerHTML = plan.why.map((w) => `
    <div class="why-item">
      <div class="why-icon">${whyIconSvg(w.icon)}</div>
      <h4>${escapeHtml(w.title)}</h4>
      <p>${escapeHtml(w.body)}</p>
    </div>
  `).join("");
}

function featureItemHtml(text) {
  return `<li>
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
    <span>${escapeHtml(text)}</span>
  </li>`;
}

function whyIconSvg(name) {
  if (name === "bolt") return '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>';
  if (name === "star") return '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>';
  return '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
}

/* ---------- Payment modal ---------- */
function openPaymentModal() {
  if (!currentUser) return;
  if (currentUser.membership) return; // already premium
  const plan = PREMIUM_PLANS[currentUser.role];
  if (!plan) return;
  const isYearly = billingCycle === "yearly";
  const price = isYearly ? plan.premium.pricing.yearlyMonthly : plan.premium.pricing.monthly;
  const planNameEl = $("paymentPlanName");
  if (planNameEl) {
    planNameEl.textContent = currentUser.role === "Employer" ? "Employer Premium Plan" : "Candidate Premium Plan";
  }
  $("paymentPlanAmount").textContent = `$${price}/mo`;

  /* Reset form/success states */
  $("paymentForm").reset();
  show($("paymentFormView"), true);
  show($("paymentSuccessView"), false);

  show($("paymentModal"), true);
}

function closePaymentModal() {
  show($("paymentModal"), false);
}

function handlePaymentSubmit(e) {
  e.preventDefault();
  /* Mock payment validation */
  const num = $("cardNumber").value.replace(/\s+/g, "");
  const exp = $("cardExpiry").value.trim();
  const cvc = $("cardCvc").value.trim();
  if (num.length < 12 || !/^\d{2}\/\d{2}$/.test(exp) || cvc.length < 3) {
    /* In a real app we'd show field-level errors; for the mock flow, accept anything non-empty */
    if (!num || !exp || !cvc) {
      alert("Please complete all card details to continue.");
      return;
    }
  }

  /* Activate membership and show success */
  setMembership(true);
  show($("paymentFormView"), false);
  show($("paymentSuccessView"), true);

  setTimeout(() => {
    closePaymentModal();
    renderPremiumPage();
    if (currentUser.role === "Employer" && typeof renderRecommendedCandidates === "function") {
      renderRecommendedCandidates();
    }
  }, 1800);
}

/* ---------- Auth ---------- */
function registerUser({ name, email, password, role, company }, statusEl) {
  const normalizedEmail = (email || "").trim().toLowerCase();
  if (!normalizedEmail) {
    setStatus(statusEl, "Email is required.", "error");
    return null;
  }
  if (users.some((u) => u.email === normalizedEmail)) {
    setStatus(statusEl, "This email is already registered.", "error");
    return null;
  }
  const user = {
    id: createId("user"),
    name: (name || "").trim() || normalizedEmail.split("@")[0],
    email: normalizedEmail,
    password,
    role,
    company: company ? company.trim() : "",
    membership: false,
    createdAt: Date.now()
  };
  users.push(user);
  saveArray(STORAGE.users, users);
  setStatus(statusEl, "Account created. You can sign in now.", "ok");
  return user;
}

function attemptLogin(email, password, expectedRole, statusEl) {
  const normalizedEmail = (email || "").trim().toLowerCase();
  const matched = users.find((u) => u.email === normalizedEmail && u.password === password);
  if (!matched) {
    setStatus(statusEl, "Invalid email or password.", "error");
    return false;
  }
  if (matched.role !== expectedRole) {
    setStatus(
      statusEl,
      `This account is registered as ${matched.role}. Please use the ${matched.role} sign-in.`,
      "error"
    );
    return false;
  }
  currentUser = {
    id: matched.id,
    name: matched.name,
    email: matched.email,
    role: matched.role,
    company: matched.company || "",
    membership: !!matched.membership
  };
  saveSessionUser(currentUser);
  setStatus(statusEl, "Login successful.", "ok");
  enterApp();
  return true;
}

function doLogout() {
  currentUser = null;
  saveSessionUser(null);
  candidateSkillsDraft = [];
  candidateLicensesDraft = [];
  candidateCertificationsDraft = [];
  jobSkillsDraft = [];
  workExperienceDraft = [];
  editingJobId = null;
  document.body.classList.remove("employer-mode", "sidebar-collapsed");
  refreshChrome();
  navigateTo("landingPage");
}

function setStatus(el, message, kind) {
  if (!el) return;
  el.textContent = message || "";
  el.classList.remove("error", "warn");
  if (kind === "error") el.classList.add("error");
  if (kind === "warn") el.classList.add("warn");
}

/* ---------- Candidate profile ---------- */
function getCurrentCandidateProfile() {
  if (!currentUser || currentUser.role !== "Candidate") return null;
  return candidates.find((c) => c.userId === currentUser.id) || null;
}

function normalizeEducation(value) {
  if (!value) return "";
  const map = { Bachelor: "Bachelor's Degree", Master: "Master's Degree" };
  return map[value] || value;
}

function computeExperienceYears(workExp) {
  if (!workExp || !workExp.length) return 0;
  const currentYear = new Date().getFullYear();
  let total = 0;
  workExp.forEach((w) => {
    const start = Number(w.startYear) || currentYear;
    const end = w.endYear ? Number(w.endYear) : currentYear;
    if (end >= start) total += end - start + 1;
  });
  return Math.min(total, 50);
}

function loadCandidateForm() {
  const profile = getCurrentCandidateProfile();
  candidateSkillsDraft = profile ? [...(profile.skills || [])] : [];
  candidateLicensesDraft = profile ? [...(profile.licenses || [])] : [];
  candidateCertificationsDraft = profile ? [...(profile.certifications || [])] : [];
  workExperienceDraft = profile ? profile.workExperience.map((w) => ({ ...w })) : [];

  $("candidateName").value = profile ? profile.name : (currentUser ? currentUser.name : "");
  $("candidateEmail").value = profile ? profile.email : (currentUser ? currentUser.email : "");
  $("candidateContact").value = profile ? profile.contact || "" : "";
  $("candidateLocation").value = profile ? profile.preferredLocation || "" : "";
  $("candidateEducation").value = profile ? normalizeEducation(profile.education || "") : "";
  $("candidateMajor").value = profile ? profile.major || "" : "";
  $("candidateUniversity").value = profile ? profile.university || "" : "";
  $("candidateWorkMode").value = profile ? profile.preferredWorkMode || "Any" : "Any";

  const certPreview = $("certificatePreviewName");
  if (certPreview) certPreview.textContent = profile && profile.certificateFileName ? profile.certificateFileName : "";
  const resumePreview = $("resumePreviewName");
  if (resumePreview) resumePreview.textContent = profile && profile.resumeFileName ? profile.resumeFileName : "";

  renderSkillChips($("candidateSkillsChips"), candidateSkillsDraft, "candidate");
  renderSkillChips($("candidateLicensesChips"), candidateLicensesDraft, "licenses");
  renderSkillChips($("candidateCertificationsChips"), candidateCertificationsDraft, "certifications");
  renderWorkExperience();
  refreshMembershipUI();
}

function getChipDraft(scope) {
  if (scope === "candidate") return candidateSkillsDraft;
  if (scope === "licenses") return candidateLicensesDraft;
  if (scope === "certifications") return candidateCertificationsDraft;
  return jobSkillsDraft;
}

function setChipDraft(scope, list) {
  if (scope === "candidate") candidateSkillsDraft = list;
  else if (scope === "licenses") candidateLicensesDraft = list;
  else if (scope === "certifications") candidateCertificationsDraft = list;
  else jobSkillsDraft = list;
}

function renderSkillChips(container, list, scope) {
  if (!container) return;
  container.innerHTML = "";
  list.forEach((skill) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.innerHTML = `${escapeHtml(skill)} <button type="button" aria-label="Remove ${escapeHtml(skill)}">&times;</button>`;
    chip.querySelector("button").addEventListener("click", () => {
      const next = getChipDraft(scope).filter((s) => s !== skill);
      setChipDraft(scope, next);
      renderSkillChips(container, next, scope);
    });
    container.appendChild(chip);
  });
}

function skillMatches(a, b) {
  return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
}

function skillListIncludes(list, value) {
  return (list || []).some((s) => skillMatches(s, value));
}

function attachChipInput(input, container, scope) {
  if (!input) return;
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      const value = input.value.replace(/,$/, "").trim();
      if (!value) return;
      const list = getChipDraft(scope);
      if (!skillListIncludes(list, value)) {
        list.push(value);
        setChipDraft(scope, list);
        renderSkillChips(container, list, scope);
      }
      input.value = "";
    } else if (event.key === "Backspace" && !input.value) {
      const list = getChipDraft(scope);
      list.pop();
      setChipDraft(scope, list);
      renderSkillChips(container, list, scope);
    }
  });
}

function renderWorkExperience() {
  const wrap = $("workExperienceList");
  wrap.innerHTML = "";
  if (!workExperienceDraft.length) {
    const empty = document.createElement("div");
    empty.className = "work-exp-empty";
    empty.textContent = "No work experience added yet.";
    wrap.appendChild(empty);
    return;
  }
  workExperienceDraft
    .slice()
    .sort((a, b) => (b.startYear || 0) - (a.startYear || 0))
    .forEach((entry) => {
      const card = document.createElement("div");
      card.className = "work-exp-item";
      const end = entry.endYear ? entry.endYear : "Present";
      card.innerHTML = `
        <div>
          <h5>${escapeHtml(entry.title)} <span style="color:var(--muted); font-weight:500;">@ ${escapeHtml(entry.company)}</span></h5>
          <p>${escapeHtml(String(entry.startYear || ""))} - ${escapeHtml(String(end))}${entry.description ? " &middot; " + escapeHtml(entry.description) : ""}</p>
        </div>
        <button type="button" class="work-exp-remove" data-id="${entry.id}">Remove</button>
      `;
      card.querySelector(".work-exp-remove").addEventListener("click", () => {
        workExperienceDraft = workExperienceDraft.filter((w) => w.id !== entry.id);
        renderWorkExperience();
      });
      wrap.appendChild(card);
    });
}

function saveCandidateProfile(event) {
  event.preventDefault();
  if (!currentUser) return;
  const existing = getCurrentCandidateProfile();
  const profile = {
    id: existing?.id || createId("candidate"),
    userId: currentUser.id,
    name: $("candidateName").value.trim(),
    email: $("candidateEmail").value.trim().toLowerCase(),
    contact: $("candidateContact").value.trim(),
    education: $("candidateEducation").value,
    major: $("candidateMajor").value.trim(),
    university: $("candidateUniversity").value.trim(),
    experience: computeExperienceYears(workExperienceDraft) || (existing ? existing.experience : 0),
    skills: [...candidateSkillsDraft],
    licenses: [...candidateLicensesDraft],
    certifications: [...candidateCertificationsDraft],
    preferredWorkMode: $("candidateWorkMode").value,
    preferredLocation: $("candidateLocation").value.trim(),
    workExperience: workExperienceDraft.map((w) => ({ ...w })),
    certificateFileName: existing?.certificateFileName || "",
    resumeFileName: existing?.resumeFileName || ""
  };

  const certInput = $("candidateCertificate");
  if (certInput && certInput.files && certInput.files[0]) {
    profile.certificateFileName = certInput.files[0].name;
  }
  const resumeInput = $("candidateResume");
  if (resumeInput && resumeInput.files && resumeInput.files[0]) {
    profile.resumeFileName = resumeInput.files[0].name;
  }

  const idx = candidates.findIndex((c) => c.userId === currentUser.id);
  if (idx >= 0) candidates[idx] = profile;
  else candidates.push(profile);
  saveArray(STORAGE.candidates, candidates);

  setStatus($("candidateStatus"), "Profile saved successfully.", "ok");
  renderFindJobs();
  renderRecommendedCandidates();
}

/* ---------- Resume parser ---------- */
function extractValue(text, labels) {
  const regex = new RegExp(`(?:${labels.join("|")})\\s*[:\\-]\\s*(.+)`, "i");
  const match = text.match(regex);
  return match ? match[1].trim() : "";
}

function handleResumeExtraction() {
  const fileInput = $("candidateResume");
  const file = fileInput.files[0];
  if (!file) {
    setStatus($("candidateStatus"), "Please select a resume image first.", "warn");
    return;
  }

  const applyExtracted = (content) => {
    const cleaned = String(content || "");
    const parsedName = extractValue(cleaned, ["name", "full name"]);
    const parsedEducation = extractValue(cleaned, ["education", "qualification"]);
    const parsedMajor = extractValue(cleaned, ["major", "field", "field of study"]);
    const parsedSkills = extractValue(cleaned, ["skills", "technical skills"]);
    const parsedContact = extractValue(cleaned, ["contact", "email", "phone"]);

    if (parsedName) $("candidateName").value = parsedName;
    if (parsedContact) $("candidateContact").value = parsedContact;
    if (parsedEducation && educationRank[parsedEducation]) $("candidateEducation").value = parsedEducation;
    if (parsedMajor) $("candidateMajor").value = parsedMajor;
    if (parsedSkills) {
      const incoming = parsedSkills
        .split(/[,\u2022\n;]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      incoming.forEach((s) => {
        if (!skillListIncludes(candidateSkillsDraft, s)) candidateSkillsDraft.push(s);
      });
      renderSkillChips($("candidateSkillsChips"), candidateSkillsDraft, "candidate");
    }
    setStatus($("candidateStatus"), "Resume parsed - review the fields and save.", "ok");
  };

  if (file.type && file.type.startsWith("image/")) {
    runResumeOcr(file).then(applyExtracted).catch((err) => {
      setStatus(
        $("candidateStatus"),
        `OCR failed: ${err && err.message ? err.message : "could not read image"}.`,
        "error"
      );
    });
  } else {
    const reader = new FileReader();
    reader.onload = () => applyExtracted(String(reader.result || ""));
    reader.onerror = () => setStatus($("candidateStatus"), "Could not read the file.", "error");
    reader.readAsText(file);
  }
}

async function runResumeOcr(file) {
  if (typeof Tesseract === "undefined") {
    throw new Error("OCR engine not loaded. Check your internet connection and reload the page.");
  }
  setStatus($("candidateStatus"), "Reading resume image (OCR)... this may take 10-30 seconds.", "warn");
  const { data } = await Tesseract.recognize(file, "eng", {
    logger: (msg) => {
      if (msg.status === "recognizing text" && typeof msg.progress === "number") {
        const pct = Math.round(msg.progress * 100);
        setStatus($("candidateStatus"), `Reading resume image... ${pct}%`, "warn");
      }
    }
  });
  return data && data.text ? data.text : "";
}

/* ---------- Work experience modal ---------- */
function openWorkExpModal() {
  $("workExpForm").reset();
  show($("workExpModal"), true);
  $("workExpTitle").focus();
}
function closeWorkExpModal() {
  show($("workExpModal"), false);
}
function handleWorkExpSubmit(event) {
  event.preventDefault();
  const entry = {
    id: createId("work"),
    title: $("workExpTitle").value.trim(),
    company: $("workExpCompany").value.trim(),
    startYear: Number($("workExpStart").value) || null,
    endYear: $("workExpEnd").value ? Number($("workExpEnd").value) : null,
    description: $("workExpDescription").value.trim()
  };
  if (!entry.title || !entry.company) return;
  workExperienceDraft.push(entry);
  renderWorkExperience();
  closeWorkExpModal();
}

/* ---------- Employer jobs ---------- */
function ownedJobs() {
  if (!currentUser || currentUser.role !== "Employer") return [];
  return jobs.filter((j) => j.userId === currentUser.id);
}

function loadJobForm(jobId) {
  $("jobForm").reset();
  jobSkillsDraft = [];
  const submitBtn = $("jobSubmitBtn");
  if (!jobId) {
    editingJobId = null;
    $("jobFormTitle").textContent = "Create Job Posting";
    $("jobCompany").value = (currentUser && currentUser.company) || "";
    if (submitBtn) submitBtn.textContent = "Post Job";
    show($("cancelJobEditBtn"), false);
  } else {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;
    editingJobId = job.id;
    $("jobFormTitle").textContent = "Edit Job Posting";
    $("jobTitle").value = job.title;
    $("jobCompany").value = job.company;
    $("jobDescription").value = job.description;
    $("jobEducation").value = job.requiredEducation;
    $("jobExperience").value = String(job.requiredExperience);
    $("jobWorkMode").value = job.workMode;
    $("jobType").value = job.jobType || "Full-time";
    $("jobLocation").value = job.location;
    $("jobSalaryMin").value = job.salaryMin || "";
    $("jobSalaryMax").value = job.salaryMax || "";
    jobSkillsDraft = [...job.requiredSkills];
    if (submitBtn) submitBtn.textContent = "Save Changes";
    show($("cancelJobEditBtn"), true);
  }
  renderSkillChips($("jobSkillsChips"), jobSkillsDraft, "job");
}

function saveJob(event) {
  event.preventDefault();
  if (!currentUser || currentUser.role !== "Employer") return;
  const payload = {
    id: editingJobId || createId("job"),
    userId: currentUser.id,
    title: $("jobTitle").value.trim(),
    company: $("jobCompany").value.trim(),
    description: $("jobDescription").value.trim(),
    requiredEducation: $("jobEducation").value,
    requiredExperience: Number($("jobExperience").value) || 0,
    requiredSkills: [...jobSkillsDraft],
    workMode: $("jobWorkMode").value,
    jobType: $("jobType").value,
    location: $("jobLocation").value.trim(),
    salaryMin: $("jobSalaryMin").value ? Number($("jobSalaryMin").value) : null,
    salaryMax: $("jobSalaryMax").value ? Number($("jobSalaryMax").value) : null,
    createdAt: Date.now()
  };

  if (editingJobId) {
    jobs = jobs.map((j) => (j.id === editingJobId ? { ...j, ...payload, id: editingJobId } : j));
  } else {
    jobs.push(payload);
  }
  saveArray(STORAGE.jobs, jobs);
  const wasEdit = !!editingJobId;
  editingJobId = null;
  jobSkillsDraft = [];
  setStatus($("jobStatus"), wasEdit ? "Changes saved successfully." : "Job posted successfully.", "ok");
  loadJobForm(null);
  renderEmployerJobsPage();
  refreshRecommendationJobSelector();
  navigateTo("employerDashboardPage");
}

function deleteJob(jobId) {
  if (!confirm("Delete this job posting?")) return;
  jobs = jobs.filter((j) => j.id !== jobId);
  saveArray(STORAGE.jobs, jobs);
  applications = applications.filter((a) => a.jobId !== jobId);
  saveArray(STORAGE.applications, applications);
  if (activeEmployerJobId === jobId) {
    activeEmployerJobId = null;
    employerJobsView = "list";
  }
  renderEmployerJobsPage();
  refreshRecommendationJobSelector();
}

function formatAppliedDate(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function applicantDisplayStatus(app) {
  const s = app.employerStatus || "applied";
  if (s === "applied" && app.viewedByEmployer) return { label: "Reviewed", cls: "reviewed" };
  if (s === "applied") return { label: "Pending", cls: "pending" };
  if (s === "shortlisted") return { label: "Reviewed", cls: "reviewed" };
  if (s === "interview_scheduled") return { label: "Interview", cls: "interview" };
  if (s === "rejected") return { label: "Rejected", cls: "rejected" };
  return { label: APP_STATUS_LABELS[s] || s, cls: "pending" };
}

function applicationsForJob(jobId) {
  return applications
    .filter((a) => a.jobId === jobId && a.status === "applied" && !a.candidateArchived)
    .sort((a, b) => b.createdAt - a.createdAt);
}

function filterEmployerJobs(list) {
  let filtered = list.slice();
  if (jobsFilterTitle.trim()) {
    const q = jobsFilterTitle.trim();
    filtered = filtered.filter((j) => fuzzyMatch(q, `${j.title} ${j.company}`));
  }
  if (jobsFilterLocation.trim()) {
    const q = jobsFilterLocation.trim();
    filtered = filtered.filter((j) => fuzzyMatch(q, j.location || ""));
  }
  return filtered;
}

function openEmployerJobDetail(jobId) {
  activeEmployerJobId = jobId;
  employerJobsView = "detail";
  renderEmployerJobsPage();
}

function closeEmployerJobDetail() {
  employerJobsView = "list";
  activeEmployerJobId = null;
  renderEmployerJobsPage();
}

function renderEmployerJobsPage() {
  if (!currentUser || currentUser.role !== "Employer") return;
  const myJobs = ownedJobs();
  const emptyHero = $("employerJobsEmptyHero");
  const shell = $("employerJobsShell");
  const listView = $("employerJobsListView");
  const detailView = $("employerJobDetailView");

  if (!myJobs.length) {
    show(emptyHero, true);
    show(shell, false);
    return;
  }
  show(emptyHero, false);
  show(shell, true);

  if (employerJobsView === "detail" && activeEmployerJobId) {
    show(listView, false);
    show(detailView, true);
    renderEmployerJobDetail(activeEmployerJobId);
    return;
  }

  show(listView, true);
  show(detailView, false);

  const filtered = filterEmployerJobs(myJobs);
  const countEl = $("jobsResultCount");
  if (countEl) countEl.textContent = `${filtered.length} result${filtered.length === 1 ? "" : "s"}`;

  const tbody = $("employerJobsTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";
  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="4"><div class="empty">No jobs match your filters.</div></td></tr>';
    return;
  }

  filtered.forEach((job) => {
    const tr = document.createElement("tr");
    tr.className = "job-row-clickable";
    tr.innerHTML = `
      <td class="job-title-cell">
        <strong>${escapeHtml(job.title)}</strong>
        <small>${escapeHtml(job.workMode)}</small>
      </td>
      <td>${escapeHtml(job.location)}</td>
      <td><span class="job-status-active">Active</span></td>
      <td>
        <div class="jobs-row-actions">
          <button type="button" class="edit-link" data-edit-job="${escapeHtml(job.id)}">Edit</button>
          <button type="button" class="view-link" data-view-applicants="${escapeHtml(job.id)}">View Applicants</button>
        </div>
      </td>
    `;
    tr.addEventListener("click", (e) => {
      if (e.target.closest("[data-edit-job]") || e.target.closest("[data-view-applicants]")) return;
      openEmployerJobDetail(job.id);
    });
    tr.querySelector("[data-edit-job]").addEventListener("click", (e) => {
      e.stopPropagation();
      loadJobForm(job.id);
      navigateTo("employerPostJobPage");
    });
    tr.querySelector("[data-view-applicants]").addEventListener("click", (e) => {
      e.stopPropagation();
      openEmployerJobDetail(job.id);
    });
    tbody.appendChild(tr);
  });
}

function renderEmployerJobDetail(jobId) {
  const job = jobs.find((j) => j.id === jobId);
  if (!job) return;
  const apps = applicationsForJob(jobId);

  const header = $("employerJobDetailHeader");
  if (header) {
    header.innerHTML = `
      <div>
        <h2>${escapeHtml(job.title)}</h2>
        <div class="meta">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"></rect><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          ${escapeHtml(job.workMode)} &bull; ${escapeHtml(job.location)}
        </div>
      </div>
      <span class="applicants-count-badge">Total Applicants: ${apps.length}</span>
    `;
  }

  const tbody = $("employerJobApplicantsBody");
  if (!tbody) return;
  tbody.innerHTML = "";
  if (!apps.length) {
    tbody.innerHTML = '<tr><td colspan="4"><div class="empty">No applicants yet for this role.</div></td></tr>';
    return;
  }

  apps.forEach((app) => {
    const cand = getCandidateInfo(app.candidateUserId);
    if (!cand) return;
    const initials = (cand.name || "?").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
    const status = applicantDisplayStatus(app);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <div class="applicant-cell">
          <span class="applicant-avatar">${escapeHtml(initials)}</span>
          <div>
            <strong>${escapeHtml(cand.name)}</strong>
            <small>${escapeHtml(cand.email || "")}</small>
          </div>
        </div>
      </td>
      <td>
        <span class="applied-date-cell">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          ${escapeHtml(formatAppliedDate(app.createdAt))}
        </span>
      </td>
      <td><span class="app-pill ${status.cls}">${escapeHtml(status.label)}</span></td>
      <td><button type="button" class="view-profile-link" data-view-profile="${escapeHtml(app.candidateUserId)}">View Profile</button></td>
    `;
    tr.querySelector("[data-view-profile]").addEventListener("click", () => {
      markCandidateViewedByEmployer(app.candidateUserId, currentUser.id);
      openCandidateDetail(app.candidateUserId);
      renderEmployerJobDetail(jobId);
    });
    tbody.appendChild(tr);
  });
}

/** @deprecated use renderEmployerJobsPage */
function renderMyJobPostings() {
  renderEmployerJobsPage();
}

function renderEmployerAnalytics() {
  if (!currentUser || currentUser.role !== "Employer") return;
  const data = buildEmployerAnalyticsData(analyticsRangeDays);
  renderAnalyticsKpis(data.kpis);
  renderAnalyticsPipelineChart(data.pipeline);
  renderAnalyticsDeptBars(data.departments);
  renderAnalyticsInsight(data.insight);
  const rangeSelect = $("analyticsRangeSelect");
  if (rangeSelect) rangeSelect.value = String(analyticsRangeDays);
}

const ANALYTICS_DEPT_RULES = [
  { name: "Engineering", keywords: ["engineer", "developer", "frontend", "backend", "devops", "software", "swe"] },
  { name: "Design", keywords: ["design", "ux", "ui", "creative"] },
  { name: "Product", keywords: ["product", "pm ", "project manager"] },
  { name: "Marketing", keywords: ["marketing", "content", "seo", "brand"] },
  { name: "Sales", keywords: ["sales", "account", "business development", "bd "] }
];

function inferJobDepartment(title) {
  const t = String(title || "").toLowerCase();
  for (const dept of ANALYTICS_DEPT_RULES) {
    if (dept.keywords.some((k) => t.includes(k))) return dept.name;
  }
  return "Other";
}

function analyticsWindow(days) {
  const end = Date.now();
  const start = end - days * 86400000;
  return { start, end, prevStart: start - days * 86400000, prevEnd: start };
}

function trendPercent(current, previous) {
  if (!previous) return current ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function formatTrend(delta, unit, invert) {
  if (delta === 0) return { text: "—", dir: "up" };
  const positive = invert ? delta < 0 : delta > 0;
  const arrow = positive ? "↑" : "↓";
  const abs = Math.abs(delta);
  const suffix = unit === "days" ? ` ${abs} day${abs === 1 ? "" : "s"}` : `%`;
  return { text: `${arrow} ${unit === "days" ? abs + " days" : abs + "%"}`, dir: positive ? "up" : "down" };
}

function buildEmployerAnalyticsData(days) {
  const myJobs = ownedJobs();
  const myJobIds = new Set(myJobs.map((j) => j.id));
  const allApps = applications.filter((a) => myJobIds.has(a.jobId) && a.status === "applied");
  const ivs = employerInterviews();
  const { start, end, prevStart, prevEnd } = analyticsWindow(days);

  const appsCurrent = allApps.filter((a) => a.createdAt >= start && a.createdAt <= end);
  const appsPrev = allApps.filter((a) => a.createdAt >= prevStart && a.createdAt < prevEnd);

  const activeJobs = myJobs.length;
  const activeJobsPrev = new Set(appsPrev.map((a) => a.jobId)).size;
  const activeJobsCurrent = new Set(appsCurrent.map((a) => a.jobId)).size || activeJobs;
  const totalApplicants = appsCurrent.length;
  const hiresMade = appsCurrent.filter((a) =>
    a.employerStatus === "shortlisted" || a.employerStatus === "interview_scheduled"
  ).length;

  const hireDurations = [];
  allApps.forEach((app) => {
    const iv = ivs.find((i) => i.applicationId === app.id || (i.candidateUserId === app.candidateUserId && i.jobId === app.jobId));
    if (iv && iv.dateTime && app.createdAt) {
      const daysToHire = Math.max(1, Math.round((new Date(iv.dateTime).getTime() - app.createdAt) / 86400000));
      hireDurations.push(daysToHire);
    }
  });
  const avgTimeToHire = hireDurations.length
    ? Math.round(hireDurations.reduce((s, d) => s + d, 0) / hireDurations.length)
    : (totalApplicants ? 28 : 0);

  const prevApplicants = appsPrev.length;
  const prevHires = appsPrev.filter((a) =>
    a.employerStatus === "shortlisted" || a.employerStatus === "interview_scheduled"
  ).length;

  const prevHireDurations = [];
  allApps.filter((a) => a.createdAt >= prevStart && a.createdAt < prevEnd).forEach((app) => {
    const iv = ivs.find((i) => i.applicationId === app.id || (i.candidateUserId === app.candidateUserId && i.jobId === app.jobId));
    if (iv && iv.dateTime && app.createdAt) {
      prevHireDurations.push(Math.max(1, Math.round((new Date(iv.dateTime).getTime() - app.createdAt) / 86400000)));
    }
  });
  const prevAvgTime = prevHireDurations.length
    ? Math.round(prevHireDurations.reduce((s, d) => s + d, 0) / prevHireDurations.length)
    : avgTimeToHire;

  const kpis = [
    {
      label: "Active Jobs",
      value: activeJobs,
      icon: "briefcase",
      trend: formatTrend(trendPercent(activeJobsCurrent, activeJobsPrev || 1), "pct")
    },
    {
      label: "Total Applicants",
      value: totalApplicants,
      icon: "users",
      trend: formatTrend(trendPercent(totalApplicants, prevApplicants), "pct")
    },
    {
      label: "Hires Made",
      value: hiresMade,
      icon: "user-check",
      trend: formatTrend(trendPercent(hiresMade, prevHires), "pct")
    },
    {
      label: "Avg. Time to Hire",
      value: avgTimeToHire ? `${avgTimeToHire} days` : "—",
      icon: "calendar",
      trend: formatTrend(avgTimeToHire - prevAvgTime, "days", true)
    }
  ];

  const monthCount = days <= 90 ? 4 : 7;
  const pipeline = [];
  const now = new Date();
  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStart = d.getTime();
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).getTime();
    const monthApps = allApps.filter((a) => a.createdAt >= monthStart && a.createdAt <= monthEnd);
    pipeline.push({
      label: d.toLocaleDateString(undefined, { month: "short" }),
      applied: monthApps.length,
      shortlisted: monthApps.filter((a) => a.employerStatus === "shortlisted").length,
      hired: monthApps.filter((a) => a.employerStatus === "interview_scheduled").length
    });
  }

  const deptMap = new Map();
  ANALYTICS_DEPT_RULES.forEach((d) => deptMap.set(d.name, []));
  myJobs.forEach((job) => {
    const dept = inferJobDepartment(job.title);
    if (!deptMap.has(dept)) return;
    const jobApps = allApps.filter((a) => a.jobId === job.id);
    jobApps.forEach((app) => {
      const iv = ivs.find((i) => i.applicationId === app.id || (i.candidateUserId === app.candidateUserId && i.jobId === app.jobId));
      if (iv && iv.dateTime && app.createdAt) {
        deptMap.get(dept).push(
          Math.max(1, Math.round((new Date(iv.dateTime).getTime() - app.createdAt) / 86400000))
        );
      }
    });
  });

  const deptColors = {
    Engineering: "#ef4444",
    Design: "#14b8a6",
    Product: "#f97316",
    Marketing: "#14b8a6",
    Sales: "#14b8a6"
  };
  const deptDefaults = { Engineering: 45, Design: 28, Product: 35, Marketing: 22, Sales: 18 };
  const departments = ANALYTICS_DEPT_RULES.map((d) => {
    const vals = deptMap.get(d.name) || [];
    const avg = vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : deptDefaults[d.name];
    return { name: d.name, days: avg, color: deptColors[d.name], max: 50 };
  });

  const companyAvg = departments.reduce((s, d) => s + d.days, 0) / departments.length;
  const slowest = departments.slice().sort((a, b) => b.days - a.days)[0];
  const pctLonger = slowest && companyAvg
    ? Math.round(((slowest.days - companyAvg) / companyAvg) * 100)
    : 60;
  const insight = {
    dept: slowest ? slowest.name : "Engineering",
    pct: Math.max(20, pctLonger)
  };

  return { kpis, pipeline, departments, insight, allApps, myJobs };
}

function analyticsKpiIcon(name) {
  if (name === "briefcase") return '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"></rect><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
  if (name === "users") return '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="4"></circle><path d="M2 21c0-4 3-6 7-6"></path><circle cx="17" cy="11" r="3"></circle><path d="M12 21c0-3 2-5 5-5s5 2 5 5"></path></svg>';
  if (name === "user-check") return '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><polyline points="16 11 18 13 22 9"></polyline></svg>';
  return '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>';
}

function renderAnalyticsKpis(kpis) {
  const row = $("analyticsKpiRow");
  if (!row) return;
  row.innerHTML = kpis.map((k) => `
    <article class="analytics-kpi-card">
      <div class="analytics-kpi-top">
        <p class="analytics-kpi-label">${escapeHtml(k.label)}</p>
        <span class="analytics-kpi-icon">${analyticsKpiIcon(k.icon)}</span>
      </div>
      <p class="analytics-kpi-value">${escapeHtml(String(k.value))}</p>
      <span class="analytics-kpi-trend ${k.trend.dir}">${escapeHtml(k.trend.text)}</span>
    </article>
  `).join("");
}

function renderAnalyticsPipelineChart(pipeline) {
  const wrap = $("analyticsPipelineChart");
  if (!wrap) return;
  if (!pipeline.length) {
    wrap.innerHTML = '<div class="empty">No pipeline data for this period yet.</div>';
    return;
  }
  const maxVal = Math.max(1, ...pipeline.flatMap((m) => [m.applied, m.shortlisted, m.hired]));
  const ticks = [maxVal, Math.round(maxVal * 0.66), Math.round(maxVal * 0.33), 0];
  wrap.innerHTML = `
    <div class="analytics-pipeline-y-axis">${ticks.map((t) => `<span>${t}</span>`).join("")}</div>
    ${pipeline.map((m) => {
      const h = (v) => `${Math.max(4, Math.round((v / maxVal) * 100))}%`;
      return `
        <div class="analytics-pipeline-month">
          <div class="analytics-pipeline-bars">
            <div class="analytics-pipeline-bar applied" style="height:${h(m.applied)}" title="Applied: ${m.applied}"></div>
            <div class="analytics-pipeline-bar shortlisted" style="height:${h(m.shortlisted)}" title="Shortlisted: ${m.shortlisted}"></div>
            <div class="analytics-pipeline-bar hired" style="height:${h(m.hired)}" title="Hired: ${m.hired}"></div>
          </div>
          <span class="analytics-pipeline-month-label">${escapeHtml(m.label)}</span>
        </div>`;
    }).join("")}
  `;
}

function renderAnalyticsDeptBars(departments) {
  const wrap = $("analyticsDeptBars");
  if (!wrap) return;
  wrap.innerHTML = departments.map((d) => {
    const pct = Math.min(100, Math.round((d.days / d.max) * 100));
    return `
      <div class="analytics-dept-row">
        <label>${escapeHtml(d.name)}</label>
        <div class="analytics-dept-track">
          <div class="analytics-dept-fill" style="width:${pct}%; background:${d.color};"></div>
        </div>
        <span class="analytics-dept-days">${d.days}d</span>
      </div>`;
  }).join("");
}

function renderAnalyticsInsight(insight) {
  const el = $("analyticsInsight");
  if (!el) return;
  el.innerHTML = `
    <h4>Insight</h4>
    <p><strong>${escapeHtml(insight.dept)}</strong> roles take <strong>${insight.pct}% longer</strong> to fill than the company average. Consider increasing sourcing efforts.</p>
  `;
}

function exportAnalyticsReport() {
  const data = buildEmployerAnalyticsData(analyticsRangeDays);
  const lines = [
    "Matchify Recruiting Analytics Report",
    `Period: Last ${analyticsRangeDays} days`,
    "",
    "Key Metrics",
    ...data.kpis.map((k) => `${k.label},${k.value},${k.trend.text}`),
    "",
    "Pipeline by Month",
    "Month,Applied,Shortlisted,Hired",
    ...data.pipeline.map((m) => `${m.label},${m.applied},${m.shortlisted},${m.hired}`),
    "",
    "Avg Days to Hire by Department",
    "Department,Days",
    ...data.departments.map((d) => `${d.name},${d.days}`)
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `matchify-analytics-${analyticsRangeDays}d.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------- Scoring ---------- */
function profileText(candidate) {
  return [
    candidate.name,
    candidate.email,
    candidate.contact,
    candidate.education,
    candidate.major,
    candidate.preferredLocation,
    (candidate.skills || []).join(" "),
    (candidate.workExperience || []).map((w) => `${w.title} ${w.company} ${w.description || ""}`).join(" ")
  ]
    .filter(Boolean)
    .join(" ");
}

function jobText(job) {
  return [
    job.title,
    job.company,
    job.description,
    job.requiredEducation,
    job.location,
    job.workMode,
    job.jobType,
    (job.requiredSkills || []).join(" ")
  ]
    .filter(Boolean)
    .join(" ");
}

function scoreJobForCandidate(candidate, job) {
  let score = 0;
  const desc = (job.description || "").toLowerCase();
  const candidateMajor = (candidate.major || "").toLowerCase();

  const matchedSkills = (candidate.skills || []).filter(
    (s) => skillListIncludes(job.requiredSkills, s) || desc.includes(String(s).toLowerCase())
  );
  score += Math.min(40, matchedSkills.length * 10);

  if (candidateMajor && desc.includes(candidateMajor)) score += 20;

  if (candidate.experience >= job.requiredExperience) score += 15;
  else score += Math.max(0, 15 - (job.requiredExperience - candidate.experience) * 3);

  const candEdu = educationRank[candidate.education] || 0;
  const jobEdu = educationRank[job.requiredEducation] || 0;
  if (candEdu && jobEdu && candEdu >= jobEdu) score += 10;

  if (
    candidate.preferredWorkMode === "Any" ||
    candidate.preferredWorkMode === job.workMode
  ) score += 7;

  if (
    !candidate.preferredLocation ||
    candidate.preferredLocation.toLowerCase() === (job.location || "").toLowerCase()
  ) score += 5;

  if ((candidate.workExperience || []).some((w) =>
    fuzzyMatch(job.title, `${w.title} ${w.company} ${w.description || ""}`)
  )) score += 8;

  return Math.min(100, score);
}

function scoreCandidateForJob(job, candidate) {
  let score = 0;
  const desc = (job.description || "").toLowerCase();
  const matchedSkills = (job.requiredSkills || []).filter((s) => skillListIncludes(candidate.skills, s));
  score += Math.min(45, matchedSkills.length * 12);

  if (candidate.experience >= job.requiredExperience) score += 18;
  else score += Math.max(0, 18 - (job.requiredExperience - candidate.experience) * 4);

  const candEdu = educationRank[candidate.education] || 0;
  const jobEdu = educationRank[job.requiredEducation] || 0;
  if (candEdu && jobEdu && candEdu >= jobEdu) score += 12;

  if (candidate.major && desc.includes(candidate.major.toLowerCase())) score += 8;

  if (candidate.preferredWorkMode === "Any" || candidate.preferredWorkMode === job.workMode) score += 5;

  if (
    !candidate.preferredLocation ||
    candidate.preferredLocation.toLowerCase() === (job.location || "").toLowerCase()
  ) score += 5;

  if ((candidate.workExperience || []).some((w) =>
    fuzzyMatch(job.title, `${w.title} ${w.company} ${w.description || ""}`)
  )) score += 7;

  return Math.min(100, score);
}

function recommendationLimit() {
  return currentUser && currentUser.membership ? Infinity : FREE_RECOMMENDATION_LIMIT;
}

/* ---------- Find Jobs page ---------- */
function filterJobs() {
  const keyword = $("jobSearchKeyword").value.trim();
  const location = $("jobSearchLocation").value.trim();
  const workMode = $("jobFilterWorkMode").value;
  const jobType = $("jobFilterJobType").value;
  const education = $("jobFilterEducation").value;
  const maxExp = $("jobFilterMaxExp").value ? Number($("jobFilterMaxExp").value) : null;
  const minSalary = $("jobFilterMinSalary").value ? Number($("jobFilterMinSalary").value) : null;

  return jobs.filter((job) => {
    if (keyword && !fuzzyMatch(keyword, jobText(job))) return false;
    if (location && !fuzzyMatch(location, `${job.location} ${job.workMode}`)) return false;
    if (workMode && job.workMode !== workMode) return false;
    if (jobType && job.jobType !== jobType) return false;
    if (education && job.requiredEducation !== education) return false;
    if (maxExp !== null && job.requiredExperience > maxExp) return false;
    if (minSalary !== null) {
      const top = job.salaryMax || job.salaryMin || 0;
      if (top < minSalary) return false;
    }
    return true;
  });
}

function renderFindJobs() {
  renderJobList(filterJobs(), $("allJobsList"));
  renderRecommendedJobs();
}

function renderJobList(list, container) {
  container.innerHTML = "";
  if (!list.length) {
    container.innerHTML = '<div class="empty">No jobs match your search yet.</div>';
    return;
  }
  list.forEach((job) => container.appendChild(buildJobCard(job)));
}

function buildJobCard(job, options = {}) {
  const { showManage = false } = options;
  const card = document.createElement("article");
  card.className = "job-card";
  if (job.id === activeJobDetailId) card.classList.add("is-selected");

  const skillsHtml = (job.requiredSkills || [])
    .slice(0, 5)
    .map((s) => `<span class="chip">${escapeHtml(s)}</span>`)
    .join("");

  const salaryStr = formatSalary(job);

  card.innerHTML = `
    <div class="job-card-head">
      <div>
        <h4>${escapeHtml(job.title)}</h4>
        <div class="meta-row">
          <span><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"></rect><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>${escapeHtml(job.company)}</span>
          <span><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s7-7 7-12a7 7 0 0 0-14 0c0 5 7 12 7 12z"></path><circle cx="12" cy="10" r="2.5"></circle></svg>${escapeHtml(job.location)}</span>
          ${salaryStr ? `<span><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>${escapeHtml(salaryStr)}</span>` : ""}
        </div>
      </div>
      <span class="chip work-mode">${escapeHtml(job.workMode)}</span>
    </div>
    <p class="desc">${escapeHtml(job.description)}</p>
    <div class="card-foot">
      <div style="display:flex; gap:0.85rem; flex-wrap:wrap;">
        <span><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 7l10-5 10 5-10 5L2 7z"></path><path d="M6 10v5c0 1 3 3 6 3s6-2 6-3v-5"></path></svg> ${escapeHtml(job.requiredEducation)}</span>
        <span><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"></rect><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> ${job.requiredExperience}+ years</span>
        <span class="chip job-type">${escapeHtml(job.jobType || "Full-time")}</span>
      </div>
      <div class="skills-row">${skillsHtml}</div>
    </div>
    ${showManage ? `<div style="display:flex; gap:0.5rem; margin-top:0.75rem;">
        <button type="button" class="secondary small" data-edit-job="${job.id}">Edit</button>
        <button type="button" class="danger small" data-delete-job="${job.id}">Delete</button>
      </div>` : ""}
  `;

  card.addEventListener("click", (event) => {
    if (event.target.closest("[data-edit-job]") || event.target.closest("[data-delete-job]")) return;
    if (currentUser && currentUser.role === "Candidate") openJobDetail(job.id);
  });

  const editBtn = card.querySelector("[data-edit-job]");
  if (editBtn) editBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    loadJobForm(job.id);
    navigateTo("employerPostJobPage");
  });
  const deleteBtn = card.querySelector("[data-delete-job]");
  if (deleteBtn) deleteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    deleteJob(job.id);
  });

  return card;
}

function formatSalary(job) {
  if (!job.salaryMin && !job.salaryMax) return "";
  if (job.salaryMin && job.salaryMax) return `$${formatNumber(job.salaryMin)} - $${formatNumber(job.salaryMax)}`;
  if (job.salaryMin) return `From $${formatNumber(job.salaryMin)}`;
  return `Up to $${formatNumber(job.salaryMax)}`;
}

function formatNumber(n) {
  return Number(n).toLocaleString();
}

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderRecommendedJobs() {
  const wrap = $("recommendedJobsList");
  wrap.innerHTML = "";
  const profile = getCurrentCandidateProfile();
  if (!profile) {
    wrap.innerHTML = '<div class="empty">Complete your profile to receive recommendations.</div>';
    return;
  }
  if (!jobs.length) {
    wrap.innerHTML = '<div class="empty">No job postings available yet.</div>';
    return;
  }
  const scored = jobs
    .map((job) => ({ job, score: scoreJobForCandidate(profile, job) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, recommendationLimit());

  if (!scored.length) {
    wrap.innerHTML = '<div class="empty">No recommendations yet.</div>';
    return;
  }

  scored.forEach(({ job, score }) => {
    const card = document.createElement("div");
    card.className = "rec-card";
    const skillsHtml = (job.requiredSkills || [])
      .slice(0, 3)
      .map((s) => `<span class="chip">${escapeHtml(s)}</span>`)
      .join("");
    card.innerHTML = `
      <h5>${escapeHtml(job.title)}</h5>
      <p class="rec-company">${escapeHtml(job.company)}</p>
      <div class="chip-row">${skillsHtml}</div>
      <div class="rec-foot">
        <span>${escapeHtml(job.location || "Anywhere")}</span>
        <span class="rec-match">Match: ${score}</span>
      </div>
    `;
    card.addEventListener("click", () => openJobDetail(job.id));
    wrap.appendChild(card);
  });

  if (!currentUser.membership && jobs.length > FREE_RECOMMENDATION_LIMIT) {
    const upsell = document.createElement("div");
    upsell.className = "empty";
    upsell.style.cursor = "pointer";
    upsell.textContent = "Upgrade to Premium for unlimited recommendations →";
    upsell.addEventListener("click", () => navigateTo("candidateProfilePage"));
    wrap.appendChild(upsell);
  }
}

/* ---------- Job detail panel ---------- */
function openJobDetail(jobId) {
  const job = jobs.find((j) => j.id === jobId);
  if (!job) return;
  activeJobDetailId = jobId;
  renderJobList(filterJobs(), $("allJobsList"));
  renderRecommendedJobs();
  const panel = $("jobDetailPanel");
  const body = $("jobDetailBody");
  const savedApp = applicationFor(jobId, "saved");
  const appliedApp = applicationFor(jobId, "applied");

  const skillsHtml = (job.requiredSkills || [])
    .map((s) => `<li>${escapeHtml(s)}</li>`)
    .join("");

  const employer = getEmployerInfo(job.userId);
  const interview = appliedApp ? interviews.find((iv) => iv.jobId === jobId && iv.candidateUserId === currentUser.id) : null;
  const employerStatus = appliedApp ? (appliedApp.employerStatus || "applied") : null;

  body.innerHTML = `
    <h2>${escapeHtml(job.title)}</h2>
    <p class="detail-company"><strong>${escapeHtml(job.company)}</strong> &middot; ${escapeHtml(job.location)} &middot; ${escapeHtml(job.workMode)} &middot; ${escapeHtml(job.jobType || "Full-time")}</p>
    ${employerStatus ? `<p style="margin-bottom:0.8rem;"><span class="app-status ${employerStatus}">${escapeHtml(APP_STATUS_LABELS[employerStatus] || employerStatus)}</span></p>` : ""}
    ${interview ? `<div class="action-item blue" style="margin-bottom:0.8rem;"><strong>📅 Interview scheduled</strong><div class="action-meta">${escapeHtml(interview.title)} · ${formatDateTime(new Date(interview.dateTime).getTime())} · <a href="${escapeHtml(interview.meetingLink || "")}" target="_blank" rel="noopener">${escapeHtml(interview.meetingType === "google_meet" ? "Join Google Meet" : interview.meetingLink || "View link")}</a></div></div>` : ""}
    <div class="detail-actions">
      <button type="button" class="primary-blue" data-action="apply">${appliedApp ? "✓ Applied" : "Apply now"}</button>
      <button type="button" class="secondary" data-action="save">${savedApp ? "✓ Saved" : "Save for later"}</button>
      ${employer ? '<button type="button" class="secondary" data-action="message">✉ Message Employer</button>' : ""}
    </div>
    <h3>Job details</h3>
    <p><strong>Education:</strong> ${escapeHtml(job.requiredEducation)}</p>
    <p><strong>Experience required:</strong> ${job.requiredExperience}+ years</p>
    ${formatSalary(job) ? `<p><strong>Salary:</strong> ${escapeHtml(formatSalary(job))}</p>` : ""}
    <h3>Full job description</h3>
    <p>${escapeHtml(job.description)}</p>
    <h3>Required Skills</h3>
    <ul>${skillsHtml || "<li>No specific skills listed</li>"}</ul>
    ${employer ? `
      <h3>About the employer</h3>
      <p><strong>Company:</strong> ${escapeHtml(employer.company)}</p>
      <p><strong>Recruiter:</strong> ${escapeHtml(employer.name)}</p>
      <p><strong>Contact:</strong> ${escapeHtml(employer.email)}</p>
    ` : ""}
  `;

  body.querySelector("[data-action=apply]").addEventListener("click", () => toggleApplication(jobId, "applied"));
  body.querySelector("[data-action=save]").addEventListener("click", () => toggleApplication(jobId, "saved"));
  const messageBtn = body.querySelector("[data-action=message]");
  if (messageBtn) messageBtn.addEventListener("click", () => {
    closeJobDetail();
    openMessageThreadWith(employer.userId, jobId);
  });

  show(panel, true);
}

function closeJobDetail() {
  activeJobDetailId = null;
  show($("jobDetailPanel"), false);
}

/* ---------- Applications (save/apply) ---------- */
function applicationFor(jobId, status) {
  if (!currentUser) return null;
  return applications.find(
    (a) => a.candidateUserId === currentUser.id && a.jobId === jobId && a.status === status
  ) || null;
}

function toggleApplication(jobId, status) {
  if (!currentUser || currentUser.role !== "Candidate") return;
  const existing = applicationFor(jobId, status);
  let didApply = false;
  if (existing) {
    applications = applications.filter((a) => a.id !== existing.id);
  } else {
    const now = Date.now();
    const events = [];
    if (status === "applied") {
      events.push({ kind: "submitted", label: "Application successfully submitted.", at: now });
    }
    applications.push({
      id: createId("app"),
      candidateUserId: currentUser.id,
      jobId,
      status,
      employerStatus: status === "applied" ? "applied" : null,
      viewedByEmployer: false,
      candidateArchived: false,
      events,
      createdAt: now
    });
    didApply = status === "applied";
  }
  saveArray(STORAGE.applications, applications);
  if (activeJobDetailId === jobId) openJobDetail(jobId);
  renderMyJobs();

  if (didApply) {
    const job = jobs.find((j) => j.id === jobId);
    if (job) showApplyConfirm(job);
  }
}

/* ---------- Apply confirmation page ---------- */
function showApplyConfirm(job) {
  const msgEl = $("applyConfirmMessage");
  if (msgEl) {
    msgEl.innerHTML = `You have successfully applied for the <strong>${escapeHtml(job.title)}</strong> role at <strong>${escapeHtml(job.company)}</strong>.`;
  }
  closeJobDetail();
  navigateTo("candidateApplyConfirmPage");
}

/* ---------- Application Detail page (candidate-side) ---------- */
let activeApplicationDetailId = null;

function openApplicationDetail(appId) {
  if (!currentUser || currentUser.role !== "Candidate") return;
  const app = applications.find((a) => a.id === appId && a.candidateUserId === currentUser.id);
  if (!app) return;
  activeApplicationDetailId = appId;
  renderApplicationDetail();
  navigateTo("candidateApplicationDetailPage");
}

function renderApplicationDetail() {
  const container = $("appDetailContent");
  if (!container) return;
  const app = applications.find((a) => a.id === activeApplicationDetailId);
  if (!app) {
    container.innerHTML = '<div class="empty">Application not found.</div>';
    return;
  }
  const job = jobs.find((j) => j.id === app.jobId);
  if (!job) {
    container.innerHTML = '<div class="empty">This job listing is no longer available.</div>';
    return;
  }
  const cand = getCandidateInfo(currentUser.id);
  const interview = interviews.find((iv) => iv.candidateUserId === currentUser.id && iv.jobId === app.jobId);
  const badge = candidateStatusBadge(app);

  const eventsSorted = (Array.isArray(app.events) ? app.events : []).slice().sort((a, b) => b.at - a.at);
  const fallbackEvent = { kind: "submitted", label: "Application Submitted.", at: app.createdAt };
  const allEvents = eventsSorted.length ? eventsSorted : [fallbackEvent];
  /* Always show "Application Submitted" anchor at the bottom */
  const hasSubmittedAnchor = allEvents.some((e) => e.kind === "submitted");
  const timelineEvents = hasSubmittedAnchor ? allEvents : allEvents.concat([fallbackEvent]);

  const timelineHtml = timelineEvents.map((evt, i) => {
    const isLatest = i === 0;
    const cls = evt.kind === "rejected" || evt.kind === "archived" ? "danger"
      : evt.kind === "submitted" ? "success"
      : isLatest ? "active" : "";
    return `<div class="timeline-item ${cls}">
      <span class="timeline-dot"></span>
      <div class="timeline-body">
        <strong>${escapeHtml(evt.kind === "submitted" ? "Application Submitted" : evt.label)}</strong>
        <small>${formatDate(evt.at)}</small>
      </div>
    </div>`;
  }).join("");

  const resumeCard = cand && cand.hasProfile
    ? `<div class="document-card">
        <div class="doc-icon">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
        </div>
        <div class="doc-meta">
          <strong>Resume_${new Date(app.createdAt).getFullYear()}.pdf</strong>
          <small>Parsed from your profile</small>
        </div>
      </div>`
    : '<p class="hint" style="margin:0;">No documents on file.</p>';

  const interviewBlock = interview
    ? `<div class="document-card" style="margin-top:0.7rem;">
        <div class="doc-icon">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
        </div>
        <div class="doc-meta">
          <strong>Interview · ${escapeHtml(formatDateTime(new Date(interview.dateTime).getTime()))}</strong>
          <small>${interview.meetingType === "google_meet" ? `<a href="${escapeHtml(interview.meetingLink || "")}" target="_blank" rel="noopener">Join Google Meet</a>` : escapeHtml(interview.meetingLink || "")}</small>
        </div>
      </div>`
    : "";

  container.innerHTML = `
    <div class="app-detail-top">
      <div class="app-icon">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"></rect><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
      </div>
      <div>
        <h1>${escapeHtml(job.title)}</h1>
        <div class="meta-row">
          <span>🏢 ${escapeHtml(job.company)}</span>
          <span>📍 ${escapeHtml(job.location)}</span>
        </div>
        <div class="meta-row" style="margin-top:0.4rem;">
          <span>🕒 Applied ${escapeHtml(formatDate(app.createdAt))}</span>
        </div>
      </div>
      <div class="app-detail-status-wrap">${badgeHtml(badge)}</div>
    </div>

    <div class="app-detail-layout">
      <div class="app-detail-main">
        <div class="app-detail-card">
          <h3>Application Timeline</h3>
          <div class="timeline">${timelineHtml}</div>
        </div>
        <div class="app-detail-card about-role">
          <h3>About the Role</h3>
          <p>${escapeHtml(job.description || `This is a ${escapeHtml(job.jobType || "full-time")} role based in ${escapeHtml(job.location)}. As a ${escapeHtml(job.title)} at ${escapeHtml(job.company)}, you will play a key part in the team's success.`)}</p>
          <a href="#" class="original-link" data-action="view-job">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"></rect><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            View original job posting
          </a>
        </div>
      </div>
      <aside class="app-detail-card">
        <h3>Your Submitted Application</h3>
        <div class="submitted-section">
          <h4>Contact Info</h4>
          <div class="contact-row">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
            <span>${escapeHtml((cand && cand.email) || "—")}</span>
          </div>
          <div class="contact-row">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
            <span>${escapeHtml((cand && cand.contact) || "—")}</span>
          </div>
        </div>
        <div class="submitted-section">
          <h4>Resume &amp; Documents</h4>
          ${resumeCard}
          ${interviewBlock}
        </div>
      </aside>
    </div>
  `;

  container.querySelectorAll("[data-action='view-job']").forEach((el) => el.addEventListener("click", (e) => {
    e.preventDefault();
    navigateTo("candidateFindJobsPage");
    openJobDetail(job.id);
  }));
}

/* ============================================================
   COMPANIES: directory, detail, reviews
   ============================================================ */
let activeCompanyId = null;
let activeCompanyTab = "reviews";
let companiesSearchText = "";
let reviewsSort = "newest";

function aggregatedCompanies() {
  // Include real employer companies (those that have job postings) + seeded ones
  const map = new Map();
  companies.forEach((co) => map.set(co.name.toLowerCase(), { ...co }));
  jobs.forEach((j) => {
    const key = (j.company || "").toLowerCase();
    if (!key) return;
    if (!map.has(key)) {
      map.set(key, {
        id: "live-" + key.replace(/\s+/g, "-"),
        name: j.company,
        color: pickColorFromName(j.company),
        industry: j.jobType || "Hiring",
        seededRating: 0,
        seededReviewsCount: 0,
        salariesCount: 0,
        questionsCount: 0,
        mockOpenJobs: 0,
        description: "",
        whyJoinUs: "",
        detailedRatings: {},
        saying: { positive: [], negative: [] },
        synthetic: true
      });
    }
  });
  return Array.from(map.values()).map(enrichCompanyWithEmployerProfile);
}

function employerProfileForCompany(companyName) {
  const target = (companyName || "").toLowerCase();
  if (!target) return null;
  const employer = users.find((u) =>
    u.role === "Employer" && (u.company || "").trim().toLowerCase() === target
  );
  if (!employer) return null;
  return {
    contactEmail: employer.contactEmail || employer.email || "",
    website: employer.companyWebsite || "",
    industry: employer.companyIndustry || "",
    size: employer.companySize || "",
    location: employer.companyLocation || "",
    description: employer.companyDescription || "",
    isPremium: !!employer.membership
  };
}

function enrichCompanyWithEmployerProfile(co) {
  const profile = employerProfileForCompany(co.name);
  if (!profile) return { ...co, employerProfile: null, hasEmployerProfile: false };
  const hasEmployerProfile = !!(
    profile.description || profile.website || profile.location ||
    profile.industry || profile.size || profile.contactEmail
  );
  return {
    ...co,
    industry: profile.industry || co.industry,
    description: profile.description || co.description,
    employerProfile: profile,
    hasEmployerProfile
  };
}

function pickColorFromName(name) {
  const palette = ["#2250f4", "#17a862", "#9333ea", "#0ea5b7", "#ec4899", "#f97316", "#facc15", "#0e1116"];
  let h = 0;
  for (let i = 0; i < (name || "").length; i++) h = (h * 31 + name.charCodeAt(i)) % palette.length;
  return palette[h];
}

function companyInitial(name) {
  return (name || "?").trim().charAt(0).toUpperCase();
}

function companyReviews(companyName) {
  const target = (companyName || "").toLowerCase();
  return reviews.filter((r) => (r.companyName || "").toLowerCase() === target);
}

function companyJobs(companyName) {
  const target = (companyName || "").toLowerCase();
  return jobs.filter((j) => (j.company || "").toLowerCase() === target);
}

function companyTotalRating(co) {
  const own = companyReviews(co.name);
  if (own.length === 0) return Number(co.seededRating || 0);
  // Average of stored reviews; if seeded count > 0, weight them via seeded average
  const realAvg = own.reduce((a, r) => a + r.rating, 0) / own.length;
  if (co.seededRating && co.seededReviewsCount) {
    const total = co.seededReviewsCount + own.length;
    return (co.seededRating * co.seededReviewsCount + realAvg * own.length) / total;
  }
  return realAvg;
}

function companyTotalReviewCount(co) {
  return companyReviews(co.name).length + Number(co.seededReviewsCount || 0);
}

function companyOpenJobsCount(co) {
  return companyJobs(co.name).length + Number(co.mockOpenJobs || 0);
}

function starsHtml(rating, size) {
  const filled = Math.round(rating);
  const cls = size === "lg" ? "stars stars-lg" : "stars";
  let out = "";
  for (let i = 0; i < 5; i++) out += i < filled ? "★" : "☆";
  return `<span class="${cls}">${out}</span>`;
}

function abbreviateNumber(n) {
  n = Number(n) || 0;
  if (n >= 1000) return (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + "k";
  return String(n);
}

/* ---------- Companies directory ---------- */
function renderCompaniesPage() {
  const grid = $("companiesGrid");
  if (!grid) return;
  grid.innerHTML = "";
  const list = aggregatedCompanies();
  const q = companiesSearchText.trim();
  const filtered = !q ? list : list.filter((co) =>
    fuzzyMatch(q, [co.name, co.industry || "", (companyJobs(co.name).map((j) => j.title).join(" "))].join(" "))
  );
  if (!filtered.length) {
    grid.innerHTML = '<div class="empty">No companies match your search.</div>';
    return;
  }
  filtered.forEach((co) => grid.appendChild(buildCompanyCard(co)));
}

function buildCompanyCard(co) {
  const rating = companyTotalRating(co);
  const reviewsCount = companyTotalReviewCount(co);
  const openJobs = companyOpenJobsCount(co);
  const salaries = Number(co.salariesCount || 0);
  const questions = Number(co.questionsCount || 0);

  const card = document.createElement("article");
  card.className = "company-card";
  card.innerHTML = `
    <div class="company-card-head">
      <div class="company-logo" style="background:${escapeHtml(co.color || "#2250f4")}">${escapeHtml(companyInitial(co.name))}</div>
      <div>
        <h3>${escapeHtml(co.name)}</h3>
        <div class="company-rating">
          <strong>${rating ? rating.toFixed(1) : "—"}</strong>
          ${rating ? starsHtml(rating) : ""}
          ${reviewsCount ? `<span>(${abbreviateNumber(reviewsCount)} reviews)</span>` : '<span>No reviews yet</span>'}
        </div>
      </div>
    </div>
    <div class="company-stats">
      <div class="stat"><strong>${abbreviateNumber(salaries)}</strong>Salaries</div>
      <div class="stat"><strong>${abbreviateNumber(questions)}</strong>Questions</div>
      <div class="stat"><strong>${abbreviateNumber(openJobs)}</strong>Open jobs</div>
    </div>
  `;
  card.addEventListener("click", () => openCompanyDetail(co.name));
  return card;
}

/* ---------- Company detail ---------- */
function openCompanyDetail(companyName) {
  const list = aggregatedCompanies();
  const co = list.find((c) => c.name.toLowerCase() === (companyName || "").toLowerCase());
  if (!co) return;
  activeCompanyId = co.name;
  activeCompanyTab = co.hasEmployerProfile ? "snapshot" : "reviews";
  renderCompanyDetail();
  navigateTo("companyDetailPage");
}

function renderCompanyDetail() {
  if (!activeCompanyId) return;
  const co = aggregatedCompanies().find((c) => c.name === activeCompanyId);
  if (!co) return;

  const rating = companyTotalRating(co);
  const reviewsCount = companyTotalReviewCount(co);
  const openJobs = companyOpenJobsCount(co);
  const profile = co.employerProfile;
  const metaParts = [];
  if (rating) metaParts.push(`<span class="pill-blue">${rating.toFixed(1)} ★</span>`);
  if (co.industry) metaParts.push(`<span>${escapeHtml(co.industry)}</span>`);
  if (profile && profile.location) metaParts.push(`<span>${escapeHtml(profile.location)}</span>`);
  if (profile && profile.size) metaParts.push(`<span>${escapeHtml(profile.size)}</span>`);
  const featuredBadge = profile && profile.isPremium
    ? '<span class="company-featured-badge">Featured Employer</span>'
    : "";

  $("companyDetailHeader").innerHTML = `
    <div class="company-logo" style="background:${escapeHtml(co.color || "#2250f4")}">${escapeHtml(companyInitial(co.name))}</div>
    <div>
      <h1>${escapeHtml(co.name)} ${featuredBadge}</h1>
      <div class="meta-row">${metaParts.join("")}</div>
      ${profile && profile.website ? `<a class="company-website-link" href="${escapeHtml(profile.website)}" target="_blank" rel="noopener">${escapeHtml(profile.website.replace(/^https?:\/\//, ""))}</a>` : ""}
    </div>
    <div class="header-actions">
      <button type="button" class="dark" id="companyFollowBtn">Follow</button>
      <button type="button" class="secondary outline" id="companyWriteReviewBtn">Write a review</button>
    </div>
  `;
  const followBtn = $("companyFollowBtn");
  if (followBtn) followBtn.addEventListener("click", () => {
    followBtn.textContent = followBtn.textContent === "Following" ? "Follow" : "Following";
  });
  const writeBtn = $("companyWriteReviewBtn");
  if (writeBtn) writeBtn.addEventListener("click", () => {
    activeCompanyTab = "reviews";
    setCompanyTabActive();
    renderCompanyTabContent(true);
  });

  // Tab counts
  $("companyReviewsCount").textContent = String(reviewsCount);
  $("companySalariesCount").textContent = abbreviateNumber(co.salariesCount || 0);
  $("companyJobsCount").textContent = String(openJobs);
  $("companyQuestionsCount").textContent = String(co.questionsCount || 0);

  setCompanyTabActive();
  renderCompanyTabContent(false);
}

function setCompanyTabActive() {
  document.querySelectorAll("#companyTabs .company-tab").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.companyTab === activeCompanyTab);
  });
}

function renderCompanyTabContent(focusWriteReview) {
  const co = aggregatedCompanies().find((c) => c.name === activeCompanyId);
  const wrap = $("companyTabContent");
  if (!wrap || !co) return;

  switch (activeCompanyTab) {
    case "reviews": wrap.innerHTML = companyReviewsTabHtml(co); wireReviewsTab(co, focusWriteReview); break;
    case "jobs": wrap.innerHTML = companyJobsTabHtml(co); wireJobsTab(co); break;
    case "snapshot": wrap.innerHTML = companySnapshotTabHtml(co); break;
    case "why": wrap.innerHTML = companyWhyTabHtml(co); break;
    case "salaries": wrap.innerHTML = placeholderTabHtml("Salary insights", "Detailed compensation data for this company will appear here as more reports are submitted."); break;
    case "questions": wrap.innerHTML = placeholderTabHtml("Questions", "Common interview questions and community Q&A coming soon."); break;
    case "interviews": wrap.innerHTML = placeholderTabHtml("Interview experiences", "Real interview stories from candidates will appear here."); break;
    default: wrap.innerHTML = "";
  }
}

function placeholderTabHtml(title, body) {
  return `<div class="app-detail-card"><h3>${escapeHtml(title)}</h3><p style="margin:0; color:var(--muted);">${escapeHtml(body)}</p></div>`;
}

function companySnapshotTabHtml(co) {
  const profile = co.employerProfile;
  if (profile && co.hasEmployerProfile) {
    const rows = [
      profile.industry ? { label: "Industry", value: profile.industry } : null,
      profile.size ? { label: "Company size", value: profile.size } : null,
      profile.location ? { label: "Headquarters", value: profile.location } : null,
      profile.contactEmail ? { label: "Contact email", value: profile.contactEmail, mail: true } : null,
      profile.website ? { label: "Website", value: profile.website, link: true } : null
    ].filter(Boolean);

    return `<div class="company-profile-view">
      <div class="app-detail-card company-profile-card">
        <h3>Company Profile</h3>
        ${profile.description
          ? `<p class="company-profile-description">${escapeHtml(profile.description)}</p>`
          : '<p class="company-profile-description muted">This employer has not added a company description yet.</p>'}
        ${rows.length ? `<div class="company-profile-grid">
          ${rows.map((row) => `
            <div class="company-profile-field">
              <span class="company-profile-label">${escapeHtml(row.label)}</span>
              ${row.link
                ? `<a href="${escapeHtml(row.value)}" target="_blank" rel="noopener">${escapeHtml(row.value.replace(/^https?:\/\//, ""))}</a>`
                : row.mail
                  ? `<a href="mailto:${escapeHtml(row.value)}">${escapeHtml(row.value)}</a>`
                  : `<span>${escapeHtml(row.value)}</span>`}
            </div>`).join("")}
        </div>` : ""}
      </div>
      ${co.description && profile.description !== co.description ? `<div class="app-detail-card">
        <h3>About ${escapeHtml(co.name)}</h3>
        <p style="margin:0; color:var(--text-soft); line-height:1.55;">${escapeHtml(co.description)}</p>
      </div>` : ""}
    </div>`;
  }
  return `<div class="app-detail-card">
    <h3>About ${escapeHtml(co.name)}</h3>
    <p style="margin:0; color:var(--text-soft); line-height:1.55;">${escapeHtml(co.description || "No description provided yet.")}</p>
  </div>`;
}

function companyWhyTabHtml(co) {
  const profile = co.employerProfile;
  const pitch = profile && profile.description ? profile.description : (co.whyJoinUs || "");
  return `<div class="app-detail-card">
    <h3>Why join ${escapeHtml(co.name)}?</h3>
    <p style="margin:0; color:var(--text-soft); line-height:1.55;">${escapeHtml(pitch || "This company hasn't shared their pitch yet.")}</p>
  </div>`;
}

function ratingBarsHtml(co) {
  const total = companyTotalReviewCount(co) || 1;
  const counts = [5, 4, 3, 2, 1].map((star) => {
    const real = reviews.filter((r) => (r.companyName || "").toLowerCase() === co.name.toLowerCase() && r.rating === star).length;
    // Add a small seeded distribution if seededReviewsCount exists
    const seeded = co.seededReviewsCount ? Math.round(co.seededReviewsCount * (star === Math.round(co.seededRating || 0) ? 0.55 : star >= 4 ? 0.15 : 0.07)) : 0;
    return real + seeded;
  });
  const max = Math.max(1, ...counts);
  return [5, 4, 3, 2, 1].map((s, i) => {
    const pct = Math.round((counts[i] / max) * 100);
    return `<div class="rating-bar"><span>${s}</span><div class="bar"><span style="width:${pct}%"></span></div></div>`;
  }).join("");
}

function detailedRatingsHtml(co) {
  const rows = Object.entries(co.detailedRatings || {});
  if (!rows.length) return "";
  return `<div class="app-detail-card"><h3>Detailed ratings</h3>
    <div class="detailed-ratings">
      ${rows.map(([label, val]) => `<div class="detailed-rating-row">
        <span class="label">${escapeHtml(label)}</span>
        <span class="val">${escapeHtml(val)} <span class="stars">★</span></span>
      </div>`).join("")}
    </div>
  </div>`;
}

function peopleSayingHtml(co) {
  const pos = (co.saying && co.saying.positive) || [];
  const neg = (co.saying && co.saying.negative) || [];
  if (!pos.length && !neg.length) return "";
  return `<div class="app-detail-card"><h3>What people are saying</h3>
    <div class="people-saying">
      ${pos.map((s) => `<div class="item pos">✓ ${escapeHtml(s)}</div>`).join("")}
      ${neg.map((s) => `<div class="item neg">✗ ${escapeHtml(s)}</div>`).join("")}
    </div>
  </div>`;
}

function companyReviewsTabHtml(co) {
  const totalReviews = companyTotalReviewCount(co);
  const realReviews = companyReviews(co.name);
  const sorted = sortedReviews(realReviews);
  const rating = companyTotalRating(co);

  const sidebar = `
    <div class="app-detail-card rating-card">
      <h3>Overall rating</h3>
      <div class="big-rating">
        <strong>${rating ? rating.toFixed(1) : "—"}</strong>
        ${rating ? starsHtml(rating, "lg") : ""}
      </div>
      <div class="sub">Based on ${abbreviateNumber(totalReviews)} reviews</div>
      <div class="rating-bars">${ratingBarsHtml(co)}</div>
    </div>
    ${detailedRatingsHtml(co)}
    ${peopleSayingHtml(co)}
  `;

  const writeForm = `
    <div class="write-review-card" id="writeReviewCard" ${currentUser && currentUser.role === "Candidate" ? "" : "style=\"display:none;\""}>
      <h4>Write a review</h4>
      <form id="reviewForm">
        <div class="form-row">
          <label style="font-size:0.82rem; color:var(--muted); display:block; margin-bottom:0.3rem;">Your rating</label>
          <div class="star-picker" id="reviewStarPicker" data-rating="0">
            ${[1,2,3,4,5].map((n) => `<button type="button" data-star="${n}">★</button>`).join("")}
          </div>
        </div>
        <div class="form-row"><input type="text" id="reviewTitle" placeholder="Review title (e.g. Great culture)" required></div>
        <div class="grid-2 form-row">
          <input type="text" id="reviewPosition" placeholder="Your position (e.g. Engineer)">
          <input type="text" id="reviewLocation" placeholder="Location (e.g. Sydney NSW)">
        </div>
        <div class="form-row"><textarea id="reviewBody" placeholder="Share details about your experience..." required></textarea></div>
        <div class="form-actions">
          <button type="button" class="ghost" id="reviewCancel">Cancel</button>
          <button type="submit" class="primary-blue">Submit review</button>
        </div>
      </form>
    </div>
  `;

  const reviewsHead = `
    <div class="search-filters-row">
      <input type="text" placeholder="Job title, department">
      <input type="text" placeholder="Australia" value="Australia">
      <button type="button" class="primary-blue">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
      </button>
    </div>
    <div class="chip-tools">
      <button type="button" class="chip-tool">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        Keywords
      </button>
      <button type="button" class="chip-tool">Topics ▾</button>
    </div>
    <div class="reviews-head">
      <h3>${abbreviateNumber(totalReviews)} reviews</h3>
      <div class="reviews-sort">
        <span>Sort</span>
        <select id="reviewsSortSelect">
          <option value="newest" ${reviewsSort === "newest" ? "selected" : ""}>Newest</option>
          <option value="oldest" ${reviewsSort === "oldest" ? "selected" : ""}>Oldest</option>
          <option value="highest" ${reviewsSort === "highest" ? "selected" : ""}>Highest rated</option>
          <option value="lowest" ${reviewsSort === "lowest" ? "selected" : ""}>Lowest rated</option>
          <option value="popular" ${reviewsSort === "popular" ? "selected" : ""}>Most liked</option>
        </select>
      </div>
    </div>
  `;

  const reviewsList = sorted.length
    ? sorted.map(reviewCardHtml).join("")
    : '<div class="empty">No reviews yet — be the first to share your experience!</div>';

  return `<div class="company-detail-layout">
    <div>${sidebar}</div>
    <div>
      ${writeForm}
      ${reviewsHead}
      ${reviewsList}
    </div>
  </div>`;
}

function sortedReviews(list) {
  const arr = list.slice();
  switch (reviewsSort) {
    case "oldest": arr.sort((a, b) => a.createdAt - b.createdAt); break;
    case "highest": arr.sort((a, b) => b.rating - a.rating || b.createdAt - a.createdAt); break;
    case "lowest": arr.sort((a, b) => a.rating - b.rating || b.createdAt - a.createdAt); break;
    case "popular": arr.sort((a, b) => (b.likes || 0) - (a.likes || 0)); break;
    default: arr.sort((a, b) => b.createdAt - a.createdAt);
  }
  return arr;
}

function reviewCardHtml(r) {
  const dt = new Date(r.createdAt).toLocaleDateString(undefined, { day: "2-digit", month: "long", year: "numeric" });
  return `<div class="review-card" data-review-id="${escapeHtml(r.id)}">
    <div class="review-head">
      ${starsHtml(r.rating)}
      <span>· ${escapeHtml(dt)}</span>
    </div>
    <h4>${escapeHtml(r.title)}</h4>
    <div class="review-meta">
      ${r.position ? `<span>${escapeHtml(r.position)}</span>` : ""}
      ${r.location ? `<span>📍 ${escapeHtml(r.location)}</span>` : ""}
    </div>
    <p class="review-body">${escapeHtml(r.body)}</p>
    <div class="review-actions">
      <button type="button" class="vote-btn" data-vote="up">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-6 0v4H5l3 7h8l3-7h-5z"></path></svg>
        ${r.likes || 0}
      </button>
      <button type="button" class="vote-btn" data-vote="down">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 15v4a3 3 0 0 0 6 0v-4h3l-3-7H8l-3 7h5z"></path></svg>
        ${r.dislikes || 0}
      </button>
      <button type="button" class="vote-btn" style="margin-left:auto;">···</button>
    </div>
  </div>`;
}

function wireReviewsTab(co, focusWriteReview) {
  const sortSel = $("reviewsSortSelect");
  if (sortSel) sortSel.addEventListener("change", (e) => {
    reviewsSort = e.target.value;
    renderCompanyTabContent(false);
  });

  // Star picker
  const picker = $("reviewStarPicker");
  if (picker) {
    picker.querySelectorAll("button[data-star]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const n = Number(btn.dataset.star);
        picker.dataset.rating = String(n);
        picker.querySelectorAll("button").forEach((b) => b.classList.toggle("on", Number(b.dataset.star) <= n));
      });
    });
  }

  // Review form
  const form = $("reviewForm");
  if (form) form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!currentUser || currentUser.role !== "Candidate") {
      alert("Please log in as a candidate to write a review.");
      return;
    }
    const rating = Number(picker.dataset.rating || 0);
    if (!rating) { alert("Please pick a star rating."); return; }
    const r = {
      id: createId("rev"),
      companyName: co.name,
      authorName: currentUser.name,
      rating,
      title: $("reviewTitle").value.trim(),
      position: $("reviewPosition").value.trim(),
      location: $("reviewLocation").value.trim(),
      body: $("reviewBody").value.trim(),
      likes: 0,
      dislikes: 0,
      createdAt: Date.now()
    };
    reviews.push(r);
    saveArray(STORAGE.reviews, reviews);
    renderCompanyDetail();
  });
  const cancel = $("reviewCancel");
  if (cancel) cancel.addEventListener("click", () => {
    $("reviewForm").reset();
    if (picker) {
      picker.dataset.rating = "0";
      picker.querySelectorAll("button").forEach((b) => b.classList.remove("on"));
    }
  });

  // Vote handlers
  document.querySelectorAll(".review-card").forEach((card) => {
    const id = card.dataset.reviewId;
    card.querySelectorAll("button[data-vote]").forEach((btn) => btn.addEventListener("click", () => {
      const review = reviews.find((x) => x.id === id);
      if (!review) return;
      if (btn.dataset.vote === "up") review.likes = (review.likes || 0) + 1;
      else review.dislikes = (review.dislikes || 0) + 1;
      saveArray(STORAGE.reviews, reviews);
      renderCompanyTabContent(false);
    }));
  });

  if (focusWriteReview) {
    const wr = $("writeReviewCard");
    if (wr) wr.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function companyJobsTabHtml(co) {
  const list = companyJobs(co.name);
  if (!list.length) {
    return `<div class="app-detail-card"><h3>Jobs at ${escapeHtml(co.name)}</h3>
      <p style="margin:0; color:var(--muted);">No open jobs from this company on Matchify yet.</p></div>`;
  }
  const cards = list.map((j) => `<article class="company-job-card" data-job-id="${escapeHtml(j.id)}">
    <h5>${escapeHtml(j.title)}</h5>
    <div class="meta">
      <span>📍 ${escapeHtml(j.location || "—")}</span>
      <span>${escapeHtml(j.workMode || "")}</span>
    </div>
    <span class="salary-chip">${escapeHtml(formatSalary(j))}</span>
  </article>`).join("");
  return `<div class="app-detail-card">
    <h3>Jobs at ${escapeHtml(co.name)}</h3>
    <div class="company-jobs-strip">${cards}</div>
  </div>`;
}

function wireJobsTab(co) {
  document.querySelectorAll(".company-job-card").forEach((card) => {
    card.addEventListener("click", () => {
      const id = card.dataset.jobId;
      navigateTo("candidateFindJobsPage");
      openJobDetail(id);
    });
  });
}

/* ---------- My Jobs ---------- */
function candidateStatusBadge(app) {
  if (app.candidateArchived) {
    return { cls: "not-selected", label: "Not Selected", icon: "x" };
  }
  if (app.status !== "applied") return null;
  const empStatus = app.employerStatus || "applied";
  if (empStatus === "rejected") return { cls: "not-selected", label: "Not Selected", icon: "x" };
  if (empStatus === "interview_scheduled") return { cls: "interview", label: "Interview Scheduled", icon: "check" };
  if (empStatus === "shortlisted") return { cls: "shortlisted", label: "Shortlisted", icon: "check" };
  if (app.viewedByEmployer) return { cls: "viewed", label: "Viewed by Employer", icon: "check" };
  return { cls: "applied-success", label: "Applied successfully", icon: "check" };
}

function badgeHtml(badge) {
  if (!badge) return "";
  const icon = badge.icon === "x"
    ? '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>'
    : '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
  return `<span class="app-status-pill ${badge.cls}">${icon}${escapeHtml(badge.label)}</span>`;
}

function latestEventLine(app) {
  if (!Array.isArray(app.events) || !app.events.length) return null;
  return app.events[app.events.length - 1];
}

function renderMyJobs() {
  if (!currentUser) return;
  const myApps = applications.filter((a) => a.candidateUserId === currentUser.id);
  const myInterviews = interviews.filter((iv) => iv.candidateUserId === currentUser.id);
  const savedCount = myApps.filter((a) => a.status === "saved" && !a.candidateArchived).length;
  const appliedCount = myApps.filter((a) => a.status === "applied" && !a.candidateArchived).length;
  const archivedCount = myApps.filter((a) => a.candidateArchived).length;
  $("savedCount").textContent = String(savedCount);
  $("appliedCount").textContent = String(appliedCount);
  const archivedCountEl = $("archivedCount");
  if (archivedCountEl) archivedCountEl.textContent = String(archivedCount);
  const interviewsCountEl = $("interviewsCount");
  if (interviewsCountEl) interviewsCountEl.textContent = String(myInterviews.length);

  const wrap = $("myJobsList");
  wrap.innerHTML = "";

  if (myJobsTab === "interviews") {
    renderCandidateInterviews(wrap, myInterviews);
    return;
  }

  let filtered;
  if (myJobsTab === "archived") {
    filtered = myApps.filter((a) => a.candidateArchived);
  } else {
    filtered = myApps.filter((a) => a.status === myJobsTab && !a.candidateArchived);
  }
  if (!filtered.length) {
    wrap.innerHTML = `<div class="empty">No ${myJobsTab} jobs yet. Browse the Find Jobs page.</div>`;
    return;
  }
  filtered
    .sort((a, b) => b.createdAt - a.createdAt)
    .forEach((app) => {
      const job = jobs.find((j) => j.id === app.jobId);
      if (!job) return;
      const employer = getEmployerInfo(job.userId);
      const ivForApp = interviews.find((iv) => iv.candidateUserId === currentUser.id && iv.jobId === app.jobId);
      const badge = candidateStatusBadge(app);
      const latest = latestEventLine(app);
      const showActions = !app.candidateArchived;
      const isApplied = app.status === "applied";

      const card = document.createElement("article");
      card.className = "application-card application-card-clickable";
      card.innerHTML = `
        <div class="app-icon">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"></rect><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </div>
        <div class="app-body">
          <h4>${escapeHtml(job.title)}</h4>
          <div class="app-meta">
            <span>🏢 ${escapeHtml(job.company)}</span>
            <span>📍 ${escapeHtml(job.location)}</span>
            <span>🕒 ${app.status === "applied" ? "Applied" : "Saved"} ${formatDate(app.createdAt)}</span>
          </div>
          ${ivForApp && isApplied ? `<p class="my-jobs-interview-note">📅 Interview ${formatDateTime(new Date(ivForApp.dateTime).getTime())} · <a href="${escapeHtml(ivForApp.meetingLink || "")}" target="_blank" rel="noopener">${escapeHtml(ivForApp.meetingType === "google_meet" ? "Join Google Meet" : ivForApp.meetingLink || "View")}</a></p>` : ""}
          ${latest && isApplied ? `<p class="my-jobs-event-note"><span class="event-dot"></span>${escapeHtml(latest.label)} <span class="event-date">${formatDate(latest.at)}</span></p>` : ""}
        </div>
        <div class="app-card-aside">
          ${badgeHtml(badge)}
          <div class="app-row-actions">
            ${isApplied ? `<button type="button" class="secondary small" data-action="detail">View Details</button>` : `<button type="button" class="secondary small" data-action="viewJob">View Details</button>`}
            ${showActions && employer && isApplied ? '<button type="button" class="ghost small" data-action="message">✉ Message</button>' : ""}
            ${showActions ? `<button type="button" class="ghost small" data-action="${isApplied ? "archive" : "remove"}">${isApplied ? "Archive" : "Remove"}</button>` : `<button type="button" class="ghost small" data-action="restore">Restore</button>`}
          </div>
        </div>
      `;
      card.querySelectorAll("button[data-action]").forEach((btn) => btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        if (action === "detail") openApplicationDetail(app.id);
        if (action === "viewJob") { navigateTo("candidateFindJobsPage"); openJobDetail(job.id); }
        if (action === "message" && employer) openMessageThreadWith(employer.userId, job.id);
        if (action === "archive") {
          app.candidateArchived = true;
          pushAppEvent(app, "archived", "Application withdrawn.");
          saveArray(STORAGE.applications, applications);
          renderMyJobs();
        }
        if (action === "remove") {
          applications = applications.filter((a) => a.id !== app.id);
          saveArray(STORAGE.applications, applications);
          renderMyJobs();
        }
        if (action === "restore") {
          app.candidateArchived = false;
          pushAppEvent(app, "restored", "Application restored.");
          saveArray(STORAGE.applications, applications);
          renderMyJobs();
        }
      }));
      if (isApplied) {
        card.addEventListener("click", () => openApplicationDetail(app.id));
      }
      wrap.appendChild(card);
    });
}

function renderCandidateInterviews(wrap, myInterviews) {
  if (!myInterviews.length) {
    wrap.innerHTML = '<div class="empty">No interview invitations yet. Recruiters will reach out as you apply!</div>';
    return;
  }
  const sorted = myInterviews.slice().sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
  sorted.forEach((iv) => {
    const job = jobs.find((j) => j.id === iv.jobId);
    const employer = getEmployerInfo(iv.employerUserId);
    const dt = new Date(iv.dateTime);
    const dateLabel = dt.toDateString() === new Date().toDateString() ? "TODAY"
      : dt.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase();
    const timeLabel = dt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    const stripe = iv.meetingType === "google_meet" ? "" : iv.meetingType === "phone" ? "purple" : "green";

    const row = document.createElement("article");
    row.className = "interview-row";
    row.innerHTML = `
      <div class="interview-time">${escapeHtml(dateLabel)}<strong>${escapeHtml(timeLabel)}</strong></div>
      <div class="interview-stripe ${stripe}"></div>
      <div class="interview-body">
        <h4>${escapeHtml(iv.title)}</h4>
        <p class="interview-subject ${stripe}">${escapeHtml(job ? `${job.title} @ ${job.company}` : "Interview")}</p>
        <div class="interview-meta">
          <span>⏱ ${iv.durationMinutes} mins</span>
          <span>${meetingLabel(iv)}</span>
          ${employer ? `<span>👤 ${escapeHtml(employer.name)}</span>` : ""}
        </div>
      </div>
      <div class="interview-actions">
        ${iv.meetingType === "google_meet" ? `<button type="button" class="primary-blue" data-action="join">Join Call</button>` : `<button type="button" class="secondary" data-action="copy">Copy Link</button>`}
        ${job ? `<button type="button" class="secondary" data-action="viewJob">View Job</button>` : ""}
        ${employer ? `<button type="button" class="secondary" data-action="message">✉ Message</button>` : ""}
      </div>
    `;
    row.querySelectorAll("button[data-action]").forEach((btn) => btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      if (action === "join") window.open(iv.meetingLink, "_blank", "noopener");
      if (action === "copy") {
        navigator.clipboard?.writeText(iv.meetingLink || "");
        btn.textContent = "Copied!";
        setTimeout(() => { btn.textContent = "Copy Link"; }, 1500);
      }
      if (action === "viewJob" && job) { navigateTo("candidateFindJobsPage"); openJobDetail(job.id); }
      if (action === "message" && employer) openMessageThreadWith(employer.userId, iv.jobId);
    }));
    wrap.appendChild(row);
  });
}

function formatDate(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/* ---------- Employer: candidate directory ---------- */
function filterCandidates() {
  const keyword = $("candidateSearchInput").value.trim();
  const education = $("candidateFilterEducation").value;
  const minExp = $("candidateFilterMinExp").value ? Number($("candidateFilterMinExp").value) : null;
  const skill = $("candidateFilterSkill").value.trim();
  const location = $("candidateFilterLocation").value.trim();
  const workMode = $("candidateFilterWorkMode").value;

  return candidates.filter((cand) => {
    if (keyword && !fuzzyMatch(keyword, profileText(cand))) return false;
    if (education && cand.education !== education) return false;
    if (minExp !== null && cand.experience < minExp) return false;
    if (skill && !cand.skills.some((s) => fuzzyMatch(skill, s))) return false;
    if (location && !fuzzyMatch(location, cand.preferredLocation || "")) return false;
    if (workMode && cand.preferredWorkMode !== workMode && cand.preferredWorkMode !== "Any") return false;
    return true;
  });
}

function renderCandidatesGrid() {
  const wrap = $("allCandidatesGrid");
  wrap.innerHTML = "";
  const list = filterCandidates();
  if (!list.length) {
    wrap.innerHTML = '<div class="empty">No candidate profiles match your filters.</div>';
    return;
  }
  list.forEach((cand) => wrap.appendChild(buildCandidateCard(cand)));
}

function buildCandidateCard(cand, scoreInfo) {
  const card = document.createElement("article");
  card.className = "candidate-card";
  const initials = (cand.name || "C").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  const topSkills = (cand.skills || []).slice(0, 4)
    .map((s) => `<span class="chip">${escapeHtml(s)}</span>`)
    .join("");
  card.innerHTML = `
    <div class="candidate-card-head">
      <div class="cand-avatar">${escapeHtml(initials)}</div>
      <div>
        <h4>${escapeHtml(cand.name)}</h4>
        <p class="cand-meta">${escapeHtml(cand.major || "")}</p>
      </div>
      ${scoreInfo ? `<span class="chip match-score" style="margin-left:auto;">${scoreInfo}% match</span>` : ""}
    </div>
    <p class="cand-row">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 7l10-5 10 5-10 5L2 7z"></path><path d="M6 10v5c0 1 3 3 6 3s6-2 6-3v-5"></path></svg>
      ${escapeHtml(cand.education || "—")}
    </p>
    <p class="cand-row">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"></rect><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
      ${cand.experience || 0} years of experience
    </p>
    <p class="cand-row">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s7-7 7-12a7 7 0 0 0-14 0c0 5 7 12 7 12z"></path><circle cx="12" cy="10" r="2.5"></circle></svg>
      ${escapeHtml(cand.preferredLocation || "Any location")} &middot; ${escapeHtml(cand.preferredWorkMode || "Any")}
    </p>
    <p class="skills-label">
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px; margin-right:4px;"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
      Top Skills
    </p>
    <div class="chip-row">${topSkills || '<span class="hint">No skills listed</span>'}</div>
    <div class="candidate-card-foot">
      <button type="button" class="link view-profile-link" data-view-candidate="${cand.id}">View Full Profile <span class="arrow">&rarr;</span></button>
    </div>
  `;
  const link = card.querySelector("[data-view-candidate]");
  if (link) link.addEventListener("click", (e) => {
    e.stopPropagation();
    openCandidateDetail(cand.id);
  });
  return card;
}

function openCandidateDetail(idOrUserId) {
  if (!idOrUserId) return;
  const byProfile = candidates.find((c) => c.id === idOrUserId);
  const userId = byProfile ? byProfile.userId : idOrUserId;
  const cand = getCandidateInfo(userId);
  if (!cand) return;

  // Track "Viewed by Employer" for applications targeting this employer's jobs
  if (currentUser && currentUser.role === "Employer" && currentUser.id !== userId) {
    markCandidateViewedByEmployer(userId, currentUser.id);
  }

  const panel = $("candidateDetailPanel");
  const body = $("candidateDetailBody");
  if (!panel || !body) return;

  const initials = (cand.name || "C").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  const allSkills = (cand.skills || []).length
    ? (cand.skills || []).map((s) => `<span class="chip">${escapeHtml(s)}</span>`).join("")
    : '<span class="hint">No skills listed</span>';

  const workExp = (cand.workExperience || []).slice().sort((a, b) => (b.startYear || 0) - (a.startYear || 0));
  const workHtml = workExp.length
    ? workExp.map((w) => {
        const end = w.endYear ? w.endYear : "Present";
        return `<article class="work-exp-item" style="background:#fff;">
          <div>
            <h5>${escapeHtml(w.title)} <span style="color:var(--muted); font-weight:500;">@ ${escapeHtml(w.company)}</span></h5>
            <p>${escapeHtml(String(w.startYear || ""))} - ${escapeHtml(String(end))}${w.description ? " &middot; " + escapeHtml(w.description) : ""}</p>
          </div>
        </article>`;
      }).join("")
    : '<p class="hint">No work experience added.</p>';

  const isEmployerView = currentUser && currentUser.role === "Employer" && currentUser.id !== userId;
  const incompleteBanner = !cand.hasProfile
    ? '<p class="status warn" style="margin-bottom:0.6rem;">⚠ Candidate has not completed their profile yet — only basic account info is available.</p>'
    : "";

  body.innerHTML = `
    <div class="candidate-detail-header">
      <div class="cand-avatar large">${escapeHtml(initials)}</div>
      <div>
        <h2>${escapeHtml(cand.name)}</h2>
        <p class="detail-company">${escapeHtml(cand.major || (cand.hasProfile ? "—" : "Profile not completed"))}</p>
      </div>
    </div>
    ${incompleteBanner}
    ${isEmployerView ? `
      <div class="detail-actions">
        <button type="button" class="primary-blue" data-detail-action="message">✉ Send Message</button>
        <button type="button" class="secondary" data-detail-action="schedule">Schedule Interview</button>
      </div>
    ` : ""}

    <h3>Contact</h3>
    <p><strong>Email:</strong> ${escapeHtml(cand.email || "—")}</p>
    <p><strong>Phone:</strong> ${escapeHtml(cand.contact || "—")}</p>

    <h3>Education &amp; Experience</h3>
    <p><strong>Highest education:</strong> ${escapeHtml(cand.education || "—")}</p>
    <p><strong>Major / Field:</strong> ${escapeHtml(cand.major || "—")}</p>
    <p><strong>Years of experience:</strong> ${cand.experience || 0}</p>

    <h3>Preferences</h3>
    <p><strong>Preferred work mode:</strong> ${escapeHtml(cand.preferredWorkMode || "Any")}</p>
    <p><strong>Preferred location:</strong> ${escapeHtml(cand.preferredLocation || "Any")}</p>

    <h3>Skills</h3>
    <div class="chip-row">${allSkills}</div>

    <h3>Work Experience</h3>
    <div class="work-exp-list">${workHtml}</div>
  `;

  body.querySelectorAll("[data-detail-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.detailAction;
      if (action === "message") {
        closeCandidateDetail();
        openMessageThreadWith(cand.userId, null);
      } else if (action === "schedule") {
        closeCandidateDetail();
        const existingApp = applications.find((a) =>
          a.candidateUserId === cand.userId &&
          ownedJobs().some((j) => j.id === a.jobId)
        );
        openInterviewModal(existingApp ? { applicationId: existingApp.id } : {});
      }
    });
  });

  show(panel, true);
}

function closeCandidateDetail() {
  show($("candidateDetailPanel"), false);
}

function refreshRecommendationJobSelector() {
  const select = $("recommendationJobSelector");
  if (!select) return;
  const myJobs = ownedJobs();
  select.innerHTML = "";
  if (!myJobs.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "-- Post a job first --";
    select.appendChild(opt);
    activeRecommendationJobId = null;
  } else {
    myJobs.forEach((job) => {
      const opt = document.createElement("option");
      opt.value = job.id;
      opt.textContent = `${job.title} - ${job.company}`;
      select.appendChild(opt);
    });
    if (!activeRecommendationJobId || !myJobs.some((j) => j.id === activeRecommendationJobId)) {
      activeRecommendationJobId = myJobs[0].id;
    }
    select.value = activeRecommendationJobId;
  }
  renderRecommendedCandidates();
}

function candidateRecommendationLimit() {
  if (!currentUser) return FREE_RECOMMENDATION_LIMIT;
  if (currentUser.membership && candidateRecTier === "premium") return Infinity;
  return FREE_RECOMMENDATION_LIMIT;
}

function setCandidateRecTier(tier) {
  candidateRecTier = tier === "premium" ? "premium" : "basic";
  document.querySelectorAll("#candidateRecTierTabs .rec-tier-tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.recTier === candidateRecTier);
  });
  renderRecommendedCandidates();
}

function renderRecommendedCandidatesPremiumCta(totalMatches) {
  const cta = $("recommendedCandidatesPremiumCta");
  if (!cta) return;
  const isPremiumMember = !!(currentUser && currentUser.membership);
  const showCta = !isPremiumMember && candidateRecTier === "premium" && totalMatches > 0;
  if (!showCta) {
    cta.classList.add("hidden");
    cta.innerHTML = "";
    return;
  }
  cta.classList.remove("hidden");
  cta.innerHTML = `
    <p>Unlock all candidate matches</p>
    <button type="button" class="rec-premium-btn" id="candidateRecUpgradeBtn">Upgrade to Premium</button>
  `;
  const btn = $("candidateRecUpgradeBtn");
  if (btn) btn.addEventListener("click", () => {
    navigateTo("premiumPage");
    renderPremiumPage();
  });
}

function buildRecCandidateCard(cand, score) {
  const card = document.createElement("div");
  card.className = "rec-card";
  const topSkills = (cand.skills || []).slice(0, 3)
    .map((s) => `<span class="chip chip-blue">${escapeHtml(s)}</span>`)
    .join("");
  card.innerHTML = `
    <div class="rec-card-head">
      <div class="rec-card-user">
        <div class="rec-card-avatar" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"></circle><path d="M4 21c0-4 4-7 8-7s8 3 8 7"></path></svg>
        </div>
        <div>
          <h5>${escapeHtml(cand.name)}</h5>
          <p class="rec-company">${escapeHtml(cand.major || "Candidate")}</p>
        </div>
      </div>
      <span class="rec-match">Match: ${score}</span>
    </div>
    <div class="chip-row">${topSkills}</div>
    <p class="rec-exp">${cand.experience || 0} yrs exp</p>
  `;
  card.title = "Click to view full profile";
  card.addEventListener("click", () => openCandidateDetail(cand.userId));
  return card;
}

function renderRecommendedCandidates() {
  const wrap = $("recommendedCandidatesList");
  if (!wrap) return;
  wrap.innerHTML = "";
  const cta = $("recommendedCandidatesPremiumCta");
  if (cta) cta.classList.add("hidden");

  document.querySelectorAll("#candidateRecTierTabs .rec-tier-tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.recTier === candidateRecTier);
  });

  if (!activeRecommendationJobId) {
    wrap.innerHTML = '<div class="empty">Post a job to receive candidate recommendations.</div>';
    return;
  }
  if (!candidates.length) {
    wrap.innerHTML = '<div class="empty">No candidate profiles in the system yet.</div>';
    return;
  }
  const job = jobs.find((j) => j.id === activeRecommendationJobId);
  if (!job) return;

  const allScored = candidates
    .map((cand) => ({ cand, score: scoreCandidateForJob(job, cand) }))
    .sort((a, b) => b.score - a.score);
  const isPremiumMember = !!(currentUser && currentUser.membership);

  if (!isPremiumMember && candidateRecTier === "premium") {
    wrap.innerHTML = allScored.length
      ? '<div class="empty rec-premium-tab-empty">Upgrade to Premium to unlock every matching candidate for this role.</div>'
      : '<div class="empty">No matching candidates for this job yet.</div>';
    renderRecommendedCandidatesPremiumCta(allScored.length);
    return;
  }

  const limit = candidateRecommendationLimit();
  const scored = allScored.slice(0, limit);

  if (!scored.length) {
    wrap.innerHTML = '<div class="empty">No matching candidates for this job yet.</div>';
    renderRecommendedCandidatesPremiumCta(allScored.length);
    return;
  }

  scored.forEach(({ cand, score }) => {
    wrap.appendChild(buildRecCandidateCard(cand, score));
  });

  renderRecommendedCandidatesPremiumCta(allScored.length);
}

/* ============================================================
   MESSAGING (Candidate <-> Employer)
   ============================================================ */
function threadKey(userA, userB, jobId) {
  const ids = [String(userA), String(userB)].sort();
  return `${ids[0]}__${ids[1]}__${jobId || "general"}`;
}

function decodeThreadKey(key) {
  const parts = key.split("__");
  return {
    userIdA: parts[0],
    userIdB: parts[1],
    jobId: parts[2] === "general" ? null : parts[2]
  };
}

function otherPartyId(thread) {
  if (!currentUser) return null;
  return thread.userIdA === currentUser.id ? thread.userIdB : thread.userIdA;
}

function sendMessage({ fromUserId, toUserId, jobId = null, body, system = false }) {
  const text = String(body || "").trim();
  if (!text || !fromUserId || !toUserId) return null;
  const msg = {
    id: createId("msg"),
    threadId: threadKey(fromUserId, toUserId, jobId),
    fromUserId,
    toUserId,
    jobId: jobId || null,
    body: text,
    createdAt: Date.now(),
    read: false,
    system: !!system
  };
  messages.push(msg);
  saveArray(STORAGE.messages, messages);
  return msg;
}

function getThreadsForUser(userId) {
  if (!userId) return [];
  const grouped = new Map();
  messages
    .filter((m) => m.fromUserId === userId || m.toUserId === userId)
    .sort((a, b) => a.createdAt - b.createdAt)
    .forEach((m) => {
      if (!grouped.has(m.threadId)) grouped.set(m.threadId, []);
      grouped.get(m.threadId).push(m);
    });
  return Array.from(grouped.entries()).map(([key, msgs]) => {
    const decoded = decodeThreadKey(key);
    const lastMsg = msgs[msgs.length - 1];
    const unread = msgs.filter((m) => m.toUserId === userId && !m.read).length;
    return { key, ...decoded, messages: msgs, lastMsg, unread };
  }).sort((a, b) => b.lastMsg.createdAt - a.lastMsg.createdAt);
}

function unreadMessageCountFor(userId) {
  return messages.filter((m) => m.toUserId === userId && !m.read).length;
}

function markThreadRead(key) {
  if (!currentUser || !key) return;
  let changed = false;
  messages.forEach((m) => {
    if (m.threadId === key && m.toUserId === currentUser.id && !m.read) {
      m.read = true;
      changed = true;
    }
  });
  if (changed) {
    saveArray(STORAGE.messages, messages);
    refreshMessageBadges();
  }
}

function displayInfoForUser(userId) {
  if (!userId) return { name: "Unknown", role: "" };
  const user = users.find((u) => u.id === userId);
  if (!user) return { name: "Unknown user", role: "" };
  if (user.role === "Candidate") {
    const cand = getCandidateInfo(userId);
    return {
      userId,
      name: cand ? cand.name : user.name,
      subtitle: cand ? (cand.major || "Candidate") : "Candidate",
      role: "Candidate"
    };
  }
  return {
    userId,
    name: user.company || user.name,
    subtitle: user.name && user.name !== user.company ? `${user.name} · Recruiter` : "Recruiter",
    role: "Employer"
  };
}

function openMessageThreadWith(otherUserId, jobId) {
  if (!currentUser) return;
  if (!otherUserId || otherUserId === currentUser.id) return;
  activeThreadKey = threadKey(currentUser.id, otherUserId, jobId);
  if (!messages.some((m) => m.threadId === activeThreadKey)) {
    /* Create thread placeholder so it shows up in the list */
    const other = displayInfoForUser(otherUserId);
    const greeting = currentUser.role === "Employer"
      ? `Hi ${other.name}, I came across your profile and would love to chat about a role at our company.`
      : `Hi, I wanted to reach out about the role.`;
    /* Don't auto-send: just leave the user to send. But create a "draft" thread marker as a system note from current to other. */
    sendMessage({
      fromUserId: currentUser.id,
      toUserId: otherUserId,
      jobId: jobId || null,
      body: greeting,
      system: false
    });
  }
  navigateTo("messagesPage");
  renderMessagesPage();
}

function isUserOnline(userId) {
  if (!messagesOnlineStatus || !userId) return false;
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = ((hash << 5) - hash) + userId.charCodeAt(i);
  return Math.abs(hash) % 3 !== 0;
}

function formatThreadListTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfMsgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.round((startOfToday - startOfMsgDay) / 86400000);
  if (dayDiff === 0) {
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  if (dayDiff === 1) return "Yesterday";
  if (dayDiff < 7) {
    return d.toLocaleDateString(undefined, { weekday: "short" });
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatMessageBubbleTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfMsgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.round((startOfToday - startOfMsgDay) / 86400000);
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (dayDiff === 0) return time;
  if (dayDiff === 1) return `Yesterday ${time}`;
  if (dayDiff < 7) {
    const weekday = d.toLocaleDateString(undefined, { weekday: "long" });
    return `${weekday} ${time}`;
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function renderMessagesWelcomeHint() {
  const hint = $("messagesWelcomeHint");
  if (!hint || !currentUser) return;
  hint.textContent = currentUser.role === "Employer"
    ? "Select a conversation from the sidebar to view and respond to candidate messages. Keep your status online to reply faster!"
    : "Select a conversation from the sidebar to view and respond to employer messages. Keep your status online to reply faster!";
}

function renderMessagesPage() {
  if (!currentUser) return;
  renderMessagesWelcomeHint();
  const onlineToggle = $("messagesOnlineToggle");
  if (onlineToggle) onlineToggle.checked = messagesOnlineStatus;

  const allThreads = getThreadsForUser(currentUser.id);

  const searchInput = $("threadSearchInput");
  const q = (searchInput && searchInput.value.trim()) || "";

  let threads = allThreads;
  if (threadFilter === "unread") {
    threads = threads.filter((t) => t.unread > 0);
  }
  if (q) {
    threads = threads.filter((t) => {
      const other = otherPartyId(t);
      const info = displayInfoForUser(other);
      const job = t.jobId ? jobs.find((j) => j.id === t.jobId) : null;
      return fuzzyMatch(q, [info.name, info.subtitle || "", job ? job.title : "", t.lastMsg.body].join(" "));
    });
  }

  const wrap = $("messageThreadList");
  wrap.innerHTML = "";

  if (!threads.length) {
    wrap.innerHTML = '<div class="empty">' + (allThreads.length ? "No conversations match your search." : "No conversations yet. Reach out from a job listing or application to start one.") + '</div>';
    renderMessageChat(null);
    $("messagesEmpty").classList.remove("hidden");
    show($("messagesChat"), false);
    return;
  }

  if (!activeThreadKey || !threads.some((t) => t.key === activeThreadKey)) {
    activeThreadKey = threads[0].key;
  }

  threads.forEach((t) => {
    const other = otherPartyId(t);
    const info = displayInfoForUser(other);
    const initials = (info.name || "?").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
    const job = t.jobId ? jobs.find((j) => j.id === t.jobId) : null;
    const subjectLine = job ? job.title : (info.role === "Candidate" ? (info.subtitle || "Candidate") : "General");
    const showOnline = isUserOnline(other);

    const el = document.createElement("button");
    el.type = "button";
    el.className = "thread-item" + (t.key === activeThreadKey ? " active" : "");
    el.innerHTML = `
      <div class="thread-avatar-wrap">
        <div class="thread-avatar">${escapeHtml(initials)}</div>
        ${showOnline ? '<span class="thread-online-dot" aria-label="Online"></span>' : ""}
      </div>
      <div class="thread-body">
        <div class="thread-row">
          <strong>${escapeHtml(info.name)}</strong>
          <span class="thread-time">${formatThreadListTime(t.lastMsg.createdAt)}</span>
        </div>
        <p class="thread-subject">${escapeHtml(subjectLine)}</p>
        <p class="thread-preview">${escapeHtml(t.lastMsg.body)}</p>
      </div>
      ${t.unread ? `<span class="thread-unread">${t.unread}</span>` : ""}
    `;
    el.addEventListener("click", () => {
      activeThreadKey = t.key;
      markThreadRead(t.key);
      renderMessagesPage();
    });
    wrap.appendChild(el);
  });

  const active = threads.find((t) => t.key === activeThreadKey);
  renderMessageChat(active);
  markThreadRead(activeThreadKey);
}

function renderMessageChat(thread) {
  const chat = $("messagesChat");
  const emptyEl = $("messagesEmpty");
  if (!thread) {
    show(chat, false);
    show(emptyEl, true);
    return;
  }
  show(emptyEl, false);
  show(chat, true);

  const other = otherPartyId(thread);
  const info = displayInfoForUser(other);
  const job = thread.jobId ? jobs.find((j) => j.id === thread.jobId) : null;
  const initials = (info.name || "?").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  const headerSubtitle = job
    ? job.title
    : (info.role === "Candidate" ? (info.subtitle || "Candidate") : (info.subtitle || "Recruiter"));

  $("chatHeader").innerHTML = `
    <div class="thread-avatar-wrap">
      <div class="thread-avatar large">${escapeHtml(initials)}</div>
      ${isUserOnline(other) ? '<span class="thread-online-dot" aria-label="Online"></span>' : ""}
    </div>
    <div class="chat-header-body">
      <div class="chat-header-name">
        <span>${escapeHtml(info.name)}</span>
        <span class="verified-badge" title="Verified">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        </span>
      </div>
      <p>${escapeHtml(headerSubtitle)}</p>
    </div>
    <div class="chat-header-actions">
      <button type="button" class="chat-header-icon" aria-label="Audio call" title="Audio call">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
      </button>
      <button type="button" class="chat-header-icon" aria-label="Video call" title="Video call">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
      </button>
      <button type="button" class="chat-header-icon" aria-label="More options" title="More options">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
      </button>
      ${info.role === "Candidate" && currentUser.role === "Employer" ? '<button type="button" class="secondary" id="chatViewCandidate">View Profile</button>' : ""}
      ${job && currentUser.role === "Candidate" ? `<button type="button" class="secondary" id="chatViewJob">View Job</button>` : ""}
    </div>
  `;

  const viewCand = $("chatViewCandidate");
  if (viewCand) viewCand.addEventListener("click", () => openCandidateDetail(other));
  const viewJob = $("chatViewJob");
  if (viewJob) viewJob.addEventListener("click", () => {
    if (currentUser.role === "Candidate") {
      navigateTo("candidateFindJobsPage");
      openJobDetail(job.id);
    }
  });

  const body = $("chatMessages");
  body.innerHTML = "";
  thread.messages.forEach((m) => {
    const own = m.fromUserId === currentUser.id;
    if (m.system) {
      const bubble = document.createElement("div");
      bubble.className = "chat-msg system";
      bubble.innerHTML = `
        <span class="msg-system-label">System</span>
        <p class="msg-body">${escapeHtml(m.body).replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')}</p>
      `;
      body.appendChild(bubble);
      return;
    }
    const group = document.createElement("div");
    group.className = `chat-msg-group${own ? " own" : ""}`;
    group.innerHTML = `
      <div class="chat-msg">
        <p class="msg-body">${escapeHtml(m.body).replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')}</p>
      </div>
      <span class="msg-time">${formatMessageBubbleTime(m.createdAt)}</span>
    `;
    body.appendChild(group);
  });
  body.scrollTop = body.scrollHeight;

  const chatInput = $("chatInput");
  if (chatInput) {
    chatInput.placeholder = `Reply to ${info.name}...`;
    chatInput.value = "";
    chatInput.style.height = "auto";
  }
}

function formatDateTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function formatRelativeTime(ts) {
  if (!ts) return "";
  const diff = Date.now() - ts;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d`;
  return formatDate(ts);
}

function handleSendMessage(event) {
  event.preventDefault();
  if (!currentUser || !activeThreadKey) return;
  const input = $("chatInput");
  const text = input ? input.value : "";
  if (!text.trim()) return;
  const decoded = decodeThreadKey(activeThreadKey);
  const toUserId = decoded.userIdA === currentUser.id ? decoded.userIdB : decoded.userIdA;
  sendMessage({ fromUserId: currentUser.id, toUserId, jobId: decoded.jobId, body: text });
  if (input) {
    input.value = "";
    input.style.height = "auto";
  }
  renderMessagesPage();
}

function handleChatInputKeydown(event) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    handleSendMessage(event);
  }
}

function autoResizeChatInput(el) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
}

function refreshMessageBadges() {
  if (!currentUser) return;
  const count = unreadMessageCountFor(currentUser.id);
  document.querySelectorAll("[data-nav-messages]").forEach((badge) => {
    if (!count) badge.classList.add("hidden");
    else { badge.classList.remove("hidden"); badge.textContent = count > 9 ? "9+" : String(count); }
  });
}

/* ============================================================
   EMPLOYER: Applications management
   ============================================================ */
function employerApplications() {
  if (!currentUser || currentUser.role !== "Employer") return [];
  const myJobIds = new Set(ownedJobs().map((j) => j.id));
  return applications.filter((a) => myJobIds.has(a.jobId) && a.status === "applied");
}

function renderApplicationsPage() {
  refreshApplicationsJobFilter();
  const list = employerApplications();
  $("appsAllCount").textContent = list.length;
  $("appsAppliedCount").textContent = list.filter((a) => (a.employerStatus || "applied") === "applied").length;
  $("appsShortlistedCount").textContent = list.filter((a) => a.employerStatus === "shortlisted").length;
  $("appsInterviewCount").textContent = list.filter((a) => a.employerStatus === "interview_scheduled").length;
  $("appsRejectedCount").textContent = list.filter((a) => a.employerStatus === "rejected").length;

  let visible = list;
  if (applicationsTab !== "all") {
    visible = visible.filter((a) => (a.employerStatus || "applied") === applicationsTab);
  }
  if (applicationsJobFilterId) {
    visible = visible.filter((a) => a.jobId === applicationsJobFilterId);
  }
  if (applicationsSearchText) {
    const q = applicationsSearchText;
    visible = visible.filter((a) => {
      const cand = candidateForApplication(a);
      const job = jobs.find((j) => j.id === a.jobId);
      const text = [
        cand ? cand.name : "",
        cand ? cand.major : "",
        cand ? (cand.skills || []).join(" ") : "",
        job ? job.title : "",
        job ? job.company : ""
      ].join(" ");
      return fuzzyMatch(q, text);
    });
  }

  const wrap = $("applicationsList");
  wrap.innerHTML = "";
  if (!visible.length) {
    wrap.innerHTML = '<div class="empty">No applications match this view yet.</div>';
    return;
  }
  visible
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .forEach((app) => wrap.appendChild(buildApplicationRow(app)));
}

function getCandidateInfo(userId) {
  if (!userId) return null;
  const profile = candidates.find((c) => c.userId === userId);
  const user = users.find((u) => u.id === userId);
  if (!profile && !user) return null;
  return {
    id: profile ? profile.id : `user-${userId}`,
    userId,
    name: (profile && profile.name) || (user && user.name) || "Candidate",
    email: (profile && profile.email) || (user && user.email) || "",
    contact: (profile && profile.contact) || "",
    education: (profile && profile.education) || "",
    major: (profile && profile.major) || "",
    experience: (profile && profile.experience) || 0,
    skills: (profile && profile.skills) || [],
    workExperience: (profile && profile.workExperience) || [],
    preferredWorkMode: (profile && profile.preferredWorkMode) || "Any",
    preferredLocation: (profile && profile.preferredLocation) || "",
    hasProfile: !!profile
  };
}

function getEmployerInfo(userId) {
  if (!userId) return null;
  const user = users.find((u) => u.id === userId);
  if (!user) return null;
  return {
    userId,
    name: user.name || "Recruiter",
    company: user.company || user.name || "Company",
    email: user.email || ""
  };
}

function candidateForApplication(app) {
  return getCandidateInfo(app.candidateUserId);
}

function refreshApplicationsJobFilter() {
  const select = $("applicationsJobFilter");
  if (!select) return;
  const myJobs = ownedJobs();
  const previous = applicationsJobFilterId;
  select.innerHTML = '<option value="">All job postings</option>';
  myJobs.forEach((job) => {
    const opt = document.createElement("option");
    opt.value = job.id;
    opt.textContent = `${job.title} - ${job.company}`;
    select.appendChild(opt);
  });
  if (previous && myJobs.some((j) => j.id === previous)) {
    select.value = previous;
  } else {
    applicationsJobFilterId = "";
    select.value = "";
  }
}

function buildApplicationRow(app) {
  const cand = candidateForApplication(app);
  const job = jobs.find((j) => j.id === app.jobId);
  const status = app.employerStatus || "applied";
  const initials = cand ? cand.name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase() : "?";

  const card = document.createElement("article");
  card.className = "application-card";
  card.innerHTML = `
    <div class="app-icon">${escapeHtml(initials)}</div>
    <div class="app-body">
      <h4>${escapeHtml(cand ? cand.name : "Unknown candidate")}</h4>
      <div class="app-meta">
        <span>${escapeHtml(job ? `${job.title} @ ${job.company}` : "Unknown job")}</span>
        <span>${escapeHtml(cand ? `${cand.experience || 0}y exp · ${cand.education || "—"}` : "")}</span>
        <span>Applied ${formatDate(app.createdAt)}</span>
      </div>
      <div class="app-row-actions">
        <button type="button" class="secondary" data-action="view">View Profile</button>
        <button type="button" class="secondary" data-action="message">✉ Message</button>
        ${status !== "shortlisted" ? '<button type="button" class="secondary" data-action="shortlist">Shortlist</button>' : ""}
        ${status !== "interview_scheduled" ? '<button type="button" class="primary-blue" data-action="schedule">Schedule Interview</button>' : '<button type="button" class="primary-blue" data-action="viewInterview">View Interview</button>'}
        ${status !== "rejected" ? '<button type="button" class="danger" data-action="reject">Reject</button>' : '<button type="button" class="secondary" data-action="restore">Restore</button>'}
      </div>
    </div>
    <span class="app-status ${status}">${escapeHtml(APP_STATUS_LABELS[status] || status)}</span>
  `;

  card.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === "view") openCandidateDetail(app.candidateUserId);
    if (action === "message") openMessageThreadWith(app.candidateUserId, app.jobId);
    if (action === "shortlist") updateApplicationStatus(app.id, "shortlisted");
    if (action === "schedule") openInterviewModal({ applicationId: app.id });
    if (action === "viewInterview") {
      navigateTo("employerInterviewsPage");
      renderInterviewsPage();
    }
    if (action === "reject") updateApplicationStatus(app.id, "rejected");
    if (action === "restore") updateApplicationStatus(app.id, "applied");
  });

  return card;
}

function updateApplicationStatus(appId, newStatus) {
  const app = applications.find((a) => a.id === appId);
  if (!app) return;
  const prev = app.employerStatus;
  app.employerStatus = newStatus;
  if (newStatus !== prev) {
    const labelMap = {
      applied: "Application restored.",
      shortlisted: "Application shortlisted.",
      interview_scheduled: "Interview scheduled.",
      rejected: "Application not selected."
    };
    const label = labelMap[newStatus] || `Status updated to ${newStatus}.`;
    pushAppEvent(app, newStatus, label);
  }
  saveArray(STORAGE.applications, applications);
  renderApplicationsPage();
}

/* ============================================================
   EMPLOYER: Interviews
   ============================================================ */
function employerInterviews() {
  if (!currentUser || currentUser.role !== "Employer") return [];
  return interviews.filter((iv) => iv.employerUserId === currentUser.id);
}

function generateGoogleMeetLink() {
  const chunk = () => Math.random().toString(36).slice(2, 6).replace(/[0-9]/g, (d) => "abcdefghij"[Number(d)]);
  return `https://meet.google.com/${chunk()}-${chunk()}-${chunk()}`.toLowerCase();
}

function openInterviewModal(options = {}) {
  if (!currentUser || currentUser.role !== "Employer") return;
  $("interviewForm").reset();
  setStatus($("interviewStatus"), "", null);

  const candSelect = $("interviewCandidate");
  const jobSelect = $("interviewJob");
  candSelect.innerHTML = "";
  jobSelect.innerHTML = "";

  const myJobs = ownedJobs();
  if (!myJobs.length) {
    alert("Post a job first before scheduling interviews.");
    return;
  }

  candidates.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.userId;
    opt.textContent = `${c.name} (${c.major || "—"})`;
    candSelect.appendChild(opt);
  });
  myJobs.forEach((j) => {
    const opt = document.createElement("option");
    opt.value = j.id;
    opt.textContent = `${j.title} - ${j.company}`;
    jobSelect.appendChild(opt);
  });

  prefillInterviewApplicationId = null;
  if (options.applicationId) {
    const app = applications.find((a) => a.id === options.applicationId);
    if (app) {
      prefillInterviewApplicationId = app.id;
      candSelect.value = app.candidateUserId;
      jobSelect.value = app.jobId;
      const cand = candidateForApplication(app);
      const job = jobs.find((j) => j.id === app.jobId);
      if (cand && job) {
        $("interviewTitle").value = `${job.title} screen - ${cand.name}`;
      }
    }
  }

  if (!$("interviewTitle").value) {
    const job = jobs.find((j) => j.id === jobSelect.value) || myJobs[0];
    $("interviewTitle").value = job ? `${job.title} interview` : "Interview";
  }
  $("interviewDateTime").value = defaultInterviewSlot();
  $("interviewDuration").value = "60";
  $("interviewMeetingType").value = "google_meet";

  show($("interviewModal"), true);
  setTimeout(() => $("interviewTitle").focus(), 50);
}

function closeInterviewModal() {
  show($("interviewModal"), false);
}

function defaultInterviewSlot() {
  const now = new Date();
  now.setDate(now.getDate() + 1);
  now.setHours(10, 0, 0, 0);
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function handleInterviewSubmit(event) {
  event.preventDefault();
  const meetingType = $("interviewMeetingType").value;
  if (meetingType === "google_meet" && !integrations.google_meet) {
    setStatus($("interviewStatus"), "Connect Google Meet from Tools & Integrations first, or choose another meeting type.", "error");
    return;
  }

  const candidateUserId = $("interviewCandidate").value;
  const jobId = $("interviewJob").value;
  const title = $("interviewTitle").value.trim();
  const when = $("interviewDateTime").value;
  const durationMinutes = Number($("interviewDuration").value) || 60;

  if (!candidateUserId || !jobId || !title || !when) {
    setStatus($("interviewStatus"), "Please fill in all fields.", "error");
    return;
  }

  const meetingLink = meetingType === "google_meet" ? generateGoogleMeetLink()
    : (meetingType === "phone" ? "Phone Call" : "On-site / Office");

  const record = {
    id: createId("intv"),
    employerUserId: currentUser.id,
    candidateUserId,
    jobId,
    title,
    dateTime: when,
    durationMinutes,
    meetingType,
    meetingLink,
    createdAt: Date.now()
  };
  interviews.push(record);
  saveArray(STORAGE.interviews, interviews);

  /* Notify the candidate via Messages with the meet link / details */
  const job = jobs.find((j) => j.id === jobId);
  const employer = getEmployerInfo(currentUser.id);
  const dt = new Date(when);
  const dateStr = dt.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const inviteBody = [
    `Hi! You're invited to interview for ${job ? `"${job.title}" at ${job.company}` : "the role"}.`,
    `When: ${dateStr} (${durationMinutes} mins)`,
    meetingType === "google_meet" ? `Google Meet: ${meetingLink}`
      : meetingType === "phone" ? "Format: Phone call (we'll reach out at your contact number)"
        : "Format: On-site / Office",
    employer ? `Looking forward to chatting — ${employer.name}` : ""
  ].filter(Boolean).join("\n");
  sendMessage({
    fromUserId: currentUser.id,
    toUserId: candidateUserId,
    jobId,
    body: inviteBody,
    system: true
  });

  let applicationToUpdate = applications.find((a) => a.id === prefillInterviewApplicationId);
  if (!applicationToUpdate) {
    applicationToUpdate = applications.find((a) => a.candidateUserId === candidateUserId && a.jobId === jobId && a.status === "applied");
  }
  if (applicationToUpdate) {
    if (applicationToUpdate.employerStatus !== "interview_scheduled") {
      applicationToUpdate.employerStatus = "interview_scheduled";
      pushAppEvent(applicationToUpdate, "interview_scheduled", `Interview scheduled for ${dateStr}.`);
    }
  } else {
    applications.push({
      id: createId("app"),
      candidateUserId,
      jobId,
      status: "applied",
      employerStatus: "interview_scheduled",
      viewedByEmployer: true,
      candidateArchived: false,
      events: [
        { kind: "submitted", label: "Application successfully submitted.", at: Date.now() },
        { kind: "interview_scheduled", label: `Interview scheduled for ${dateStr}.`, at: Date.now() }
      ],
      createdAt: Date.now()
    });
  }
  saveArray(STORAGE.applications, applications);

  closeInterviewModal();
  renderInterviewsPage();
  renderApplicationsPage();
  renderSourcingMetrics();
  navigateTo("employerInterviewsPage");
}

function renderInterviewsPage() {
  renderWeekGrid();
  renderActionRequired();
  renderInterviewList();
}

function renderWeekGrid() {
  const grid = $("interviewsWeekGrid");
  if (!grid) return;
  grid.innerHTML = "";
  const heads = ["S", "M", "T", "W", "T", "F", "S"];
  heads.forEach((h) => {
    const el = document.createElement("div");
    el.className = "week-head";
    el.textContent = h;
    grid.appendChild(el);
  });

  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay());
  start.setHours(0, 0, 0, 0);

  const list = employerInterviews();
  const eventDates = new Set(list.map((iv) => new Date(iv.dateTime).toDateString()));

  for (let i = 0; i < 35; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const cell = document.createElement("div");
    cell.className = "week-day";
    if (d.getMonth() !== today.getMonth()) cell.classList.add("dim");
    if (d.toDateString() === today.toDateString()) cell.classList.add("today");
    if (eventDates.has(d.toDateString())) cell.classList.add("has-event");
    cell.textContent = String(d.getDate());
    grid.appendChild(cell);
  }
}

function renderActionRequired() {
  const wrap = $("interviewsActionList");
  if (!wrap) return;
  wrap.innerHTML = "";

  const items = [];
  const shortlistedNoInterview = applications.filter((a) => {
    const job = jobs.find((j) => j.id === a.jobId);
    return job && job.userId === currentUser.id && a.employerStatus === "shortlisted";
  });
  if (shortlistedNoInterview.length) {
    items.push({
      kind: "amber",
      title: "Schedule interview",
      meta: `${shortlistedNoInterview.length} shortlisted candidate(s) waiting`,
      action: () => navigateTo("employerApplicationsPage")
    });
  }

  const pendingApps = applications.filter((a) => {
    const job = jobs.find((j) => j.id === a.jobId);
    return job && job.userId === currentUser.id && (a.employerStatus || "applied") === "applied";
  });
  if (pendingApps.length) {
    items.push({
      kind: "blue",
      title: "Review new applications",
      meta: `${pendingApps.length} new applicant(s)`,
      action: () => { applicationsTab = "applied"; navigateTo("employerApplicationsPage"); renderApplicationsPage(); }
    });
  }

  if (!items.length) {
    wrap.innerHTML = '<p class="hint">All caught up. Nice work!</p>';
    return;
  }

  items.forEach((item) => {
    const el = document.createElement("div");
    el.className = `action-item ${item.kind}`;
    el.innerHTML = `<strong>${escapeHtml(item.title)}</strong><div class="action-meta">${escapeHtml(item.meta)}</div>`;
    el.style.cursor = "pointer";
    el.addEventListener("click", item.action);
    wrap.appendChild(el);
  });
}

function renderInterviewList() {
  const wrap = $("interviewsList");
  if (!wrap) return;
  wrap.innerHTML = "";

  const all = employerInterviews().slice().sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
  const now = new Date();
  const todayStr = now.toDateString();
  const weekEnd = new Date(now);
  weekEnd.setDate(now.getDate() + 7);

  let list = all;
  if (interviewRange === "today") list = all.filter((iv) => new Date(iv.dateTime).toDateString() === todayStr);
  else if (interviewRange === "week") list = all.filter((iv) => { const d = new Date(iv.dateTime); return d >= now && d <= weekEnd; });

  if (!list.length) {
    wrap.innerHTML = '<div class="empty">No interviews in this range yet. Click "Schedule New Interview" to add one.</div>';
    return;
  }

  const stripeColors = ["", "purple", "green"];
  list.forEach((iv, idx) => {
    const cand = candidates.find((c) => c.userId === iv.candidateUserId);
    const job = jobs.find((j) => j.id === iv.jobId);
    const stripe = stripeColors[idx % stripeColors.length];
    const dt = new Date(iv.dateTime);
    const dateLabel = dt.toDateString() === todayStr ? "TODAY"
      : dt.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase();
    const timeLabel = dt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

    const row = document.createElement("article");
    row.className = "interview-row";
    row.innerHTML = `
      <div class="interview-time">${escapeHtml(dateLabel)}<strong>${escapeHtml(timeLabel)}</strong></div>
      <div class="interview-stripe ${stripe}"></div>
      <div class="interview-body">
        <h4>${escapeHtml(cand ? cand.name : "Candidate")}</h4>
        <p class="interview-subject ${stripe}">${escapeHtml(iv.title)}</p>
        <div class="interview-meta">
          <span>⏱ ${iv.durationMinutes} mins</span>
          <span>${meetingLabel(iv)}</span>
          ${job ? `<span>${escapeHtml(job.title)}</span>` : ""}
        </div>
      </div>
      <div class="interview-actions">
        ${iv.meetingType === "google_meet" ? `<button type="button" class="primary-blue" data-action="join">Join Call</button>` : `<button type="button" class="secondary" data-action="copy">Copy Link</button>`}
        <button type="button" class="secondary" data-action="viewCandidate">View Profile</button>
        <button type="button" class="ghost" data-action="cancel">Cancel</button>
      </div>
    `;
    row.querySelectorAll("button[data-action]").forEach((btn) => btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      if (action === "join") window.open(iv.meetingLink, "_blank", "noopener");
      if (action === "copy") {
        navigator.clipboard?.writeText(iv.meetingLink || "");
        btn.textContent = "Copied!";
        setTimeout(() => { btn.textContent = "Copy Link"; }, 1500);
      }
      if (action === "viewCandidate") openCandidateDetail(iv.candidateUserId);
      if (action === "cancel") {
        if (!confirm("Cancel this interview?")) return;
        interviews = interviews.filter((x) => x.id !== iv.id);
        saveArray(STORAGE.interviews, interviews);
        renderInterviewsPage();
        renderApplicationsPage();
        renderSourcingMetrics();
      }
    }));
    wrap.appendChild(row);
  });
}

function meetingLabel(iv) {
  if (iv.meetingType === "google_meet") return "📹 Google Meet";
  if (iv.meetingType === "phone") return "📞 Phone Call";
  return "🏢 On-site";
}

/* ============================================================
   EMPLOYER: Smart Sourcing
   ============================================================ */
function renderSourcingPage() {
  refreshSourcingJobSelector();
  renderSourcingMetrics();
  renderSourcingList();
}

function refreshSourcingJobSelector() {
  const select = $("sourcingJobSelector");
  if (!select) return;
  const myJobs = ownedJobs();
  select.innerHTML = "";
  if (!myJobs.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "Post a job first to enable sourcing";
    select.appendChild(opt);
    activeSourcingJobId = null;
  } else {
    myJobs.forEach((job) => {
      const opt = document.createElement("option");
      opt.value = job.id;
      opt.textContent = `${job.title} - ${job.company}`;
      select.appendChild(opt);
    });
    if (!activeSourcingJobId || !myJobs.some((j) => j.id === activeSourcingJobId)) {
      activeSourcingJobId = myJobs[0].id;
    }
    select.value = activeSourcingJobId;
  }
  updateSourcingJobLabel();
}

function updateSourcingJobLabel() {
  const job = jobs.find((j) => j.id === activeSourcingJobId);
  $("sourcingJobLabel").textContent = job ? `Top matches for "${job.title}"` : "Select a job above to begin";
}

function renderSourcingMetrics() {
  if (!currentUser || currentUser.role !== "Employer") return;
  const employerMessages = sourcingHistory.filter((s) => s.employerUserId === currentUser.id);
  const sourcedCount = candidates.length;
  const messagedCount = employerMessages.length;
  const myInterviews = employerInterviews().length;
  const responseRate = messagedCount > 0
    ? Math.min(100, Math.round((myInterviews / messagedCount) * 100))
    : 0;

  $("metricCandidatesSourced").textContent = formatNumber(sourcedCount);
  $("metricResponseRate").textContent = `${responseRate}%`;
  $("metricInterviewsScheduled").textContent = formatNumber(myInterviews);

  $("metricCandidatesTrend").textContent = `${messagedCount} message(s) sent`;
  $("metricResponseTrend").textContent = messagedCount ? `${myInterviews}/${messagedCount} converted` : "No outreach yet";
  $("metricInterviewsTrend").textContent = myInterviews ? `Scheduled this period` : "Schedule your first interview";
}

function renderSourcingList() {
  const wrap = $("sourcingList");
  if (!wrap) return;
  wrap.innerHTML = "";

  if (!activeSourcingJobId) {
    wrap.innerHTML = '<div class="empty">Select a job posting above to see top recommendations.</div>';
    return;
  }
  const job = jobs.find((j) => j.id === activeSourcingJobId);
  if (!job) return;

  if (!candidates.length) {
    wrap.innerHTML = '<div class="empty">No candidate profiles in the system yet.</div>';
    return;
  }

  const ranked = candidates
    .map((cand) => ({ cand, score: scoreCandidateForJob(job, cand) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, recommendationLimit());

  ranked.forEach(({ cand, score }) => {
    const contacted = sourcingHistory.some((s) => s.candidateUserId === cand.userId && s.jobId === job.id);
    const row = document.createElement("article");
    row.className = "sourcing-row" + (contacted ? " contacted" : "");
    const initials = (cand.name || "C").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
    row.innerHTML = `
      <div class="cand-avatar">${escapeHtml(initials)}</div>
      <div class="sourcing-body">
        <h4>${escapeHtml(cand.name)}</h4>
        <p class="sourcing-sub">${escapeHtml(cand.major || "—")} · ${cand.experience || 0} years exp.</p>
        <div class="sourcing-match">
          <span class="sourcing-match-chip">${score}% Match</span>
          <span class="sourcing-target">for ${escapeHtml(job.title)}</span>
        </div>
      </div>
      <div class="sourcing-actions">
        <button type="button" class="secondary" data-action="view">View</button>
        <button type="button" class="secondary" data-action="skip">Skip</button>
        <button type="button" class="primary-blue" data-action="message">${contacted ? "✓ Messaged" : "✦ Auto-Message"}</button>
      </div>
    `;
    row.querySelector("[data-action=view]").addEventListener("click", () => openCandidateDetail(cand.userId));
    row.querySelector("[data-action=message]").addEventListener("click", () => autoMessageCandidate(cand, job));
    row.querySelector("[data-action=skip]").addEventListener("click", () => {
      row.style.opacity = "0.4";
      setTimeout(() => row.remove(), 250);
    });
    wrap.appendChild(row);
  });

  if (!currentUser.membership && candidates.length > FREE_RECOMMENDATION_LIMIT) {
    const upsell = document.createElement("div");
    upsell.className = "empty";
    upsell.style.cursor = "pointer";
    upsell.textContent = "Upgrade to Premium for unlimited sourcing recommendations →";
    upsell.addEventListener("click", toggleMembership);
    wrap.appendChild(upsell);
  }
}

function autoMessageCandidate(cand, job) {
  if (!integrations.gmail && !integrations.linkedin) {
    if (!confirm("Connect Gmail or LinkedIn from Tools & Integrations to send real messages. Continue with a simulated message?")) return;
  }
  sourcingHistory.push({
    id: createId("src"),
    employerUserId: currentUser.id,
    candidateUserId: cand.userId,
    jobId: job.id,
    createdAt: Date.now()
  });
  saveArray(STORAGE.sourcing, sourcingHistory);

  let app = applications.find((a) => a.candidateUserId === cand.userId && a.jobId === job.id);
  if (!app) {
    app = {
      id: createId("app"),
      candidateUserId: cand.userId,
      jobId: job.id,
      status: "applied",
      employerStatus: "shortlisted",
      createdAt: Date.now()
    };
    applications.push(app);
  } else if (app.employerStatus !== "interview_scheduled") {
    app.employerStatus = "shortlisted";
  }
  saveArray(STORAGE.applications, applications);

  /* Deliver the outreach message to the candidate's inbox */
  const employer = getEmployerInfo(currentUser.id);
  const introBody = `Hi ${cand.name.split(" ")[0]}, we think you'd be a great fit for "${job.title}" at ${job.company}. Would you be open to a quick chat?${employer ? "\n\n— " + employer.name + (employer.company ? ", " + employer.company : "") : ""}`;
  if (!messages.some((m) => m.threadId === threadKey(currentUser.id, cand.userId, job.id))) {
    sendMessage({ fromUserId: currentUser.id, toUserId: cand.userId, jobId: job.id, body: introBody });
  }

  renderSourcingList();
  renderSourcingMetrics();
  renderApplicationsPage();
}

/* ============================================================
   EMPLOYER: Integrations
   ============================================================ */
function renderIntegrations() {
  const wrap = $("integrationsList");
  if (!wrap) return;
  wrap.innerHTML = "";
  INTEGRATION_CATALOG.forEach((cfg) => {
    const connected = !!integrations[cfg.key];
    const row = document.createElement("article");
    row.className = "integration-row";
    row.innerHTML = `
      <div class="integration-icon" style="background:${cfg.bg}; color:${cfg.color};">${escapeHtml(cfg.letter)}</div>
      <div class="integration-body">
        <h4>${escapeHtml(cfg.name)}</h4>
        <p>${escapeHtml(cfg.desc)}</p>
      </div>
      <div class="integration-actions">
        ${connected ? '<span class="integration-status connected">Connected</span>' : ""}
        <button type="button" class="${connected ? "ghost" : "primary-blue"}" data-key="${cfg.key}">
          ${connected ? "Disconnect" : "Connect"}
        </button>
      </div>
    `;
    row.querySelector("button").addEventListener("click", () => {
      integrations[cfg.key] = !integrations[cfg.key];
      saveIntegrations();
      renderIntegrations();
    });
    wrap.appendChild(row);
  });
}

/* ---------- Entry point after login ---------- */
function enterApp() {
  refreshChrome();
  refreshMembershipUI();
  if (!currentUser) {
    navigateTo("landingPage");
    return;
  }
  if (currentUser.role === "Candidate") {
    if (!getCurrentCandidateProfile()) {
      loadCandidateForm();
      navigateTo("candidateProfilePage");
    } else {
      renderFindJobs();
      navigateTo("candidateFindJobsPage");
    }
  } else {
    $("employerWelcomeName").textContent = currentUser.company || currentUser.name || "recruiter";
    renderMyJobPostings();
    refreshRecommendationJobSelector();
    navigateTo("employerDashboardPage");
  }
}

/* ============================================================
   Bindings
   ============================================================ */
function bindEvents() {
  /* Landing role buttons */
  $("findJobsBtn").addEventListener("click", () => {
    if (currentUser && currentUser.role === "Candidate") {
      enterApp();
      return;
    }
    if (currentUser) { doLogout(); }
    showAuthCard("candidateSignupCard");
    navigateTo("candidateAuthPage");
  });
  $("findCandidatesBtn").addEventListener("click", () => {
    if (currentUser && currentUser.role === "Employer") {
      enterApp();
      return;
    }
    if (currentUser) { doLogout(); }
    showAuthCard("employerSignupCard");
    navigateTo("employerAuthPage");
  });

  /* Back buttons */
  document.querySelectorAll(".back-btn").forEach((btn) =>
    btn.addEventListener("click", () => navigateTo("landingPage"))
  );

  /* Auth card switching */
  document.querySelectorAll("[data-switch]").forEach((btn) => {
    btn.addEventListener("click", () => showAuthCard(btn.dataset.switch));
  });

  /* Signup / Login forms */
  $("candidateSignupForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const user = registerUser({
      name: $("candidateSignupName").value,
      email: $("candidateSignupEmail").value,
      password: $("candidateSignupPassword").value,
      role: "Candidate"
    }, $("candidateAuthStatus"));
    if (user) {
      $("candidateSignupForm").reset();
      showAuthCard("candidateLoginCard");
      $("candidateLoginEmail").value = user.email;
    }
  });
  $("candidateLoginForm").addEventListener("submit", (e) => {
    e.preventDefault();
    attemptLogin(
      $("candidateLoginEmail").value,
      $("candidateLoginPassword").value,
      "Candidate",
      $("candidateLoginStatus")
    );
  });
  $("employerSignupForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const user = registerUser({
      name: $("employerSignupCompany").value,
      company: $("employerSignupCompany").value,
      email: $("employerSignupEmail").value,
      password: $("employerSignupPassword").value,
      role: "Employer"
    }, $("employerAuthStatus"));
    if (user) {
      $("employerSignupForm").reset();
      showAuthCard("employerLoginCard");
      $("employerLoginEmail").value = user.email;
    }
  });
  $("employerLoginForm").addEventListener("submit", (e) => {
    e.preventDefault();
    attemptLogin(
      $("employerLoginEmail").value,
      $("employerLoginPassword").value,
      "Employer",
      $("employerLoginStatus")
    );
  });

  /* Nav links (candidate top nav + employer top nav + sidebar) */
  document.querySelectorAll(".nav-link[data-page], .sidebar-link").forEach((btn) => {
    btn.addEventListener("click", () => {
      const page = btn.dataset.page;
      runPageInit(page);
      navigateTo(page);
    });
  });

  /* Employer sidebar: create new */
  const sidebarCreate = $("sidebarCreateNew");
  if (sidebarCreate) sidebarCreate.addEventListener("click", () => {
    editingJobId = null;
    loadJobForm(null);
    runPageInit("employerPostJobPage");
    navigateTo("employerPostJobPage");
  });

  /* Employer sidebar: collapse toggle */
  const sidebarCollapse = $("sidebarCollapseBtn");
  if (sidebarCollapse) sidebarCollapse.addEventListener("click", () => {
    document.body.classList.toggle("sidebar-collapsed");
  });

  /* Logout */
  $("logoutBtn").addEventListener("click", doLogout);
  const employerLogout = $("employerLogoutBtn");
  if (employerLogout) employerLogout.addEventListener("click", doLogout);
  const profileLogout = $("profileLogoutBtn");
  if (profileLogout) profileLogout.addEventListener("click", doLogout);
  const employerCompanyLogout = $("employerCompanyLogoutBtn");
  if (employerCompanyLogout) employerCompanyLogout.addEventListener("click", doLogout);
  const employerCompanyForm = $("employerCompanyForm");
  if (employerCompanyForm) employerCompanyForm.addEventListener("submit", saveEmployerCompanyForm);

  /* Membership toggles */
  const employerMembershipBtn = $("employerMembershipBtn");
  if (employerMembershipBtn) employerMembershipBtn.addEventListener("click", () => {
    navigateTo("premiumPage");
    renderPremiumPage();
  });

  /* Candidate form */
  $("candidateForm").addEventListener("submit", saveCandidateProfile);
  attachChipInput($("candidateSkillsInput"), $("candidateSkillsChips"), "candidate");
  attachChipInput($("candidateLicensesInput"), $("candidateLicensesChips"), "licenses");
  attachChipInput($("candidateCertificationsInput"), $("candidateCertificationsChips"), "certifications");
  const extractBtn = $("extractResumeBtn");
  if (extractBtn) extractBtn.addEventListener("click", handleResumeExtraction);
  $("candidateResume").addEventListener("change", () => {
    const file = $("candidateResume").files[0];
    const previewEl = $("resumePreviewName");
    if (previewEl) previewEl.textContent = file ? file.name : "";
    if (extractBtn) {
      const isImage = file && file.type && file.type.startsWith("image/");
      extractBtn.classList.toggle("hidden", !isImage);
    }
  });
  const certInput = $("candidateCertificate");
  if (certInput) certInput.addEventListener("change", () => {
    const file = certInput.files[0];
    const previewEl = $("certificatePreviewName");
    if (previewEl) previewEl.textContent = file ? file.name : "";
  });
  $("addWorkExperienceBtn").addEventListener("click", openWorkExpModal);
  $("workExpForm").addEventListener("submit", handleWorkExpSubmit);
  $("workExpCancel").addEventListener("click", closeWorkExpModal);
  $("workExpModalClose").addEventListener("click", closeWorkExpModal);

  /* Job form */
  $("jobForm").addEventListener("submit", saveJob);
  attachChipInput($("jobSkillsInput"), $("jobSkillsChips"), "job");
  $("cancelJobEditBtn").addEventListener("click", () => {
    loadJobForm(null);
    navigateTo("employerDashboardPage");
  });
  $("dashboardPostJobBtn").addEventListener("click", () => {
    loadJobForm(null);
    navigateTo("employerPostJobPage");
  });

  /* Employer jobs page */
  const jobsPostBtn = $("jobsPostBtn");
  if (jobsPostBtn) jobsPostBtn.addEventListener("click", () => {
    loadJobForm(null);
    navigateTo("employerPostJobPage");
  });
  const jobDetailBack = $("jobDetailBackBtn");
  if (jobDetailBack) jobDetailBack.addEventListener("click", closeEmployerJobDetail);
  const jobsFilterTitleEl = $("jobsFilterTitle");
  if (jobsFilterTitleEl) jobsFilterTitleEl.addEventListener("input", debounce((e) => {
    jobsFilterTitle = e.target.value;
    renderEmployerJobsPage();
  }, 200));
  const jobsFilterLocationEl = $("jobsFilterLocation");
  if (jobsFilterLocationEl) jobsFilterLocationEl.addEventListener("input", debounce((e) => {
    jobsFilterLocation = e.target.value;
    renderEmployerJobsPage();
  }, 200));

  /* Find Jobs */
  $("jobSearchBtn").addEventListener("click", renderFindJobs);
  $("jobSearchKeyword").addEventListener("input", debounce(renderFindJobs, 200));
  $("jobSearchLocation").addEventListener("input", debounce(renderFindJobs, 200));
  ["jobFilterWorkMode", "jobFilterJobType", "jobFilterEducation", "jobFilterMaxExp", "jobFilterMinSalary"].forEach((id) => {
    $(id).addEventListener("change", renderFindJobs);
    $(id).addEventListener("input", debounce(renderFindJobs, 200));
  });
  $("jobFilterClear").addEventListener("click", () => {
    ["jobSearchKeyword", "jobSearchLocation", "jobFilterWorkMode", "jobFilterJobType",
     "jobFilterEducation", "jobFilterMaxExp", "jobFilterMinSalary"].forEach((id) => { $(id).value = ""; });
    renderFindJobs();
  });

  /* Job detail */
  $("jobDetailClose").addEventListener("click", closeJobDetail);

  /* Candidate detail */
  const candidateDetailCloseBtn = $("candidateDetailClose");
  if (candidateDetailCloseBtn) candidateDetailCloseBtn.addEventListener("click", closeCandidateDetail);

  /* My Jobs tabs */
  $("myJobsTabs").addEventListener("click", (e) => {
    const btn = e.target.closest(".tab-pill");
    if (!btn) return;
    myJobsTab = btn.dataset.tab;
    $("myJobsTabs").querySelectorAll(".tab-pill").forEach((b) => b.classList.toggle("active", b === btn));
    renderMyJobs();
  });

  /* Apply confirmation page */
  const applyFindMore = $("applyConfirmFindMore");
  if (applyFindMore) applyFindMore.addEventListener("click", () => {
    navigateTo("candidateFindJobsPage");
    renderFindJobs();
  });
  const applyViewApps = $("applyConfirmViewApps");
  if (applyViewApps) applyViewApps.addEventListener("click", () => {
    myJobsTab = "applied";
    $("myJobsTabs").querySelectorAll(".tab-pill").forEach((b) => b.classList.toggle("active", b.dataset.tab === "applied"));
    renderMyJobs();
    navigateTo("candidateMyJobsPage");
  });

  /* Application detail back nav */
  const appDetailBack = $("appDetailBack");
  if (appDetailBack) appDetailBack.addEventListener("click", () => {
    myJobsTab = "applied";
    $("myJobsTabs").querySelectorAll(".tab-pill").forEach((b) => b.classList.toggle("active", b.dataset.tab === "applied"));
    renderMyJobs();
    navigateTo("candidateMyJobsPage");
  });

  /* Analytics page */
  const analyticsRangeSelect = $("analyticsRangeSelect");
  if (analyticsRangeSelect) analyticsRangeSelect.addEventListener("change", (e) => {
    analyticsRangeDays = Number(e.target.value) || 30;
    renderEmployerAnalytics();
  });
  const analyticsExportBtn = $("analyticsExportBtn");
  if (analyticsExportBtn) analyticsExportBtn.addEventListener("click", exportAnalyticsReport);

  /* Premium / Membership page */
  const billingToggle = $("billingToggle");
  if (billingToggle) billingToggle.addEventListener("click", (e) => {
    const btn = e.target.closest(".billing-opt");
    if (!btn) return;
    billingCycle = btn.dataset.billing;
    renderPremiumPage();
  });
  const planPremCta = $("planPremiumCta");
  if (planPremCta) planPremCta.addEventListener("click", () => {
    if (currentUser && currentUser.membership) return;
    openPaymentModal();
  });
  const planBasicCta = $("planBasicCta");
  if (planBasicCta) planBasicCta.addEventListener("click", () => {
    if (!currentUser || !currentUser.membership) return;
    if (confirm("Are you sure you want to downgrade to the Basic plan? You'll lose Premium benefits immediately.")) {
      setMembership(false);
      renderPremiumPage();
    }
  });
  const payCancel = $("paymentCancel");
  if (payCancel) payCancel.addEventListener("click", closePaymentModal);
  const payForm = $("paymentForm");
  if (payForm) payForm.addEventListener("submit", handlePaymentSubmit);
  const payModal = $("paymentModal");
  if (payModal) payModal.addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closePaymentModal();
  });

  /* Companies search */
  const compInput = $("companiesSearchInput");
  if (compInput) {
    compInput.addEventListener("input", debounce((e) => {
      companiesSearchText = e.target.value;
      renderCompaniesPage();
    }, 180));
  }
  const compBtn = $("companiesSearchBtn");
  if (compBtn) compBtn.addEventListener("click", () => {
    companiesSearchText = $("companiesSearchInput").value;
    renderCompaniesPage();
  });

  /* Company detail */
  const coBack = $("companyDetailBack");
  if (coBack) coBack.addEventListener("click", () => {
    navigateTo("companiesPage");
    renderCompaniesPage();
  });
  const coTabs = $("companyTabs");
  if (coTabs) coTabs.addEventListener("click", (e) => {
    const btn = e.target.closest(".company-tab");
    if (!btn) return;
    activeCompanyTab = btn.dataset.companyTab;
    setCompanyTabActive();
    renderCompanyTabContent(false);
  });

  /* Messages: search threads + filter tabs + start new conversation */
  const threadSearch = $("threadSearchInput");
  if (threadSearch) threadSearch.addEventListener("input", debounce(() => renderMessagesPage(), 150));
  const threadTabs = document.querySelectorAll(".thread-filter-tab");
  threadTabs.forEach((tab) => tab.addEventListener("click", () => {
    threadTabs.forEach((t) => t.classList.toggle("active", t === tab));
    threadFilter = tab.dataset.threadFilter;
    renderMessagesPage();
  }));
  const onlineToggle = $("messagesOnlineToggle");
  if (onlineToggle) onlineToggle.addEventListener("change", () => {
    messagesOnlineStatus = onlineToggle.checked;
    renderMessagesPage();
  });
  const chatForm = $("chatForm");
  if (chatForm) chatForm.addEventListener("submit", handleSendMessage);
  const chatInput = $("chatInput");
  if (chatInput) {
    chatInput.addEventListener("keydown", handleChatInputKeydown);
    chatInput.addEventListener("input", () => autoResizeChatInput(chatInput));
  }
  const chatEmojiBtn = $("chatEmojiBtn");
  if (chatEmojiBtn) chatEmojiBtn.addEventListener("click", () => {
    const input = $("chatInput");
    if (!input) return;
    input.value += " 🙂";
    input.focus();
    autoResizeChatInput(input);
  });
  const startNewBtn = $("messagesStartNew");
  if (startNewBtn) startNewBtn.addEventListener("click", () => {
    if (currentUser && currentUser.role === "Candidate") {
      navigateTo("candidateFindJobsPage");
      renderFindJobs();
    } else if (currentUser && currentUser.role === "Employer") {
      navigateTo("employerCandidatesPage");
      renderCandidatesGrid();
    }
  });

  /* Candidates page */
  $("candidateSearchInput").addEventListener("input", debounce(renderCandidatesGrid, 200));
  ["candidateFilterEducation", "candidateFilterMinExp", "candidateFilterSkill",
   "candidateFilterLocation", "candidateFilterWorkMode"].forEach((id) => {
    $(id).addEventListener("change", renderCandidatesGrid);
    $(id).addEventListener("input", debounce(renderCandidatesGrid, 200));
  });
  $("candidateFilterClear").addEventListener("click", () => {
    ["candidateSearchInput", "candidateFilterEducation", "candidateFilterMinExp",
     "candidateFilterSkill", "candidateFilterLocation", "candidateFilterWorkMode"].forEach((id) => { $(id).value = ""; });
    renderCandidatesGrid();
  });
  $("recommendationJobSelector").addEventListener("change", (e) => {
    activeRecommendationJobId = e.target.value || null;
    renderRecommendedCandidates();
  });
  document.querySelectorAll("#candidateRecTierTabs .rec-tier-tab").forEach((tab) => {
    tab.addEventListener("click", () => setCandidateRecTier(tab.dataset.recTier));
  });

  /* Applications page */
  $("applicationsTabs").addEventListener("click", (e) => {
    const btn = e.target.closest(".tab-pill");
    if (!btn) return;
    applicationsTab = btn.dataset.appTab;
    $("applicationsTabs").querySelectorAll(".tab-pill").forEach((b) => b.classList.toggle("active", b === btn));
    renderApplicationsPage();
  });
  $("applicationsJobFilter").addEventListener("change", (e) => {
    applicationsJobFilterId = e.target.value;
    renderApplicationsPage();
  });
  $("applicationsSearch").addEventListener("input", debounce((e) => {
    applicationsSearchText = e.target.value.trim();
    renderApplicationsPage();
  }, 200));

  /* Interviews page */
  $("scheduleInterviewBtn").addEventListener("click", () => openInterviewModal());
  $("interviewsRangeTabs").addEventListener("click", (e) => {
    const btn = e.target.closest(".tab-pill");
    if (!btn) return;
    interviewRange = btn.dataset.intRange;
    $("interviewsRangeTabs").querySelectorAll(".tab-pill").forEach((b) => b.classList.toggle("active", b === btn));
    renderInterviewList();
  });
  $("interviewForm").addEventListener("submit", handleInterviewSubmit);
  $("interviewCancel").addEventListener("click", closeInterviewModal);
  $("interviewModalClose").addEventListener("click", closeInterviewModal);
  $("interviewModal").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeInterviewModal();
  });

  /* Smart Sourcing page */
  $("sourcingJobSelector").addEventListener("change", (e) => {
    activeSourcingJobId = e.target.value || null;
    updateSourcingJobLabel();
    renderSourcingList();
  });
  $("sourcingRunBtn").addEventListener("click", () => {
    renderSourcingList();
    renderSourcingMetrics();
  });

  /* Modal backdrop dismiss */
  $("workExpModal").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeWorkExpModal();
  });

  /* Escape closes detail / modal */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeJobDetail();
      closeCandidateDetail();
      closeWorkExpModal();
      closeInterviewModal();
      closePaymentModal();
    }
  });
}

function showAuthCard(id) {
  ["candidateSignupCard", "candidateLoginCard", "employerSignupCard", "employerLoginCard"]
    .forEach((card) => show($(card), card === id));
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

/* ---------- Bootstrap ---------- */
async function bootstrap() {
  const loadingEl = $("appLoading");
  if (loadingEl) loadingEl.classList.remove("hidden");

  try {
    const data = await MatchifyData.init(DEFAULT_INTEGRATIONS);
    users = data.users;
    candidates = data.candidates;
    jobs = data.jobs;
    applications = data.applications;
    interviews = data.interviews;
    sourcingHistory = data.sourcingHistory;
    messages = data.messages;
    companies = data.companies;
    reviews = data.reviews;
    integrations = data.integrations;

    migrateApplicationsInMemory();
    saveArray(STORAGE.applications, applications);
    await seedCompaniesIfEmpty();

    currentUser = loadSessionUser();
    if (currentUser) {
      MatchifyData.setIntegrationsUserId(currentUser.id);
      const fresh = users.find((u) => u.id === currentUser.id);
      if (fresh) {
        currentUser = {
          id: fresh.id,
          name: fresh.name,
          email: fresh.email,
          role: fresh.role,
          company: fresh.company || "",
          membership: !!fresh.membership
        };
        saveSessionUser(currentUser);
      }
    }

    bindEvents();
    refreshChrome();
    refreshMembershipUI();

    const backendBadge = $("backendStatus");
    if (backendBadge) {
      backendBadge.textContent = MatchifyData.usingSupabase() ? "Supabase" : "Local";
      backendBadge.classList.toggle("supabase", MatchifyData.usingSupabase());
      backendBadge.classList.remove("hidden");
    }

    if (currentUser) {
      enterApp();
    } else {
      navigateTo("landingPage");
    }
  } catch (err) {
    console.error("Matchify bootstrap failed:", err);
    const errEl = $("appLoadError");
    if (errEl) {
      const detail = err && err.message ? err.message : String(err);
      let hint = "Check supabase-config.js (base URL without /rest/v1/) and that schema.sql was run.";
      if (/invalid api key/i.test(detail)) {
        hint = "Your API key was rejected. In Supabase go to Settings → API Keys, copy the Publishable key (or legacy anon key), and paste it as anonKey in supabase-config.js.";
      } else if (/relation.*does not exist/i.test(detail) || /PGRST205/i.test(detail)) {
        hint = "Database tables are missing. Run the full supabase/schema.sql file in Supabase SQL Editor.";
      }
      errEl.textContent = `Could not load data: ${detail}. ${hint}`;
      errEl.classList.remove("hidden");
    }
    bindEvents();
    navigateTo("landingPage");
  } finally {
    if (loadingEl) loadingEl.classList.add("hidden");
  }
}

bootstrap();
