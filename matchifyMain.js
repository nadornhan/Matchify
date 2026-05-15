/* ==========================================================================
   Matchify - Intelligent Talent Matching Platform
   ========================================================================== */

/* ---------- Constants ---------- */
const FREE_RECOMMENDATION_LIMIT = 10;
const STORAGE = {
  users: "matchifyUsers",
  session: "matchifyCurrentUser",
  candidates: "matchifyCandidates",
  jobs: "matchifyJobs",
  applications: "matchifyApplications",
  interviews: "matchifyInterviews",
  integrations: "matchifyIntegrations",
  sourcing: "matchifySourcing",
  messages: "matchifyMessages"
};

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
  Master: 4,
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

/* ---------- Storage helpers ---------- */
function loadArray(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveArray(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function loadSessionUser() {
  try {
    const raw = localStorage.getItem(STORAGE.session);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && parsed.email && parsed.role ? parsed : null;
  } catch {
    return null;
  }
}

function saveSessionUser(user) {
  if (!user) localStorage.removeItem(STORAGE.session);
  else localStorage.setItem(STORAGE.session, JSON.stringify(user));
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

/* ---------- Application state ---------- */
let users = loadArray(STORAGE.users);
let candidates = loadArray(STORAGE.candidates);
let jobs = loadArray(STORAGE.jobs);
let applications = loadArray(STORAGE.applications);
let interviews = loadArray(STORAGE.interviews);
let sourcingHistory = loadArray(STORAGE.sourcing);
let messages = loadArray(STORAGE.messages);
let integrations = loadIntegrations();
let currentUser = loadSessionUser();

function loadIntegrations() {
  try {
    const raw = localStorage.getItem(STORAGE.integrations);
    const parsed = raw ? JSON.parse(raw) : {};
    return { ...DEFAULT_INTEGRATIONS, ...(parsed && typeof parsed === "object" ? parsed : {}) };
  } catch {
    return { ...DEFAULT_INTEGRATIONS };
  }
}

function saveIntegrations() {
  localStorage.setItem(STORAGE.integrations, JSON.stringify(integrations));
}

/* Migrate existing applications: ensure each "applied" record has employerStatus */
applications.forEach((app) => {
  if (app.status === "applied" && !app.employerStatus) app.employerStatus = "applied";
});
saveArray(STORAGE.applications, applications);

let candidateSkillsDraft = [];
let jobSkillsDraft = [];
let workExperienceDraft = [];
let editingJobId = null;
let activeJobDetailId = null;
let activeRecommendationJobId = null;
let myJobsTab = "saved";
let activeThreadKey = null;
let applicationsTab = "all";
let applicationsJobFilterId = "";
let applicationsSearchText = "";
let interviewRange = "week";
let activeSourcingJobId = null;
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
  "messagesPage"
];

function navigateTo(pageId) {
  PAGE_IDS.forEach((id) => show($(id), id === pageId));
  document.querySelectorAll(".nav-link").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.page === pageId);
  });
  closeJobDetail();
  closeCandidateDetail();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ---------- Header / nav visibility ---------- */
function refreshChrome() {
  const isCandidate = currentUser && currentUser.role === "Candidate";
  const isEmployer = currentUser && currentUser.role === "Employer";
  show($("candidateNav"), isCandidate);
  show($("employerNav"), isEmployer);
  show($("logoutBtn"), !!currentUser);
  refreshMessageBadges();
}

function refreshMembershipUI() {
  const candidateBtn = $("candidateMembershipBtn");
  const employerBtn = $("employerMembershipBtn");
  const isPremium = !!(currentUser && currentUser.membership);
  if (candidateBtn) {
    candidateBtn.classList.toggle("is-premium", isPremium);
    candidateBtn.textContent = isPremium ? "★ Premium Member" : "Upgrade to Premium";
  }
  if (employerBtn) {
    employerBtn.classList.toggle("is-premium", isPremium);
    employerBtn.textContent = isPremium ? "★ Premium Member" : "Upgrade to Premium";
  }
}

