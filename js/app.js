// BloodLink - Blood Donor Finder
// Two external APIs:
//   1. REST Countries API  https://restcountries.com  (no key needed)
//   2. OpenFDA API         https://open.fda.gov       (free key in config.js)

const COUNTRIES_API = "https://restcountries.com/v3.1/all?fields=name,cca2";
const FDA_API       = "https://api.fda.gov/drug/enforcement.json";

// Days to wait before donating again, per donation type
const WAIT = {
  "Whole Blood":      56,
  "Platelets":        7,
  "Plasma":           28,
  "Double Red Cells": 112
};

// Blood type compatibility based on Red Cross guidelines
const COMPAT = [
  { type: "A+",  donateTo: "A+, AB+",                     receiveFrom: "A+, A-, O+, O-" },
  { type: "A-",  donateTo: "A+, A-, AB+, AB-",            receiveFrom: "A-, O-" },
  { type: "B+",  donateTo: "B+, AB+",                     receiveFrom: "B+, B-, O+, O-" },
  { type: "B-",  donateTo: "B+, B-, AB+, AB-",            receiveFrom: "B-, O-" },
  { type: "AB+", donateTo: "AB+ only",                    receiveFrom: "All types (Universal Recipient)" },
  { type: "AB-", donateTo: "AB+, AB-",                    receiveFrom: "AB-, A-, B-, O-" },
  { type: "O+",  donateTo: "A+, B+, O+, AB+",             receiveFrom: "O+, O-" },
  { type: "O-",  donateTo: "All types (Universal Donor)", receiveFrom: "O- only" }
];

// Starting donors so the app has content on first load
const SEEDS = [
  { id:1, name:"Amara Diallo",      age:28, bloodType:"O+",  country:"Rwanda",       city:"Kigali",       phone:"+250 788 100 200",  available:true  },
  { id:2, name:"James Owusu",       age:34, bloodType:"A+",  country:"Ghana",         city:"Accra",        phone:"+233 24 555 6789",  available:true  },
  { id:3, name:"Fatima Nkosi",      age:25, bloodType:"B-",  country:"South Africa",  city:"Johannesburg", phone:"+27 82 333 4567",   available:false },
  { id:4, name:"Emmanuel Mensah",   age:31, bloodType:"AB+", country:"Nigeria",       city:"Lagos",        phone:"+234 803 456 7890", available:true  },
  { id:5, name:"Chloe Andrianaivo", age:27, bloodType:"O-",  country:"Madagascar",    city:"Antananarivo", phone:"+261 32 100 2200",  available:true  },
  { id:6, name:"Samuel Bekele",     age:22, bloodType:"A-",  country:"Ethiopia",      city:"Addis Ababa",  phone:"+251 91 234 5678",  available:false },
  { id:7, name:"Grace Mutua",       age:30, bloodType:"B+",  country:"Kenya",         city:"Nairobi",      phone:"+254 711 223 344",  available:true  },
  { id:8, name:"David Osei",        age:26, bloodType:"AB-", country:"Ghana",         city:"Kumasi",       phone:"+233 20 987 6543",  available:true  }
];

let allDonors      = [];
let filteredDonors = [];
let currentSort    = "name";
let sortAsc        = true;
let nextId         = 9;

// DONOR DATA 

function loadDonors() {
  const saved = localStorage.getItem("bl_donors");
  if (saved) {
    allDonors = JSON.parse(saved);
    nextId = allDonors.reduce((m, d) => Math.max(m, d.id), 0) + 1;
  } else {
    allDonors = [...SEEDS];
    saveDonors();
  }
}

function saveDonors() {
  localStorage.setItem("bl_donors", JSON.stringify(allDonors));
}

// REST COUNTRIES API 

async function loadCountries() {
  const s1 = document.getElementById("filter-country");
  const s2 = document.getElementById("reg-country");

  try {
    const res = await fetch(COUNTRIES_API);
    if (!res.ok) throw new Error("Status " + res.status);

    const list = (await res.json())
      .map(c => c.name.common)
      .sort((a, b) => a.localeCompare(b));

    document.getElementById("countries-count").textContent = list.length;
    list.forEach(n => { s1.appendChild(mkOpt(n)); s2.appendChild(mkOpt(n)); });

  } catch (e) {
    // API failed - use a small fallback so the form still works
    console.warn("Countries API:", e.message);
    showToast("Country list loaded from local fallback.");
    const fb = ["Ethiopia","Ghana","Kenya","Madagascar","Nigeria","Rwanda","South Africa","Tanzania","Uganda","Zambia"];
    fb.forEach(n => { s1.appendChild(mkOpt(n)); s2.appendChild(mkOpt(n)); });
    document.getElementById("countries-count").textContent = "190+";
  }
}

