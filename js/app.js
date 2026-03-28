// app.js — navigation, API calls, page rendering, event listeners

// ── THEME ──────────────────────────────────────────────────
function setupTheme() {
  const saved = db_get("theme") || "light";
  document.documentElement.setAttribute("data-theme", saved);
  updateThemeIcon(saved);
  el("theme-btn").addEventListener("click", () => {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    db_set("theme", next);
    updateThemeIcon(next);
  });
}
function updateThemeIcon(t) { const b = el("theme-btn"); if (b) b.textContent = t === "dark" ? "Light Mode" : "Dark Mode"; }

// ── NAVIGATION ─────────────────────────────────────────────
function showPage(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  const page = el("page-" + id);
  if (page) page.classList.add("active");
  window.scrollTo({ top:0, behavior:"smooth" });
}

// ── HEADER ─────────────────────────────────────────────────
function updateHeader() {
  const user   = getCurrentUser();
  const userEl = el("nav-user");
  const adminLi = el("nav-admin-li");
  if (user) {
    userEl.innerHTML =
      '<span class="nav-username">' + user.name +
      (user.role === "admin" ? ' <span class="admin-chip">Admin</span>' : "") + '</span>' +
      '<a href="#" class="nav-link" id="btn-signout">Sign Out</a>';
    el("btn-signout").addEventListener("click", e => {
      e.preventDefault(); signOut(); updateHeader(); initDonors(); renderDonors();
      updateStats(); showPage("home"); showToast("Signed out.");
    });
    if (adminLi) adminLi.style.display = user.role === "admin" ? "flex" : "none";
  } else {
    userEl.innerHTML = '<a href="#" class="nav-link" data-action="open-auth">Sign In</a>';
    if (adminLi) adminLi.style.display = "none";
  }
}

// ── AUTH MODAL ─────────────────────────────────────────────
function openAuthModal() {
  el("auth-modal").classList.remove("hidden");
  switchAuthTab("login");
}

function switchAuthTab(tab) {
  const isLogin = tab === "login";
  el("auth-form-login").classList.toggle("hidden", !isLogin);
  el("auth-form-signup").classList.toggle("hidden",  isLogin);
  el("auth-tab-login").classList.toggle("active",  isLogin);
  el("auth-tab-signup").classList.toggle("active", !isLogin);
  el("auth-err").textContent         = "";
  el("auth-err-signup").textContent  = "";
}

function setupAuthModal() {
  el("auth-tab-login").addEventListener("click",  () => switchAuthTab("login"));
  el("auth-tab-signup").addEventListener("click", () => switchAuthTab("signup"));
  el("auth-go-signup").addEventListener("click", e => { e.preventDefault(); switchAuthTab("signup"); });
  el("auth-go-login").addEventListener("click",  e => { e.preventDefault(); switchAuthTab("login"); });
  el("auth-modal").addEventListener("click", e => { if (e.target === el("auth-modal")) el("auth-modal").classList.add("hidden"); });

  el("btn-login").addEventListener("click", () => {
    const email = el("login-email").value.trim();
    const pass  = el("login-password").value;
    el("auth-err").textContent = "";
    if (!email || !pass) { el("auth-err").textContent = "Please enter email and password."; return; }
    const res = signIn(email, pass);
    if (!res.ok) { el("auth-err").textContent = res.msg; return; }
    el("auth-modal").classList.add("hidden");
    updateHeader();
    if (res.role === "admin") { renderAdminPanel(); showPage("admin"); showToast("Welcome, Admin!"); }
    else { renderDonors(); updateStats(); showToast("Welcome back, " + getCurrentUser().name + "!"); }
  });

  el("btn-signup").addEventListener("click", () => {
    const name  = el("signup-name").value.trim();
    const email = el("signup-email").value.trim();
    const pass  = el("signup-password").value;
    el("auth-err-signup").textContent = "";
    if (!name)            { el("auth-err-signup").textContent = "Please enter your name."; return; }
    if (!email)           { el("auth-err-signup").textContent = "Please enter your email."; return; }
    if (pass.length < 6)  { el("auth-err-signup").textContent = "Password must be at least 6 characters."; return; }
    const res = signUp(name, email, pass);
    if (!res.ok) { el("auth-err-signup").textContent = res.msg; return; }
    el("auth-modal").classList.add("hidden");
    updateHeader(); renderDonors(); updateStats();
    showToast("Account created! Welcome, " + getCurrentUser().name + "!");
  });
}

