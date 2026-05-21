/**
 * Matchify data layer — Supabase persistence with localStorage fallback.
 */
(function () {
  const STORAGE = {
    users: "matchifyUsers",
    session: "matchifyCurrentUser",
    candidates: "matchifyCandidates",
    jobs: "matchifyJobs",
    applications: "matchifyApplications",
    interviews: "matchifyInterviews",
    integrations: "matchifyIntegrations",
    sourcing: "matchifySourcing",
    messages: "matchifyMessages",
    companies: "matchifyCompanies",
    reviews: "matchifyReviews"
  };

  const TABLE_BY_KEY = {
    [STORAGE.users]: "users",
    [STORAGE.candidates]: "candidates",
    [STORAGE.jobs]: "jobs",
    [STORAGE.applications]: "applications",
    [STORAGE.interviews]: "interviews",
    [STORAGE.messages]: "messages",
    [STORAGE.companies]: "companies",
    [STORAGE.reviews]: "reviews",
    [STORAGE.sourcing]: "sourcing"
  };

  let client = null;
  let useSupabase = false;
  let integrationsUserId = "__default__";

  function isConfigured() {
    const cfg = window.MATCHIFY_SUPABASE || {};
    return Boolean(
      cfg.url &&
      cfg.anonKey &&
      cfg.url !== "YOUR_SUPABASE_URL" &&
      cfg.anonKey !== "YOUR_SUPABASE_ANON_KEY"
    );
  }

  function toUser(row) {
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      password: row.password,
      role: row.role,
      company: row.company || "",
      membership: !!row.membership,
      contactEmail: row.contact_email || "",
      companyWebsite: row.company_website || "",
      companyIndustry: row.company_industry || "",
      companySize: row.company_size || "",
      companyLocation: row.company_location || "",
      companyDescription: row.company_description || "",
      createdAt: row.created_at
    };
  }

  function fromUser(u) {
    return {
      id: u.id,
      name: u.name || "",
      email: u.email,
      password: u.password,
      role: u.role,
      company: u.company || "",
      membership: !!u.membership,
      contact_email: u.contactEmail || null,
      company_website: u.companyWebsite || null,
      company_industry: u.companyIndustry || null,
      company_size: u.companySize || null,
      company_location: u.companyLocation || null,
      company_description: u.companyDescription || null,
      created_at: u.createdAt || Date.now()
    };
  }

  function toCandidate(row) {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      email: row.email,
      contact: row.contact,
      education: row.education,
      major: row.major,
      university: row.university,
      experience: Number(row.experience) || 0,
      skills: row.skills || [],
      licenses: row.licenses || [],
      certifications: row.certifications || [],
      preferredWorkMode: row.preferred_work_mode,
      preferredLocation: row.preferred_location,
      workExperience: row.work_experience || [],
      certificateFileName: row.certificate_file_name || "",
      resumeFileName: row.resume_file_name || ""
    };
  }

  function fromCandidate(c) {
    return {
      id: c.id,
      user_id: c.userId,
      name: c.name || "",
      email: c.email || "",
      contact: c.contact || "",
      education: c.education || "",
      major: c.major || "",
      university: c.university || "",
      experience: c.experience || 0,
      skills: c.skills || [],
      licenses: c.licenses || [],
      certifications: c.certifications || [],
      preferred_work_mode: c.preferredWorkMode || "",
      preferred_location: c.preferredLocation || "",
      work_experience: c.workExperience || [],
      certificate_file_name: c.certificateFileName || "",
      resume_file_name: c.resumeFileName || ""
    };
  }

  function toJob(row) {
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      company: row.company,
      description: row.description,
      requiredEducation: row.required_education,
      requiredExperience: Number(row.required_experience) || 0,
      requiredSkills: row.required_skills || [],
      workMode: row.work_mode,
      jobType: row.job_type,
      location: row.location,
      salaryMin: row.salary_min != null ? Number(row.salary_min) : null,
      salaryMax: row.salary_max != null ? Number(row.salary_max) : null,
      createdAt: row.created_at
    };
  }

  function fromJob(j) {
    return {
      id: j.id,
      user_id: j.userId,
      title: j.title,
      company: j.company || "",
      description: j.description || "",
      required_education: j.requiredEducation || "",
      required_experience: j.requiredExperience || 0,
      required_skills: j.requiredSkills || [],
      work_mode: j.workMode || "",
      job_type: j.jobType || "",
      location: j.location || "",
      salary_min: j.salaryMin,
      salary_max: j.salaryMax,
      created_at: j.createdAt || Date.now()
    };
  }

  function toApplication(row) {
    return {
      id: row.id,
      candidateUserId: row.candidate_user_id,
      jobId: row.job_id,
      status: row.status,
      employerStatus: row.employer_status,
      viewedByEmployer: !!row.viewed_by_employer,
      candidateArchived: !!row.candidate_archived,
      events: row.events || [],
      createdAt: row.created_at
    };
  }

  function fromApplication(a) {
    return {
      id: a.id,
      candidate_user_id: a.candidateUserId,
      job_id: a.jobId,
      status: a.status,
      employer_status: a.employerStatus || null,
      viewed_by_employer: !!a.viewedByEmployer,
      candidate_archived: !!a.candidateArchived,
      events: a.events || [],
      created_at: a.createdAt || Date.now()
    };
  }

  function toInterview(row) {
    return {
      id: row.id,
      employerUserId: row.employer_user_id,
      candidateUserId: row.candidate_user_id,
      jobId: row.job_id,
      title: row.title,
      dateTime: row.date_time,
      durationMinutes: row.duration_minutes,
      meetingType: row.meeting_type,
      meetingLink: row.meeting_link,
      createdAt: row.created_at
    };
  }

  function fromInterview(i) {
    return {
      id: i.id,
      employer_user_id: i.employerUserId,
      candidate_user_id: i.candidateUserId,
      job_id: i.jobId,
      title: i.title,
      date_time: i.dateTime,
      duration_minutes: i.durationMinutes || 60,
      meeting_type: i.meetingType || "google_meet",
      meeting_link: i.meetingLink || "",
      created_at: i.createdAt || Date.now()
    };
  }

  function toMessage(row) {
    return {
      id: row.id,
      threadId: row.thread_id,
      fromUserId: row.from_user_id,
      toUserId: row.to_user_id,
      jobId: row.job_id,
      body: row.body,
      createdAt: row.created_at,
      read: !!row.read,
      system: !!row.system
    };
  }

  function fromMessage(m) {
    return {
      id: m.id,
      thread_id: m.threadId,
      from_user_id: m.fromUserId,
      to_user_id: m.toUserId,
      job_id: m.jobId || null,
      body: m.body,
      created_at: m.createdAt || Date.now(),
      read: !!m.read,
      system: !!m.system
    };
  }

  function toCompany(row) {
    return {
      id: row.id,
      name: row.name,
      color: row.color,
      industry: row.industry,
      seededRating: row.seeded_rating != null ? Number(row.seeded_rating) : null,
      seededReviewsCount: row.seeded_reviews_count,
      salariesCount: row.salaries_count,
      questionsCount: row.questions_count,
      mockOpenJobs: row.mock_open_jobs,
      description: row.description,
      whyJoinUs: row.why_join_us,
      detailedRatings: row.detailed_ratings || {},
      saying: row.saying || {},
      createdAt: row.created_at
    };
  }

  function fromCompany(c) {
    return {
      id: c.id,
      name: c.name,
      color: c.color || "#2250f4",
      industry: c.industry || "",
      seeded_rating: c.seededRating,
      seeded_reviews_count: c.seededReviewsCount,
      salaries_count: c.salariesCount,
      questions_count: c.questionsCount,
      mock_open_jobs: c.mockOpenJobs,
      description: c.description || "",
      why_join_us: c.whyJoinUs || "",
      detailed_ratings: c.detailedRatings || {},
      saying: c.saying || {},
      created_at: c.createdAt || Date.now()
    };
  }

  function toReview(row) {
    return {
      id: row.id,
      companyName: row.company_name,
      authorName: row.author_name,
      rating: row.rating,
      title: row.title,
      position: row.position,
      location: row.location,
      body: row.body,
      likes: row.likes || 0,
      dislikes: row.dislikes || 0,
      createdAt: row.created_at
    };
  }

  function fromReview(r) {
    return {
      id: r.id,
      company_name: r.companyName,
      author_name: r.authorName || null,
      rating: r.rating,
      title: r.title || "",
      position: r.position || "",
      location: r.location || "",
      body: r.body || "",
      likes: r.likes || 0,
      dislikes: r.dislikes || 0,
      created_at: r.createdAt || Date.now()
    };
  }

  function toSourcing(row) {
    return {
      id: row.id,
      employerUserId: row.employer_user_id,
      candidateUserId: row.candidate_user_id,
      jobId: row.job_id,
      createdAt: row.created_at
    };
  }

  function fromSourcing(s) {
    return {
      id: s.id,
      employer_user_id: s.employerUserId,
      candidate_user_id: s.candidateUserId,
      job_id: s.jobId,
      created_at: s.createdAt || Date.now()
    };
  }

  const MAPPERS = {
    users: { to: toUser, from: fromUser },
    candidates: { to: toCandidate, from: fromCandidate },
    jobs: { to: toJob, from: fromJob },
    applications: { to: toApplication, from: fromApplication },
    interviews: { to: toInterview, from: fromInterview },
    messages: { to: toMessage, from: fromMessage },
    companies: { to: toCompany, from: fromCompany },
    reviews: { to: toReview, from: fromReview },
    sourcing: { to: toSourcing, from: fromSourcing }
  };

  function normalizeSupabaseUrl(raw) {
    let url = String(raw || "").trim().replace(/\/+$/, "");
    url = url.replace(/\/rest\/v1\/?$/i, "");
    return url;
  }

  function formatSupabaseError(table, error) {
    const parts = [];
    if (table) parts.push(`Table "${table}"`);
    if (error?.message) parts.push(error.message);
    if (error?.hint) parts.push(error.hint);
    if (error?.code) parts.push(`code: ${error.code}`);
    return parts.join(" — ") || "Unknown Supabase error";
  }

  function loadArrayLocal(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveArrayLocal(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  async function fetchTable(table) {
    const { data, error } = await client.from(table).select("*");
    if (error) throw new Error(formatSupabaseError(table, error));
    const mapper = MAPPERS[table];
    return (data || []).map((row) => mapper.to(row));
  }

  async function syncTable(table, rows) {
    const mapper = MAPPERS[table];
    const dbRows = rows.map((r) => mapper.from(r));

    const { data: existing, error: fetchErr } = await client.from(table).select("id");
    if (fetchErr) throw fetchErr;

    const newIds = new Set(rows.map((r) => r.id));
    const deleteIds = (existing || []).map((e) => e.id).filter((id) => !newIds.has(id));

    if (deleteIds.length) {
      const { error: delErr } = await client.from(table).delete().in("id", deleteIds);
      if (delErr) throw delErr;
    }

    if (dbRows.length) {
      const { error: upsertErr } = await client.from(table).upsert(dbRows, { onConflict: "id" });
      if (upsertErr) throw upsertErr;
    }
  }

  async function loadIntegrationsFromDb(defaultIntegrations) {
    if (!useSupabase) {
      try {
        const raw = localStorage.getItem(STORAGE.integrations);
        const parsed = raw ? JSON.parse(raw) : {};
        return { ...defaultIntegrations, ...(parsed && typeof parsed === "object" ? parsed : {}) };
      } catch {
        return { ...defaultIntegrations };
      }
    }

    const { data, error } = await client
      .from("integrations")
      .select("settings")
      .eq("user_id", integrationsUserId)
      .maybeSingle();

    if (error) throw error;
    if (!data || !data.settings) return { ...defaultIntegrations };
    return { ...defaultIntegrations, ...data.settings };
  }

  async function saveIntegrationsToDb(settings) {
    if (!useSupabase) {
      localStorage.setItem(STORAGE.integrations, JSON.stringify(settings));
      return;
    }

    const { error } = await client.from("integrations").upsert(
      { user_id: integrationsUserId, settings },
      { onConflict: "user_id" }
    );
    if (error) throw error;
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

  async function loadAll(defaultIntegrations) {
    if (!useSupabase) {
      return {
        users: loadArrayLocal(STORAGE.users),
        candidates: loadArrayLocal(STORAGE.candidates),
        jobs: loadArrayLocal(STORAGE.jobs),
        applications: loadArrayLocal(STORAGE.applications),
        interviews: loadArrayLocal(STORAGE.interviews),
        sourcingHistory: loadArrayLocal(STORAGE.sourcing),
        messages: loadArrayLocal(STORAGE.messages),
        companies: loadArrayLocal(STORAGE.companies),
        reviews: loadArrayLocal(STORAGE.reviews),
        integrations: await loadIntegrationsFromDb(defaultIntegrations),
        backend: "localStorage"
      };
    }

    const [
      users,
      candidates,
      jobs,
      applications,
      interviews,
      sourcingHistory,
      messages,
      companies,
      reviews,
      integrations
    ] = await Promise.all([
      fetchTable("users"),
      fetchTable("candidates"),
      fetchTable("jobs"),
      fetchTable("applications"),
      fetchTable("interviews"),
      fetchTable("sourcing"),
      fetchTable("messages"),
      fetchTable("companies"),
      fetchTable("reviews"),
      loadIntegrationsFromDb(defaultIntegrations)
    ]);

    return {
      users,
      candidates,
      jobs,
      applications,
      interviews,
      sourcingHistory,
      messages,
      companies,
      reviews,
      integrations,
      backend: "supabase"
    };
  }

  async function saveCollection(key, data) {
    if (!Array.isArray(data)) return;

    if (!useSupabase) {
      saveArrayLocal(key, data);
      return;
    }

    const table = TABLE_BY_KEY[key];
    if (!table) return;
    await syncTable(table, data);
  }

  async function init(defaultIntegrations) {
    useSupabase = isConfigured() && typeof window.supabase !== "undefined";

    if (useSupabase) {
      const cfg = window.MATCHIFY_SUPABASE;
      client = window.supabase.createClient(normalizeSupabaseUrl(cfg.url), cfg.anonKey.trim());
    }

    const data = await loadAll(defaultIntegrations);

    if (useSupabase && isLocalStoragePopulated() && isDatabaseEmpty(data)) {
      await migrateLocalStorageToSupabase(defaultIntegrations);
      return loadAll(defaultIntegrations);
    }

    return data;
  }

  function isLocalStoragePopulated() {
    return Object.keys(TABLE_BY_KEY).some((key) => loadArrayLocal(key).length > 0);
  }

  function isDatabaseEmpty(data) {
    return !data.users.length &&
      !data.candidates.length &&
      !data.jobs.length &&
      !data.applications.length &&
      !data.companies.length;
  }

  async function migrateLocalStorageToSupabase(defaultIntegrations) {
    const collections = Object.entries(TABLE_BY_KEY);
    for (const [key, table] of collections) {
      const rows = loadArrayLocal(key);
      if (rows.length) await syncTable(table, rows);
    }
    try {
      const raw = localStorage.getItem(STORAGE.integrations);
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && typeof parsed === "object") {
        await saveIntegrationsToDb({ ...defaultIntegrations, ...parsed });
      }
    } catch {
      /* ignore */
    }
  }

  function setIntegrationsUserId(userId) {
    integrationsUserId = userId || "__default__";
  }

  window.MatchifyData = {
    STORAGE,
    init,
    saveCollection,
    saveIntegrations: saveIntegrationsToDb,
    loadIntegrations: loadIntegrationsFromDb,
    loadSessionUser,
    saveSessionUser,
    setIntegrationsUserId,
    isConfigured,
    usingSupabase: () => useSupabase
  };
})();