function mkOpt(val) {
  const o = document.createElement("option");
  o.value = o.textContent = val;
  return o;
}

// OPENFDA API 

async function fetchFDA(keyword) {
  const grid    = document.getElementById("fda-grid");
  const loading = document.getElementById("fda-loading");
  const empty   = document.getElementById("fda-empty");
  const errBox  = document.getElementById("fda-error");
  const errMsg  = document.getElementById("fda-err-msg");

  [grid, empty, errBox].forEach(el => el.classList.add("hidden"));
  grid.innerHTML = "";
  loading.classList.remove("hidden");

  const q = keyword.trim() || "blood";

  // Check that the user has put a real key in config.js
  if (typeof CONFIG === "undefined" || !CONFIG.OPENFDA_API_KEY || CONFIG.OPENFDA_API_KEY === "YOUR_OPENFDA_KEY_HERE") {
    loading.classList.add("hidden");
    errMsg.textContent = "No API key found. Open config.js and add your key from https://open.fda.gov/apis/authentication/";
    errBox.classList.remove("hidden");
    return;
  }

  try {
    const url = FDA_API + '?search=product_description:"' + encodeURIComponent(q) + '"&limit=10&api_key=' + CONFIG.OPENFDA_API_KEY;
    const res = await fetch(url);

    // 404 from FDA means no results found - not a real error
    if (res.status === 404) {
      loading.classList.add("hidden");
      empty.classList.remove("hidden");
      return;
    }

    if (!res.ok) throw new Error("FDA API status " + res.status);

    const data = await res.json();
    loading.classList.add("hidden");

    if (!data.results || !data.results.length) {
      empty.classList.remove("hidden");
      return;
    }

    data.results.forEach((item, i) => {
      const c = document.createElement("div");
      c.className = "fda-card";
      c.style.animationDelay = (i * 0.05) + "s";
      c.innerHTML =
        '<span class="fda-status">' + (item.status || "Unknown") + '</span>' +
        '<div class="fda-title">' + cut(item.product_description || "Unknown product", 100) + '</div>' +
        '<div class="fda-detail"><strong>Firm:</strong> ' + (item.recalling_firm || "Unknown") + '</div>' +
        '<div class="fda-detail"><strong>Class:</strong> ' + (item.classification || "N/A") + '</div>' +
        '<div class="fda-detail"><strong>Date:</strong> ' + (item.recall_initiation_date ? fmtDate(item.recall_initiation_date) : "Unknown") + '</div>' +
        '<div class="fda-reason"><strong>Reason:</strong> ' + cut(item.reason_for_recall || "Not provided", 200) + '</div>';
      grid.appendChild(c);
    });

    grid.classList.remove("hidden");

  } catch (e) {
    loading.classList.add("hidden");
    errMsg.textContent = "Could not fetch FDA data: " + e.message;
    errBox.classList.remove("hidden");
  }
}

// DASHBOARD 