// ── REST COUNTRIES API ─────────────────────────────────────
// Populates every country dropdown from restcountries.com
// Falls back to a full built-in list if API is unreachable

var COUNTRY_FALLBACK = [
  "Afghanistan","Albania","Algeria","Angola","Argentina","Armenia","Australia","Austria",
  "Azerbaijan","Bahrain","Bangladesh","Belgium","Benin","Bolivia","Botswana","Brazil",
  "Burkina Faso","Burundi","Cambodia","Cameroon","Canada","Chad","Chile","China","Colombia",
  "Congo","Costa Rica","Croatia","Cuba","Czech Republic","Denmark","Dominican Republic",
  "DR Congo","Ecuador","Egypt","El Salvador","Eritrea","Ethiopia","Finland","France","Gabon",
  "Gambia","Georgia","Germany","Ghana","Greece","Guatemala","Guinea","Haiti","Honduras",
  "Hungary","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Ivory Coast",
  "Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kuwait","Laos","Lebanon","Liberia",
  "Libya","Madagascar","Malawi","Malaysia","Mali","Mauritania","Mauritius","Mexico",
  "Moldova","Mongolia","Morocco","Mozambique","Myanmar","Namibia","Nepal","Netherlands",
  "New Zealand","Nicaragua","Niger","Nigeria","North Korea","Norway","Oman","Pakistan",
  "Palestine","Panama","Paraguay","Peru","Philippines","Poland","Portugal","Qatar",
  "Romania","Russia","Rwanda","Saudi Arabia","Senegal","Sierra Leone","Singapore",
  "Somalia","South Africa","South Korea","South Sudan","Spain","Sri Lanka","Sudan",
  "Sweden","Switzerland","Syria","Taiwan","Tanzania","Thailand","Togo","Tunisia",
  "Turkey","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States",
  "Uruguay","Uzbekistan","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe"
].sort((a,b) => a.localeCompare(b));

function fillCountryDropdowns(list) {
  const ids = ["filter-country","reg-country","admin-add-country","edit-country"];
  ids.forEach(id => {
    const sel = el(id);
    if (!sel) return;
    // Clear all options except the first placeholder
    while (sel.options.length > 1) sel.remove(1);
    list.forEach(name => {
      const o = document.createElement("option");
      o.value = o.textContent = name;
      sel.appendChild(o);
    });
  });
}

async function loadCountries() {
  // Always fill with fallback first so dropdowns are never empty
  fillCountryDropdowns(COUNTRY_FALLBACK);
  setText("stat-countries", COUNTRY_FALLBACK.length);

  try {
    const res  = await fetch(COUNTRIES_API);
    if (!res.ok) throw new Error("Status " + res.status);
    const data = await res.json();
    if (!data || !data.length) throw new Error("Empty response");
    const list = data.map(c => c.name.common).sort((a,b) => a.localeCompare(b));
    fillCountryDropdowns(list);
    setText("stat-countries", list.length);
  } catch(e) {
    // Fallback already applied — just log the warning
    console.warn("Countries API unavailable, using built-in list:", e.message);
  }
}