function toggleMembership() {
  if (!currentUser) return;
  const user = users.find((u) => u.id === currentUser.id);
  if (!user) return;
  user.membership = !user.membership;
  saveArray(STORAGE.users, users);
  currentUser.membership = user.membership;
  saveSessionUser(currentUser);
  refreshMembershipUI();
  if (currentUser.role === "Candidate") {
    renderFindJobs();
  } else {
    renderRecommendedCandidates();
  }
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
  jobSkillsDraft = [];
  workExperienceDraft = [];
  editingJobId = null;
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

function loadCandidateForm() {
  const profile = getCurrentCandidateProfile();
  candidateSkillsDraft = profile ? [...profile.skills] : [];
  workExperienceDraft = profile ? profile.workExperience.map((w) => ({ ...w })) : [];

  $("candidateName").value = profile ? profile.name : (currentUser ? currentUser.name : "");
  $("candidateEmail").value = profile ? profile.email : (currentUser ? currentUser.email : "");
  $("candidateContact").value = profile ? profile.contact || "" : "";
  $("candidateLocation").value = profile ? profile.preferredLocation || "" : "";
  $("candidateEducation").value = profile ? profile.education || "" : "";
  $("candidateMajor").value = profile ? profile.major || "" : "";
  $("candidateExperience").value = profile ? String(profile.experience || 0) : "";
  $("candidateWorkMode").value = profile ? profile.preferredWorkMode || "Any" : "Any";

  renderSkillChips($("candidateSkillsChips"), candidateSkillsDraft, "candidate");
  renderWorkExperience();
}

function renderSkillChips(container, list, scope) {
  container.innerHTML = "";
  list.forEach((skill) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.innerHTML = `${escapeHtml(skill)} <button type="button" aria-label="Remove ${escapeHtml(skill)}">&times;</button>`;
    chip.querySelector("button").addEventListener("click", () => {
      if (scope === "candidate") {
        candidateSkillsDraft = candidateSkillsDraft.filter((s) => s !== skill);
        renderSkillChips(container, candidateSkillsDraft, scope);
      } else {
        jobSkillsDraft = jobSkillsDraft.filter((s) => s !== skill);
        renderSkillChips(container, jobSkillsDraft, scope);
      }
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
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      const value = input.value.replace(/,$/, "").trim();
      if (!value) return;
      const list = scope === "candidate" ? candidateSkillsDraft : jobSkillsDraft;
      if (!skillListIncludes(list, value)) {
        list.push(value);
        renderSkillChips(container, list, scope);
      }
      input.value = "";
    } else if (event.key === "Backspace" && !input.value) {
      const list = scope === "candidate" ? candidateSkillsDraft : jobSkillsDraft;
      list.pop();
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
    empty.textContent = "No work experience added yet. Add entries to improve match quality.";
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
  const profile = {
    id: getCurrentCandidateProfile()?.id || createId("candidate"),
    userId: currentUser.id,
    name: $("candidateName").value.trim(),
    email: $("candidateEmail").value.trim().toLowerCase(),
    contact: $("candidateContact").value.trim(),
    education: $("candidateEducation").value,
    major: $("candidateMajor").value.trim(),
    experience: Number($("candidateExperience").value) || 0,
    skills: [...candidateSkillsDraft],
    preferredWorkMode: $("candidateWorkMode").value,
    preferredLocation: $("candidateLocation").value.trim(),
    workExperience: workExperienceDraft.map((w) => ({ ...w }))
  };

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
    const parsedExp = extractValue(cleaned, ["experience", "years of experience"]);
    const parsedSkills = extractValue(cleaned, ["skills", "technical skills"]);
    const parsedContact = extractValue(cleaned, ["contact", "email", "phone"]);

    if (parsedName) $("candidateName").value = parsedName;
    if (parsedContact) $("candidateContact").value = parsedContact;
    if (parsedEducation && educationRank[parsedEducation]) $("candidateEducation").value = parsedEducation;
    if (parsedMajor) $("candidateMajor").value = parsedMajor;
    if (parsedExp) {
      const numeric = Number(parsedExp.replace(/[^\d.]/g, ""));
      if (!Number.isNaN(numeric)) $("candidateExperience").value = String(numeric);
    }
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
  if (!jobId) {
    editingJobId = null;
    $("jobFormTitle").textContent = "Create Job Posting";
    $("jobCompany").value = (currentUser && currentUser.company) || "";
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
  editingJobId = null;
  jobSkillsDraft = [];
  setStatus($("jobStatus"), "Job posted successfully.", "ok");
  loadJobForm(null);
  renderMyJobPostings();
  refreshRecommendationJobSelector();
  navigateTo("employerDashboardPage");
}

function deleteJob(jobId) {
  if (!confirm("Delete this job posting?")) return;
  jobs = jobs.filter((j) => j.id !== jobId);
  saveArray(STORAGE.jobs, jobs);
  applications = applications.filter((a) => a.jobId !== jobId);
  saveArray(STORAGE.applications, applications);
  renderMyJobPostings();
  refreshRecommendationJobSelector();
}

function renderMyJobPostings() {
  const wrap = $("myJobPostingsList");
  const myJobs = ownedJobs();
  wrap.innerHTML = "";
  if (!myJobs.length) {
    wrap.innerHTML = '<div class="empty">No jobs posted yet. Click "Create Your First Job Post" to begin.</div>';
    return;
  }
  myJobs.forEach((job) => {
    wrap.appendChild(buildJobCard(job, { showManage: true }));
  });
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
  if (existing) {
    applications = applications.filter((a) => a.id !== existing.id);
  } else {
    applications.push({
      id: createId("app"),
      candidateUserId: currentUser.id,
      jobId,
      status,
      employerStatus: status === "applied" ? "applied" : null,
      createdAt: Date.now()
    });
  }
  saveArray(STORAGE.applications, applications);
  if (activeJobDetailId === jobId) openJobDetail(jobId);
  renderMyJobs();
}

/* ---------- My Jobs ---------- */
function renderMyJobs() {
  if (!currentUser) return;
  const myApps = applications.filter((a) => a.candidateUserId === currentUser.id);
  const myInterviews = interviews.filter((iv) => iv.candidateUserId === currentUser.id);
  const savedCount = myApps.filter((a) => a.status === "saved").length;
  const appliedCount = myApps.filter((a) => a.status === "applied").length;
  $("savedCount").textContent = String(savedCount);
  $("appliedCount").textContent = String(appliedCount);
  const interviewsCountEl = $("interviewsCount");
  if (interviewsCountEl) interviewsCountEl.textContent = String(myInterviews.length);

  const wrap = $("myJobsList");
  wrap.innerHTML = "";

  if (myJobsTab === "interviews") {
    renderCandidateInterviews(wrap, myInterviews);
    return;
  }

  const filtered = myApps.filter((a) => a.status === myJobsTab);
  if (!filtered.length) {
    wrap.innerHTML = `<div class="empty">No ${myJobsTab} jobs yet. Browse the Find Jobs page.</div>`;
    return;
  }
  filtered
    .sort((a, b) => b.createdAt - a.createdAt)
    .forEach((app) => {
      const job = jobs.find((j) => j.id === app.jobId);
      if (!job) return;
      const status = app.employerStatus || (app.status === "applied" ? "applied" : null);
      const employer = getEmployerInfo(job.userId);
      const ivForApp = interviews.find((iv) => iv.candidateUserId === currentUser.id && iv.jobId === app.jobId);

      const card = document.createElement("article");
      card.className = "application-card";
      card.innerHTML = `
        <div class="app-icon">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"></rect><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </div>
        <div class="app-body">
          <h4>${escapeHtml(job.title)}</h4>
          <div class="app-meta">
            <span>${escapeHtml(job.company)}</span>
            <span>${escapeHtml(job.location)}</span>
            <span>${escapeHtml(job.workMode)}</span>
            <span>${app.status === "applied" ? "Applied" : "Saved"} ${formatDate(app.createdAt)}</span>
          </div>
          ${ivForApp ? `<p class="my-jobs-interview-note">📅 Interview ${formatDateTime(new Date(ivForApp.dateTime).getTime())} · <a href="${escapeHtml(ivForApp.meetingLink || "")}" target="_blank" rel="noopener">${escapeHtml(ivForApp.meetingType === "google_meet" ? "Join Google Meet" : ivForApp.meetingLink || "View")}</a></p>` : ""}
          <div class="app-row-actions">
            <button type="button" class="secondary small" data-view="${job.id}">View Details</button>
            ${employer ? '<button type="button" class="secondary small" data-message="' + employer.userId + '">✉ Message Employer</button>' : ""}
            <button type="button" class="ghost small" data-remove="${app.id}">Remove</button>
          </div>
        </div>
        ${status && app.status === "applied" ? `<span class="app-status ${status}">${escapeHtml(APP_STATUS_LABELS[status] || status)}</span>` : ""}
      `;
      card.querySelector("[data-view]").addEventListener("click", () => {
        navigateTo("candidateFindJobsPage");
        openJobDetail(job.id);
      });
      const msgBtn = card.querySelector("[data-message]");
      if (msgBtn) msgBtn.addEventListener("click", () => openMessageThreadWith(msgBtn.dataset.message, job.id));
      card.querySelector("[data-remove]").addEventListener("click", () => {
        applications = applications.filter((a) => a.id !== app.id);
        saveArray(STORAGE.applications, applications);
        renderMyJobs();
      });
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

function renderRecommendedCandidates() {
  const wrap = $("recommendedCandidatesList");
  if (!wrap) return;
  wrap.innerHTML = "";
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
  const scored = candidates
    .map((cand) => ({ cand, score: scoreCandidateForJob(job, cand) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, recommendationLimit());

  scored.forEach(({ cand, score }) => {
    const card = document.createElement("div");
    card.className = "rec-card";
    const initials = (cand.name || "C").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
    const topSkills = (cand.skills || []).slice(0, 3)
      .map((s) => `<span class="chip">${escapeHtml(s)}</span>`)
      .join("");
    card.innerHTML = `
      <h5>${escapeHtml(initials)} &middot; ${escapeHtml(cand.name)}</h5>
      <p class="rec-company">${escapeHtml(cand.major || "")} &middot; ${cand.experience || 0}y exp</p>
      <div class="chip-row">${topSkills}</div>
      <div class="rec-foot">
        <span>${escapeHtml(cand.preferredLocation || "Any")}</span>
        <span class="rec-match">Match: ${score}</span>
      </div>
    `;
    card.title = "Click to view full profile";
    card.addEventListener("click", () => openCandidateDetail(cand.userId));
    wrap.appendChild(card);
  });

  if (!currentUser.membership && candidates.length > FREE_RECOMMENDATION_LIMIT) {
    const upsell = document.createElement("div");
    upsell.className = "empty";
    upsell.style.cursor = "pointer";
    upsell.textContent = "Upgrade to Premium for unlimited candidate recommendations →";
    upsell.addEventListener("click", toggleMembership);
    wrap.appendChild(upsell);
  }
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

function renderMessagesPage() {
  if (!currentUser) return;
  const threads = getThreadsForUser(currentUser.id);

  const wrap = $("messageThreadList");
  wrap.innerHTML = "";

  if (!threads.length) {
    wrap.innerHTML = '<div class="empty">No conversations yet. Reach out from a job listing or application to start one.</div>';
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
    const subjectLine = job ? `${job.title}` : "General";

    const el = document.createElement("button");
    el.type = "button";
    el.className = "thread-item" + (t.key === activeThreadKey ? " active" : "");
    el.innerHTML = `
      <div class="thread-avatar">${escapeHtml(initials)}</div>
      <div class="thread-body">
        <div class="thread-row">
          <strong>${escapeHtml(info.name)}</strong>
          <span class="thread-time">${formatRelativeTime(t.lastMsg.createdAt)}</span>
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

  $("chatHeader").innerHTML = `
    <div class="thread-avatar large">${escapeHtml(initials)}</div>
    <div class="chat-header-body">
      <h3>${escapeHtml(info.name)}</h3>
      <p>${escapeHtml(info.subtitle || "")}${job ? ` · ${escapeHtml(job.title)} @ ${escapeHtml(job.company)}` : ""}</p>
    </div>
    <div class="chat-header-actions">
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
    const bubble = document.createElement("div");
    bubble.className = `chat-msg${own ? " own" : ""}${m.system ? " system" : ""}`;
    bubble.innerHTML = `
      ${m.system ? '<span class="msg-system-label">System</span>' : ""}
      <p class="msg-body">${escapeHtml(m.body).replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')}</p>
      <span class="msg-time">${formatDateTime(m.createdAt)}</span>
    `;
    body.appendChild(bubble);
  });
  body.scrollTop = body.scrollHeight;
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
  const text = input.value;
  if (!text.trim()) return;
  const decoded = decodeThreadKey(activeThreadKey);
  const toUserId = decoded.userIdA === currentUser.id ? decoded.userIdB : decoded.userIdA;
  sendMessage({ fromUserId: currentUser.id, toUserId, jobId: decoded.jobId, body: text });
  input.value = "";
  renderMessagesPage();
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
  app.employerStatus = newStatus;
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
    applicationToUpdate.employerStatus = "interview_scheduled";
  } else {
    applications.push({
      id: createId("app"),
      candidateUserId,
      jobId,
      status: "applied",
      employerStatus: "interview_scheduled",
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

  /* Nav links */
  document.querySelectorAll(".nav-link").forEach((btn) => {
    btn.addEventListener("click", () => {
      const page = btn.dataset.page;
      if (page === "candidateProfilePage") loadCandidateForm();
      if (page === "candidateMyJobsPage") renderMyJobs();
      if (page === "candidateFindJobsPage") renderFindJobs();
      if (page === "employerDashboardPage") renderMyJobPostings();
      if (page === "employerPostJobPage" && !editingJobId) loadJobForm(null);
      if (page === "employerCandidatesPage") {
        renderCandidatesGrid();
        refreshRecommendationJobSelector();
      }
      if (page === "employerApplicationsPage") renderApplicationsPage();
      if (page === "employerInterviewsPage") renderInterviewsPage();
      if (page === "employerSourcingPage") renderSourcingPage();
      if (page === "employerToolsPage") renderIntegrations();
      if (page === "messagesPage") renderMessagesPage();
      navigateTo(page);
    });
  });

  /* Logout */
  $("logoutBtn").addEventListener("click", doLogout);

  /* Membership toggles */
  $("candidateMembershipBtn").addEventListener("click", toggleMembership);
  $("employerMembershipBtn").addEventListener("click", toggleMembership);

  /* Candidate form */
  $("candidateForm").addEventListener("submit", saveCandidateProfile);
  attachChipInput($("candidateSkillsInput"), $("candidateSkillsChips"), "candidate");
  $("extractResumeBtn").addEventListener("click", handleResumeExtraction);
  $("candidateResume").addEventListener("change", () => {
    const file = $("candidateResume").files[0];
    const previewEl = $("resumePreviewName");
    if (previewEl) previewEl.textContent = file ? `Selected: ${file.name}` : "";
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

  /* Messages page */
  $("chatForm").addEventListener("submit", handleSendMessage);
  $("chatInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
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
function init() {
  bindEvents();
  refreshChrome();
  refreshMembershipUI();
  if (currentUser) {
    enterApp();
  } else {
    navigateTo("landingPage");
  }
}

init();