function renderDashboard() {
  document.getElementById("stat-total").textContent     = allDonors.length;
  document.getElementById("stat-available").textContent = allDonors.filter(d => d.available).length;

  // Blood type bar chart
  const types  = ["A+","A-","B+","B-","AB+","AB-","O+","O-"];
  const counts = {};
  types.forEach(t => counts[t] = 0);
  allDonors.forEach(d => { if (counts[d.bloodType] !== undefined) counts[d.bloodType]++; });
  const max = Math.max(...Object.values(counts), 1);

  const barsEl = document.getElementById("bt-bars");
  barsEl.innerHTML = "";
  types.forEach(t => {
    const pct = Math.round((counts[t] / max) * 100);
    const row = document.createElement("div");
    row.className = "bt-row";
    row.innerHTML =
      '<span class="bt-type">' + t + '</span>' +
      '<div class="bt-track"><div class="bt-fill" style="width:0" data-w="' + pct + '"></div></div>' +
      '<span class="bt-num">' + counts[t] + '</span>';
    barsEl.appendChild(row);
  });

  setTimeout(() => {
    document.querySelectorAll(".bt-fill").forEach(b => b.style.width = b.dataset.w + "%");
  }, 100);

  // Recent registrations (top 5)
  const recEl = document.getElementById("recent-list");
  recEl.innerHTML = "";
  allDonors.slice(0, 5).forEach(d => {
    const row = document.createElement("div");
    row.className = "recent-item";
    row.innerHTML =
      '<div class="avatar">' + d.name[0] + '</div>' +
      '<div class="recent-info">' +
        '<div class="recent-name">' + d.name + '</div>' +
        '<div class="recent-meta">' + d.city + ', ' + d.country + '</div>' +
      '</div>' +
      '<span class="blood-tag">' + d.bloodType + '</span>';
    recEl.appendChild(row);
  });
}

// DONOR CARDS 

function mkDonorCard(d) {
  const el = document.createElement("div");
  el.className = "donor-card";
  el.innerHTML =
    '<div class="card-top">' +
      '<div class="avatar">' + d.name[0] + '</div>' +
      '<span class="blood-badge">' + d.bloodType + '</span>' +
    '</div>' +
    '<div class="donor-name">' + d.name + '</div>' +
    '<div class="donor-detail">Location: ' + d.city + ', ' + d.country + '</div>' +
    '<div class="donor-detail">Age: ' + d.age + '</div>' +
    '<span class="avail-badge ' + (d.available ? "yes" : "no") + '">' +
      '<span class="avail-dot"></span>' + (d.available ? "Available now" : "Not available") +
    '</span>' +
    '<a class="call-btn" href="tel:' + d.phone + '">' + d.phone + '</a>';
  return el;
}

function renderDonors() {
  const grid  = document.getElementById("donor-grid");
  const empty = document.getElementById("empty-state");
  const count = document.getElementById("results-count");

  grid.innerHTML = "";

  if (!filteredDonors.length) {
    empty.classList.remove("hidden");
    count.textContent = "";
    return;
  }

  empty.classList.add("hidden");
  count.textContent = "Showing " + filteredDonors.length + " of " + allDonors.length + " donors";

  filteredDonors.forEach((d, i) => {
    const c = mkDonorCard(d);
    c.style.animationDelay = (i * 0.04) + "s";
    grid.appendChild(c);
  });
}

function applyFilters() {
  const bt   = document.getElementById("filter-blood-type").value;
  const co   = document.getElementById("filter-country").value;
  const av   = document.getElementById("filter-available").value;
  const name = document.getElementById("search-name").value.trim().toLowerCase();

  filteredDonors = allDonors.filter(d => {
    if (bt && d.bloodType !== bt)                          return false;
    if (co && d.country   !== co)                          return false;
    if (av === "yes" && !d.available)                      return false;
    if (av === "no"  &&  d.available)                      return false;
    if (name && !d.name.toLowerCase().includes(name) &&
        !d.city.toLowerCase().includes(name) &&
        !d.bloodType.toLowerCase().includes(name))         return false;
    return true;
  });

  // Show results heading when a search has been done
  const heading = document.getElementById("results-heading");
  if (heading) {
    heading.textContent = name
      ? 'Showing results for: "' + name + '"'
      : "All Donors";
  }

  sortDonors();
  renderDonors();

  // Switch to the Find Donors tab so results are visible
  goTo("find");
}

function sortDonors() {
  filteredDonors.sort((a, b) => {
    let va = String(a[currentSort] || "").toLowerCase();
    let vb = String(b[currentSort] || "").toLowerCase();
    return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
  });
}