// ── OPENFDA API ────────────────────────────────────────────
async function fetchFDA(keyword) {
  const grid    = el("fda-grid");
  const loading = el("fda-loading");
  const empty   = el("fda-empty");
  const errBox  = el("fda-error");
  const errMsg  = el("fda-err-msg");

  [grid, empty, errBox].forEach(e => e.classList.add("hidden"));
  grid.innerHTML = "";
  loading.classList.remove("hidden");

  if (typeof CONFIG === "undefined" || !CONFIG.OPENFDA_API_KEY || CONFIG.OPENFDA_API_KEY === "YOUR_OPENFDA_KEY_HERE") {
    loading.classList.add("hidden");
    errMsg.textContent = "No API key found. Add your free key from https://open.fda.gov/apis/authentication/ to config.js";
    errBox.classList.remove("hidden");
    return;
  }

  try {
    const q   = (keyword || "blood").trim();
    const url = FDA_API + '?search=product_description:"' + encodeURIComponent(q) + '"&limit=9&api_key=' + CONFIG.OPENFDA_API_KEY;
    const res = await fetch(url);
    if (res.status === 404) { loading.classList.add("hidden"); empty.classList.remove("hidden"); return; }
    if (!res.ok) throw new Error("Status " + res.status);
    const data = await res.json();
    loading.classList.add("hidden");
    if (!data.results || !data.results.length) { empty.classList.remove("hidden"); return; }
    data.results.forEach((item, i) => {
      const c = document.createElement("div");
      c.className = "fda-card";
      c.style.animationDelay = (i * 0.05) + "s";
      c.innerHTML =
        '<span class="fda-status">' + (item.status || "Unknown") + '</span>' +
        '<div class="fda-title">' + cut(item.product_description || "Unknown", 90) + '</div>' +
        '<div class="fda-row"><strong>Firm:</strong> ' + (item.recalling_firm || "Unknown") + '</div>' +
        '<div class="fda-row"><strong>Class:</strong> ' + (item.classification || "N/A") + '</div>' +
        '<div class="fda-row"><strong>Date:</strong> ' + (item.recall_initiation_date ? fmtDate(item.recall_initiation_date) : "Unknown") + '</div>' +
        '<div class="fda-reason"><strong>Reason:</strong> ' + cut(item.reason_for_recall || "Not provided", 180) + '</div>';
      grid.appendChild(c);
    });
    grid.classList.remove("hidden");
  } catch(e) {
    loading.classList.add("hidden");
    errMsg.textContent = "Could not fetch FDA data: " + e.message;
    errBox.classList.remove("hidden");
  }
}

// ── STATS ──────────────────────────────────────────────────
function updateStats() {
  const donors = getDonors();
  setText("stat-total",     donors.length);
  setText("stat-available", donors.filter(d => d.available).length);
}

// ── COMPATIBILITY ─────────────────────────────────────────
// Renders 8 blood type cards — runs on init, visible when page opens
function renderCompat() {
  const grid = el("compat-grid");
  if (!grid) return;
  grid.innerHTML = "";
  BLOOD_COMPAT.forEach(item => {
    const c = document.createElement("div");
    c.className = "compat-card";
    c.innerHTML =
      '<div class="compat-type">' + item.type + '</div>' +
      '<div class="compat-lbl">Can Donate To</div>' +
      '<div class="compat-val">' + item.donateTo + '</div>' +
      '<div class="compat-lbl" style="margin-top:10px;">Can Receive From</div>' +
      '<div class="compat-val">' + item.receiveFrom + '</div>';
    grid.appendChild(c);
  });
}

// ── BLOOD REQUESTS ─────────────────────────────────────────
function renderRequests() {
  const board = el("requests-board");
  if (!board) return;
  const requests = getRequests();
  board.innerHTML = "";
  if (!requests.length) {
    board.innerHTML = '<p class="req-empty">No active blood requests. Post one below if you urgently need blood.</p>';
    return;
  }
  [...requests].reverse().forEach(r => {
    const c = document.createElement("div");
    c.className = "req-card";
    c.innerHTML =
      '<div class="req-top"><span class="req-blood">' + r.bloodType + '</span><span class="req-time">' + timeAgo(r.postedAt) + '</span></div>' +
      '<div class="req-patient">' + r.patient + '</div>' +
      '<div class="req-detail">Hospital: ' + r.hospital + '</div>' +
      '<div class="req-detail">Units needed: ' + r.units + '</div>' +
      (r.note ? '<div class="req-note">' + r.note + '</div>' : '') +
      '<a class="req-call" href="tel:' + r.contact + '">Call to help: ' + r.contact + '</a>';
    board.appendChild(c);
  });
}

