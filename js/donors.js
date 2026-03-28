// donors.js — donor list state, filtering, sorting, card building

var allDonors      = [];
var filteredDonors = [];
var currentSort    = "name";
var sortAsc        = true;
var nextDonorId    = 21;

// Load donors from storage (seeds on first visit)
function initDonors() {
  allDonors      = getDonors();
  nextDonorId    = allDonors.reduce((m, d) => Math.max(m, d.id), 0) + 1;
  filteredDonors = [...allDonors];
  sortDonors();
}

function addDonor(data) {
  data.id = nextDonorId++;
  allDonors.unshift(data);
  saveDonors(allDonors);
  filteredDonors = [...allDonors];
  sortDonors();
}

function deleteDonor(id) {
  allDonors      = allDonors.filter(d => d.id !== id);
  filteredDonors = filteredDonors.filter(d => d.id !== id);
  saveDonors(allDonors);
}

function updateDonor(id, changes) {
  allDonors = allDonors.map(d => d.id === id ? Object.assign({}, d, changes) : d);
  saveDonors(allDonors);
}

function buildDonorCard(donor) {
  const div   = document.createElement("div");
  div.className = "donor-card";
  const phone = isLoggedIn()
    ? '<a class="call-btn" href="tel:' + donor.phone + '">' + donor.phone + '</a>'
    : '<div class="locked-phone" data-action="open-auth">Sign in to view contact</div>';

  div.innerHTML =
    '<div class="card-top">' +
      '<div class="avatar">' + donor.name[0] + '</div>' +
      '<span class="blood-badge">' + donor.bloodType + '</span>' +
    '</div>' +
    '<div class="donor-name">' + donor.name + '</div>' +
    '<div class="donor-detail">Location: ' + donor.city + ', ' + donor.country + '</div>' +
    '<div class="donor-detail">Age: ' + donor.age + '</div>' +
    '<span class="avail-badge ' + (donor.available ? "yes" : "no") + '">' +
      '<span class="avail-dot"></span>' + (donor.available ? "Available now" : "Not available") +
    '</span>' + phone;
  return div;
}

function renderDonors() {
  const grid  = el("donor-grid");
  const empty = el("empty-state");
  const count = el("results-count");
  if (!grid) return;

  grid.innerHTML = "";

  if (!filteredDonors.length) {
    if (empty) empty.classList.remove("hidden");
    if (count) count.textContent = "";
    return;
  }

  if (empty) empty.classList.add("hidden");
  if (count) count.textContent = filteredDonors.length + " of " + allDonors.length + " donors";

  filteredDonors.forEach((d, i) => {
    const c = buildDonorCard(d);
    c.style.animationDelay = (i * 0.04) + "s";
    grid.appendChild(c);
  });
}

function applyDonorFilters() {
  const bt   = (el("filter-blood-type") || {}).value || "";
  const co   = (el("filter-country")    || {}).value || "";
  const av   = (el("filter-available")  || {}).value || "";
  const name = ((el("search-name")      || {}).value || "").trim().toLowerCase();

  filteredDonors = allDonors.filter(d => {
    if (bt && d.bloodType !== bt) return false;
    if (co && d.country   !== co) return false;
    if (av === "yes" && !d.available) return false;
    if (av === "no"  &&  d.available) return false;
    if (name &&
        !d.name.toLowerCase().includes(name) &&
        !d.city.toLowerCase().includes(name) &&
        !d.bloodType.toLowerCase().includes(name)) return false;
    return true;
  });

  sortDonors();
  renderDonors();
}

function sortDonors() {
  filteredDonors.sort((a, b) => {
    const va = String(a[currentSort] || "").toLowerCase();
    const vb = String(b[currentSort] || "").toLowerCase();
    return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
  });
}