// REGISTRATION 
function handleRegister(e) {
  e.preventDefault();

  const fields = [
    { id:"reg-name",       err:"err-name",    msg:"Full name is required" },
    { id:"reg-age",        err:"err-age",     msg:"Age is required" },
    { id:"reg-blood-type", err:"err-blood",   msg:"Please select a blood type" },
    { id:"reg-country",    err:"err-country", msg:"Please select a country" },
    { id:"reg-city",       err:"err-city",    msg:"City is required" },
    { id:"reg-phone",      err:"err-phone",   msg:"Phone number is required" }
  ];

  let ok = true;
  fields.forEach(f => {
    document.getElementById(f.err).textContent = "";
    document.getElementById(f.id).classList.remove("error");
  });
  fields.forEach(f => {
    const el = document.getElementById(f.id);
    if (!el.value.trim()) {
      document.getElementById(f.err).textContent = f.msg;
      el.classList.add("error");
      ok = false;
    }
  });

  const age = parseInt(document.getElementById("reg-age").value, 10);
  if (!isNaN(age) && (age < 18 || age > 65)) {
    document.getElementById("err-age").textContent = "Age must be between 18 and 65.";
    document.getElementById("reg-age").classList.add("error");
    ok = false;
  }

  if (!ok) return;

  const donor = {
    id:        nextId++,
    name:      document.getElementById("reg-name").value.trim(),
    age:       age,
    bloodType: document.getElementById("reg-blood-type").value,
    country:   document.getElementById("reg-country").value,
    city:      document.getElementById("reg-city").value.trim(),
    phone:     document.getElementById("reg-phone").value.trim(),
    available: document.getElementById("reg-available").checked
  };

  allDonors.unshift(donor);
  saveDonors();
  filteredDonors = [...allDonors];
  sortDonors();
  renderDonors();
  renderDashboard();
  animateCount("stat-total",     allDonors.length);
  animateCount("stat-available", allDonors.filter(d => d.available).length);

  showFeedback("reg-feedback", "Thank you, " + donor.name + "! You are now registered as a blood donor.", "ok");
  document.getElementById("register-form").reset();
  document.getElementById("toggle-text").textContent = "Yes, I am available";
  showToast("Registration successful!");
}

// EMERGENCY REQUEST 

function loadEmergencies() {
  return JSON.parse(localStorage.getItem("bl_emergency") || "[]");
}

function saveEmergencies(list) {
  localStorage.setItem("bl_emergency", JSON.stringify(list));
}

function renderEmergencyBoard() {
  const board = document.getElementById("emergency-board");
  const list  = loadEmergencies();
  board.innerHTML = "";

  if (!list.length) {
    board.innerHTML = '<div class="emg-empty">No active emergency requests right now. Post one below if someone urgently needs blood.</div>';
    return;
  }

  [...list].reverse().forEach(r => {
    const c = document.createElement("div");
    c.className = "emg-card";
    c.innerHTML =
      '<div class="emg-blood">' + r.bloodType + '</div>' +
      '<div class="emg-patient">' + r.patient + '</div>' +
      '<div class="emg-detail"><strong>Location:</strong> ' + r.hospital + '</div>' +
      '<div class="emg-detail"><strong>Units needed:</strong> ' + r.units + '</div>' +
      (r.note ? '<div class="emg-note">' + r.note + '</div>' : '') +
      '<a class="emg-call" href="tel:' + r.contact + '">Call: ' + r.contact + '</a>' +
      '<div class="emg-time">' + timeAgo(r.postedAt) + '</div>';
    board.appendChild(c);
  });
}

function handleEmergency(e) {
  e.preventDefault();

  const fields = [
    { id:"emg-patient",  err:"err-emg-patient",  msg:"Patient name is required" },
    { id:"emg-blood",    err:"err-emg-blood",    msg:"Blood type is required" },
    { id:"emg-hospital", err:"err-emg-hospital", msg:"Hospital or location is required" },
    { id:"emg-units",    err:"err-emg-units",    msg:"Number of units is required" },
    { id:"emg-contact",  err:"err-emg-contact",  msg:"Contact number is required" }
  ];

  let ok = true;
  fields.forEach(f => {
    document.getElementById(f.err).textContent = "";
    document.getElementById(f.id).classList.remove("error");
  });
  fields.forEach(f => {
    const el = document.getElementById(f.id);
    if (!el.value.trim()) {
      document.getElementById(f.err).textContent = f.msg;
      el.classList.add("error");
      ok = false;
    }
  });

  if (!ok) return;

  const req = {
    patient:   document.getElementById("emg-patient").value.trim(),
    bloodType: document.getElementById("emg-blood").value,
    hospital:  document.getElementById("emg-hospital").value.trim(),
    units:     document.getElementById("emg-units").value,
    contact:   document.getElementById("emg-contact").value.trim(),
    note:      document.getElementById("emg-note").value.trim(),
    postedAt:  new Date().toISOString()
  };

  const list = loadEmergencies();
  list.push(req);
  saveEmergencies(list);
  renderEmergencyBoard();

  showFeedback("emg-feedback", "Emergency request posted. Donors can now see it.", "ok");
  document.getElementById("emergency-form").reset();
  showToast("Emergency request posted.");
}