function handlePostRequest(e) {
  e.preventDefault();
  const patient  = el("req-patient").value.trim();
  const blood    = el("req-blood").value;
  const hospital = el("req-hospital").value.trim();
  const units    = el("req-units").value;
  const contact  = el("req-contact").value.trim();
  const note     = el("req-note").value.trim();
  if (!patient || !blood || !hospital || !units || !contact) { showToast("Please fill in all required fields."); return; }
  const list = getRequests();
  list.push({ patient, bloodType:blood, hospital, units, contact, note, postedAt:new Date().toISOString() });
  saveRequests(list);
  renderRequests();
  showFeedback("req-feedback", "Request posted. Donors can now see it and call you.", "ok");
  document.getElementById("request-form").reset();
}

// ── REGISTER DONOR ─────────────────────────────────────────
function handleRegister(e) {
  e.preventDefault();
  const checks = [
    {id:"reg-name",       err:"err-name",    msg:"Full name is required."},
    {id:"reg-blood-type", err:"err-blood",   msg:"Please select a blood type."},
    {id:"reg-country",    err:"err-country", msg:"Please select your country."},
    {id:"reg-city",       err:"err-city",    msg:"City is required."},
    {id:"reg-phone",      err:"err-phone",   msg:"Phone number is required."}
  ];
  checks.forEach(c => { const e = el(c.err); if(e) e.textContent = ""; el(c.id).classList.remove("error"); });
  let ok = true;
  checks.forEach(c => {
    if (!el(c.id).value.trim()) { el(c.err).textContent = c.msg; el(c.id).classList.add("error"); ok = false; }
  });
  const age = parseInt(el("reg-age").value, 10);
  if (isNaN(age) || age < 18 || age > 65) { el("err-age").textContent = "Age must be 18–65."; el("reg-age").classList.add("error"); ok = false; }
  if (!ok) return;
  addDonor({
    name:      el("reg-name").value.trim(),
    age,
    bloodType: el("reg-blood-type").value,
    country:   el("reg-country").value,
    city:      el("reg-city").value.trim(),
    phone:     el("reg-phone").value.trim(),
    available: el("reg-available").checked
  });
  renderDonors(); updateStats();
  showFeedback("reg-feedback", "You are now registered as a blood donor. Thank you!", "ok");
  document.getElementById("register-form").reset();
  el("toggle-text").textContent = "Yes, I am available";
  showToast("Registration successful!");
}

// ── ELIGIBILITY ────────────────────────────────────────────
function handleEligibility(e) {
  e.preventDefault();
  const age      = parseInt(el("elig-age").value, 10);
  const weight   = parseInt(el("elig-weight").value, 10);
  const well     = document.querySelector('input[name="elig-well"]:checked');
  const donated  = document.querySelector('input[name="elig-donated"]:checked');
  const tattoo   = document.querySelector('input[name="elig-tattoo"]:checked');
  const pregnant = document.querySelector('input[name="elig-pregnant"]:checked');
  const meds     = document.querySelector('input[name="elig-meds"]:checked');
  if (!well || !donated || !tattoo || !pregnant || !meds || !age || !weight) { showToast("Please answer all questions."); return; }
  const reasons = [];
  if (age < 17)                reasons.push("You must be at least 17 years old.");
  if (age > 65)                reasons.push("Most centers require donors under 65.");
  if (weight < 50)             reasons.push("You must weigh at least 50 kg.");
  if (well.value === "no")     reasons.push("You must feel completely well on donation day.");
  if (donated.value === "yes") reasons.push("Wait at least 56 days between whole blood donations.");
  if (tattoo.value === "yes")  reasons.push("A recent tattoo or piercing may require a waiting period.");
  if (pregnant.value === "yes")reasons.push("Cannot donate while pregnant or within 6 months of giving birth.");
  if (meds.value === "yes")    reasons.push("Antibiotics or blood thinners may prevent donation.");
  const eligible = !reasons.length;
  const box = el("result-box");
  box.className = "result-box " + (eligible ? "ok" : "no");
  el("result-icon").textContent  = eligible ? "✓" : "✗";
  el("result-title").textContent = eligible ? "You appear eligible to donate!" : "You may not be eligible right now";
  el("result-title").className   = eligible ? "ok" : "no";
  el("result-body").textContent  = eligible
    ? "You meet the basic criteria. Visit your nearest blood bank today."
    : "One or more conditions may prevent you from donating today.";
  const ul = el("result-reasons");
  ul.innerHTML = "";
  reasons.forEach(r => { const li = document.createElement("li"); li.textContent = r; ul.appendChild(li); });
  el("elig-result").classList.remove("hidden");
}