// ELIGIBILITY CHECKER 

function handleEligibility(e) {
  e.preventDefault();

  const age      = parseInt(document.getElementById("elig-age").value, 10);
  const weight   = parseInt(document.getElementById("elig-weight").value, 10);
  const well     = document.querySelector('input[name="elig-well"]:checked');
  const donated  = document.querySelector('input[name="elig-donated"]:checked');
  const tattoo   = document.querySelector('input[name="elig-tattoo"]:checked');
  const pregnant = document.querySelector('input[name="elig-pregnant"]:checked');
  const meds     = document.querySelector('input[name="elig-meds"]:checked');

  // Make sure all questions are answered
  const incomplete = [];
  if (!age    || isNaN(age))    incomplete.push("Please enter your age.");
  if (!weight || isNaN(weight)) incomplete.push("Please enter your weight.");
  if (!well)      incomplete.push("Please answer the health question.");
  if (!donated)   incomplete.push("Please answer the recent donation question.");
  if (!tattoo)    incomplete.push("Please answer the tattoo question.");
  if (!pregnant)  incomplete.push("Please answer the pregnancy question.");
  if (!meds)      incomplete.push("Please answer the medications question.");

  if (incomplete.length) {
    showResult("warn", "Please complete all questions", "Answer every question above to get your result.", incomplete);
    document.getElementById("elig-result").classList.remove("hidden");
    return;
  }

  // Run through eligibility rules
  const reasons = [];
  if (age < 17)               reasons.push("You must be at least 17 years old to donate.");
  if (age > 65)               reasons.push("Most blood banks require donors to be under 65. Check with your local center.");
  if (weight < 50)            reasons.push("You must weigh at least 50 kg to donate safely.");
  if (well.value === "no")    reasons.push("You must be feeling completely well on the day of donation.");
  if (donated.value === "yes") reasons.push("You must wait at least 56 days between whole blood donations.");
  if (tattoo.value === "yes") reasons.push("A tattoo or piercing within 3 months may require a waiting period.");
  if (pregnant.value === "yes") reasons.push("You cannot donate if pregnant or if you gave birth in the last 6 months.");
  if (meds.value === "yes")   reasons.push("Antibiotics or blood thinners may temporarily prevent donation.");

  if (!reasons.length) {
    showResult("ok", "You appear eligible to donate!", "You meet the basic criteria. Visit your nearest blood bank today.", []);
  } else {
    showResult("no", "You may not be eligible right now", "One or more conditions may prevent you from donating today.", reasons);
  }

  document.getElementById("elig-result").classList.remove("hidden");
}

function showResult(type, title, body, reasons) {
  const icons = { ok: "OK", no: "X", warn: "!" };
  const iconEl = document.getElementById("result-icon");
  iconEl.textContent = icons[type] || "?";
  iconEl.className   = "result-icon " + type;

  const titleEl = document.getElementById("result-title");
  titleEl.textContent = title;
  titleEl.className   = type;

  document.getElementById("result-body").textContent = body;

  const ul = document.getElementById("result-reasons");
  ul.innerHTML = "";
  reasons.forEach(r => {
    const li = document.createElement("li");
    li.textContent = r;
    ul.appendChild(li);
  });
}

// DONATION TRACKER 

function loadLog()     { return JSON.parse(localStorage.getItem("bl_log") || "[]"); }
function saveLog(log)  { localStorage.setItem("bl_log", JSON.stringify(log)); }

function renderTracker() {
  const log    = loadLog();
  const histEl = document.getElementById("tracker-history");
  const dateEl = document.getElementById("eligible-date");
  const subEl  = document.getElementById("eligible-sub");
  const wrap   = document.getElementById("eligible-bar-wrap");
  const fill   = document.getElementById("eligible-bar");
  const endEl  = document.getElementById("bar-end");

  histEl.innerHTML = "";

  if (!log.length) {
    histEl.innerHTML = '<p class="tracker-empty">No donations logged yet. Use the form to add your first donation.</p>';
    dateEl.textContent = "No donations logged";
    subEl.textContent  = "";
    wrap.classList.add("hidden");
    return;
  }

  // Show history sorted newest first
  [...log].sort((a, b) => new Date(b.date) - new Date(a.date)).forEach((entry, i) => {
    const row = document.createElement("div");
    row.className = "history-row";
    row.style.animationDelay = (i * 0.05) + "s";
    row.innerHTML =
      '<div class="avatar">' + (entry.type ? entry.type[0] : "B") + '</div>' +
      '<div class="recent-info">' +
        '<div class="history-type">' + entry.type + '</div>' +
        '<div class="history-meta">' + (entry.location || "Location not specified") + '</div>' +
      '</div>' +
      '<div class="history-date">' + fmtDate(entry.date.replace(/-/g,"")) + '</div>' +
      '<button class="del-btn" data-id="' + entry.id + '">x</button>';
    histEl.appendChild(row);
  });

  // Delete entry buttons
  histEl.querySelectorAll(".del-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const updated = log.filter(e => e.id !== parseInt(btn.dataset.id, 10));
      saveLog(updated);
      renderTracker();
      showToast("Entry removed.");
    });
  });

  // Work out the next eligible date from the most recent donation
  const latest   = [...log].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  const wait     = WAIT[latest.type] || 56;
  const donDate  = new Date(latest.date);
  const nextDate = new Date(donDate);
  nextDate.setDate(nextDate.getDate() + wait);

  const today    = new Date();
  const diffDays = Math.ceil((nextDate - today) / 86400000);

  if (diffDays <= 0) {
    dateEl.textContent = "You are eligible now";
    subEl.textContent  = Math.abs(diffDays) + " day(s) since eligibility";
    setTimeout(() => fill.style.width = "100%", 100);
  } else {
    dateEl.textContent = nextDate.toLocaleDateString("en-US", { month:"long", day:"numeric", year:"numeric" });
    subEl.textContent  = diffDays + " day" + (diffDays !== 1 ? "s" : "") + " from today";
    const pct = Math.min(100, Math.round(((wait - diffDays) / wait) * 100));
    setTimeout(() => fill.style.width = pct + "%", 100);
  }

  endEl.textContent = wait + " days";
  wrap.classList.remove("hidden");
}

function handleTracker(e) {
  e.preventDefault();

  const dateEl = document.getElementById("track-date");
  const errEl  = document.getElementById("err-track-date");
  errEl.textContent = "";
  dateEl.classList.remove("error");

  if (!dateEl.value) {
    errEl.textContent = "Please select the donation date.";
    dateEl.classList.add("error");
    return;
  }

  if (new Date(dateEl.value) > new Date()) {
    errEl.textContent = "Donation date cannot be in the future.";
    dateEl.classList.add("error");
    return;
  }

  const entry = {
    id:       Date.now(),
    date:     dateEl.value,
    type:     document.getElementById("track-type").value,
    location: document.getElementById("track-location").value.trim()
  };

  const log = loadLog();
  log.push(entry);
  saveLog(log);
  renderTracker();

  showFeedback("track-feedback", "Donation logged. Your next eligible date has been updated.", "ok");
  document.getElementById("tracker-form").reset();
  showToast("Donation logged.");
}

// COMPATIBILITY CARDS 