// ── TRACKER ────────────────────────────────────────────────
function renderTracker() {
  const log    = getDonationLog();
  const histEl = el("tracker-history");
  const dateEl = el("eligible-date");
  const subEl  = el("eligible-sub");
  const wrap   = el("bar-wrap");
  if (!histEl) return;
  histEl.innerHTML = "";
  if (!log.length) {
    histEl.innerHTML = '<p class="tracker-empty">No donations logged yet.</p>';
    if (dateEl) dateEl.textContent = "No donations logged";
    if (subEl)  subEl.textContent  = "";
    if (wrap)   wrap.classList.add("hidden");
    return;
  }
  [...log].sort((a,b) => new Date(b.date) - new Date(a.date)).forEach((entry, i) => {
    const row = document.createElement("div");
    row.className = "history-row";
    row.style.animationDelay = (i * 0.05) + "s";
    row.innerHTML =
      '<div class="h-avatar">' + entry.type[0] + '</div>' +
      '<div class="h-info"><div class="h-type">' + entry.type + '</div>' +
      '<div class="h-loc">' + (entry.location || "Location not specified") + '</div></div>' +
      '<div class="h-date">' + new Date(entry.date).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) + '</div>' +
      '<button class="del-btn" data-id="' + entry.id + '">×</button>';
    histEl.appendChild(row);
  });
  histEl.querySelectorAll(".del-btn").forEach(b =>
    b.addEventListener("click", () => { saveDonationLog(getDonationLog().filter(e => e.id !== parseInt(b.dataset.id))); renderTracker(); }));
  const latest   = [...log].sort((a,b) => new Date(b.date) - new Date(a.date))[0];
  const wait     = WAIT_DAYS[latest.type] || 56;
  const nextDate = new Date(latest.date);
  nextDate.setDate(nextDate.getDate() + wait);
  const diff = Math.ceil((nextDate - new Date()) / 86400000);
  if (dateEl) dateEl.textContent = diff <= 0 ? "You are eligible now" : nextDate.toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"});
  if (subEl)  subEl.textContent  = diff <= 0 ? Math.abs(diff) + " days since eligibility" : diff + " days remaining";
  if (wrap) {
    const pct  = Math.min(100, Math.round(((wait - Math.max(diff,0)) / wait) * 100));
    const fill = el("prog-fill");
    const endEl = el("bar-end");
    setTimeout(() => { if (fill) fill.style.width = pct + "%"; }, 100);
    if (endEl) endEl.textContent = wait + " days";
    wrap.classList.remove("hidden");
  }
}

function handleTracker(e) {
  e.preventDefault();
  const dateEl = el("track-date");
  if (!dateEl.value) { showToast("Please select the donation date."); return; }
  if (new Date(dateEl.value) > new Date()) { showToast("Date cannot be in the future."); return; }
  const log = getDonationLog();
  log.push({ id:Date.now(), date:dateEl.value, type:el("track-type").value, location:el("track-location").value.trim() });
  saveDonationLog(log);
  renderTracker();
  showFeedback("track-feedback", "Donation logged. Next eligible date updated.", "ok");
  document.getElementById("tracker-form").reset();
}

// ── ADMIN TABS ─────────────────────────────────────────────
function setupAdminTabs() {
  document.querySelectorAll(".admin-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".admin-tab").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".admin-section").forEach(s => s.classList.remove("active"));
      btn.classList.add("active");
      const sec = el("admin-sec-" + btn.dataset.tab);
      if (sec) sec.classList.add("active");
    });
  });
}

// ── HELPERS ────────────────────────────────────────────────
function showToast(msg) {
  const t = el("toast");
  el("toast-msg").textContent = msg;
  t.classList.remove("hidden"); t.classList.add("show");
  setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.classList.add("hidden"), 250); }, 3200);
}
function showFeedback(id, msg, type) {
  const e = el(id); if (!e) return;
  e.textContent = msg; e.className = "feedback " + type; e.classList.remove("hidden");
  setTimeout(() => e.classList.add("hidden"), 6000);
}