function renderCompat() {
  const grid = document.getElementById("compatibility-grid");
  grid.innerHTML = "";
  COMPAT.forEach(item => {
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

// NAVIGATION 
function goTo(pageId) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll('[data-page="' + pageId + '"]').forEach(el => el.classList.add("active"));

  const page = document.getElementById("page-" + pageId);
  if (page) page.classList.add("active");

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setupNav() {
  document.querySelectorAll("[data-page]").forEach(el => {
    el.addEventListener("click", e => {
      e.preventDefault();
      const pg = el.dataset.page;
      if (pg) goTo(pg);
    });
  });
}

// HELPERS 

function showToast(msg) {
  const t = document.getElementById("toast");
  document.getElementById("toast-msg").textContent = msg;
  t.classList.remove("hidden");
  t.classList.add("show");
  setTimeout(() => {
    t.classList.remove("show");
    setTimeout(() => t.classList.add("hidden"), 250);
  }, 3000);
}

function showFeedback(id, msg, type) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.className   = "feedback " + type;
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 6000);
}

function cut(text, max) {
  return text.length <= max ? text : text.slice(0, max).trim() + "...";
}

function fmtDate(str) {
  if (!str || str.length < 8) return str;
  const d = new Date(str.slice(0,4) + "-" + str.slice(4,6) + "-" + str.slice(6,8));
  return d.toLocaleDateString("en-US", { year:"numeric", month:"short", day:"numeric" });
}

function timeAgo(iso) {
  const mins = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (mins < 1)  return "Just now";
  if (mins < 60) return mins + " minute" + (mins !== 1 ? "s" : "") + " ago";
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return hrs + " hour" + (hrs !== 1 ? "s" : "") + " ago";
  return Math.floor(hrs / 24) + " days ago";
}

function animateCount(id, target) {
  const el   = document.getElementById(id);
  const step = Math.max(1, Math.floor(target / 25));
  let n = 0;
  const iv = setInterval(() => {
    n = Math.min(n + step, target);
    el.textContent = n;
    if (n >= target) clearInterval(iv);
  }, 40);
}

// INIT 

async function init() {
  loadDonors();
  filteredDonors = [...allDonors];

  setupNav();
  await loadCountries();

  renderCompat();
  renderDashboard();
  renderEmergencyBoard();
  renderTracker();
  sortDonors();
  renderDonors();

  animateCount("stat-total",     allDonors.length);
  animateCount("stat-available", allDonors.filter(d => d.available).length);

  // Global search bar triggers filter and navigates to Find Donors
  document.getElementById("apply-filters").addEventListener("click", applyFilters);
  document.getElementById("search-name").addEventListener("keydown", e => {
    if (e.key === "Enter") applyFilters();
  });

  // Find Donors filter and sort
  document.getElementById("clear-filters").addEventListener("click", () => {
    ["filter-blood-type","filter-country","filter-available"].forEach(id => document.getElementById(id).value = "");
    document.getElementById("search-name").value = "";
    document.getElementById("results-heading").textContent = "All Donors";
    filteredDonors = [...allDonors];
    sortDonors();
    renderDonors();
  });

  document.querySelectorAll(".chip").forEach(btn => {
    btn.addEventListener("click", () => {
      const s = btn.dataset.sort;
      if (s === currentSort) sortAsc = !sortAsc;
      else { currentSort = s; sortAsc = true; }
      document.querySelectorAll(".chip").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      sortDonors();
      renderDonors();
    });
  });

  //  auto-filter in case dropdowns change on the find page
  ["filter-blood-type","filter-country","filter-available"].forEach(id => {
    document.getElementById(id).addEventListener("change", applyFilters);
  });

  // Registration form
  document.getElementById("register-form").addEventListener("submit", handleRegister);
  document.getElementById("reg-available").addEventListener("change", function() {
    document.getElementById("toggle-text").textContent = this.checked ? "Yes, I am available" : "No, not right now";
  });

  // Emergency form
  document.getElementById("emergency-form").addEventListener("submit", handleEmergency);

  // Eligibility checker
  document.getElementById("eligibility-form").addEventListener("submit", handleEligibility);
  document.getElementById("elig-reset").addEventListener("click", () => {
    document.getElementById("elig-result").classList.add("hidden");
    document.getElementById("eligibility-form").reset();
  });

  // Donation tracker
  document.getElementById("tracker-form").addEventListener("submit", handleTracker);
  document.getElementById("track-date").max = new Date().toISOString().split("T")[0];

  // FDA safety search
  document.getElementById("fda-btn").addEventListener("click", () => {
    fetchFDA(document.getElementById("fda-input").value);
  });
  document.getElementById("fda-input").addEventListener("keydown", e => {
    if (e.key === "Enter") fetchFDA(document.getElementById("fda-input").value);
  });
}

document.addEventListener("DOMContentLoaded", init);