// ── GLOBAL CLICK HANDLER ───────────────────────────────────
document.addEventListener("click", e => {
  const t      = e.target.closest("[data-action]") || e.target;
  const action = t.dataset.action;
  const pageEl = e.target.closest("[data-page]");
  const page   = pageEl ? pageEl.dataset.page : null;

  if (action === "open-auth") { e.preventDefault(); openAuthModal(); return; }
  if (page) {
    e.preventDefault();
    if (page.startsWith("admin") && !isAdmin()) { showToast("Admin access only."); return; }
    showPage(page);
  }
});

// ── INIT ───────────────────────────────────────────────────
async function init() {
  // 1. Apply theme before anything renders
  setupTheme();

  // 2. Load session (restores login state)
  loadSession();

  // 3. Load donor data — getDonors() saves seeds on first visit
  initDonors();

  // 4. Set up UI components
  setupAuthModal();
  setupAdminTabs();
  updateHeader();

  // 5. Update stats immediately with loaded donor data
  updateStats();

  // 6. Render all static sections (compat, requests, tracker, donors)
  renderCompat();
  renderRequests();
  renderTracker();
  renderDonors();

  // 7. Render admin panel if already logged in as admin
  if (isAdmin()) renderAdminPanel();

  // 8. Load countries — fills dropdowns (fallback applied instantly, API replaces it)
  loadCountries(); // intentionally NOT awaited so rest of init is not blocked

  // 9. Global search
  el("global-search-btn").addEventListener("click", () => {
    const val = el("global-search").value.trim();
    el("search-name").value = val;
    showPage("find");
    applyDonorFilters();
  });
  el("global-search").addEventListener("keydown", e => { if (e.key === "Enter") el("global-search-btn").click(); });

  // 10. Find donors filters
  el("apply-filters").addEventListener("click", applyDonorFilters);
  el("clear-filters").addEventListener("click", () => {
    ["filter-blood-type","filter-country","filter-available","search-name"].forEach(id => { const e = el(id); if (e) e.value = ""; });
    filteredDonors = [...allDonors]; sortDonors(); renderDonors();
  });
  ["filter-blood-type","filter-country","filter-available"].forEach(id => {
    const e = el(id); if (e) e.addEventListener("change", applyDonorFilters);
  });
  el("search-name").addEventListener("keydown", e => { if (e.key === "Enter") applyDonorFilters(); });

  // 11. Sort chips
  document.querySelectorAll(".sort-chip").forEach(btn => {
    btn.addEventListener("click", () => {
      const s = btn.dataset.sort;
      if (s === currentSort) sortAsc = !sortAsc; else { currentSort = s; sortAsc = true; }
      document.querySelectorAll(".sort-chip").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      sortDonors(); renderDonors();
    });
  });

  // 12. Register form
  el("register-form").addEventListener("submit", handleRegister);
  el("reg-available").addEventListener("change", function() {
    el("toggle-text").textContent = this.checked ? "Yes, I am available" : "No, not right now";
  });

  // 13. Blood requests
  el("request-form").addEventListener("submit", handlePostRequest);

  // 14. Eligibility
  el("eligibility-form").addEventListener("submit", handleEligibility);
  el("elig-reset").addEventListener("click", () => {
    el("elig-result").classList.add("hidden");
    document.getElementById("eligibility-form").reset();
  });

  // 15. Tracker
  el("tracker-form").addEventListener("submit", handleTracker);
  el("track-date").max = new Date().toISOString().split("T")[0];

  // 16. FDA
  el("fda-search-btn").addEventListener("click", () => fetchFDA(el("fda-keyword").value));
  el("fda-keyword").addEventListener("keydown", e => { if (e.key === "Enter") fetchFDA(el("fda-keyword").value); });

  // 17. Admin forms
  el("admin-add-form").addEventListener("submit", handleAdminAddDonor);
  el("edit-save").addEventListener("click", saveEditDonor);
  el("edit-cancel").addEventListener("click", () => el("edit-modal").classList.add("hidden"));
  el("edit-modal").addEventListener("click", e => { if (e.target === el("edit-modal")) el("edit-modal").classList.add("hidden"); });
}

document.addEventListener("DOMContentLoaded", init);