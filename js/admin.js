// admin.js — admin panel, records management
// Admin login: admin@bloodlink.com / admin123

function renderAdminPanel() {
  const donors   = getDonors();
  const users    = getUsers();
  const requests = getRequests();
  setText("admin-stat-donors",    donors.length);
  setText("admin-stat-available", donors.filter(d => d.available).length);
  setText("admin-stat-users",     users.length);
  setText("admin-stat-requests",  requests.length);
  renderDonorTable();
  renderUserTable();
  renderRequestTable();
}

function renderDonorTable() {
  const tbody = el("donor-table-body");
  if (!tbody) return;
  tbody.innerHTML = "";
  getDonors().forEach(d => {
    const tr = document.createElement("tr");
    tr.innerHTML =
      '<td>' + d.id + '</td><td>' + d.name + '</td>' +
      '<td><span class="tbl-badge">' + d.bloodType + '</span></td>' +
      '<td>' + d.age + '</td><td>' + d.city + ', ' + d.country + '</td>' +
      '<td>' + d.phone + '</td>' +
      '<td><span class="avail-pill ' + (d.available?"yes":"no") + '">' + (d.available?"Available":"Unavailable") + '</span></td>' +
      '<td class="tbl-actions">' +
        '<button class="tbl-edit" data-id="' + d.id + '">Edit</button>' +
        '<button class="tbl-delete" data-id="' + d.id + '">Delete</button>' +
      '</td>';
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll(".tbl-edit").forEach(b =>
    b.addEventListener("click", () => openEditModal(parseInt(b.dataset.id))));
  tbody.querySelectorAll(".tbl-delete").forEach(b =>
    b.addEventListener("click", () => {
      if (!confirm("Delete this donor record?")) return;
      deleteDonor(parseInt(b.dataset.id));
      renderAdminPanel();
      showToast("Donor deleted.");
    }));
}

function renderUserTable() {
  const tbody = el("user-table-body");
  if (!tbody) return;
  tbody.innerHTML = "";
  const users = getUsers();
  if (!users.length) { tbody.innerHTML = '<tr><td colspan="4" class="tbl-empty">No registered users yet.</td></tr>'; return; }
  users.forEach(u => {
    const tr = document.createElement("tr");
    tr.innerHTML = '<td>' + u.id + '</td><td>' + u.name + '</td><td>' + u.email + '</td>' +
      '<td>' + new Date(u.joined).toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric"}) + '</td>';
    tbody.appendChild(tr);
  });
}

function renderRequestTable() {
  const tbody = el("req-table-body");
  if (!tbody) return;
  tbody.innerHTML = "";
  const requests = getRequests();
  if (!requests.length) { tbody.innerHTML = '<tr><td colspan="7" class="tbl-empty">No blood requests yet.</td></tr>'; return; }
  [...requests].reverse().forEach((r, i) => {
    const realIdx = requests.length - 1 - i;
    const tr = document.createElement("tr");
    tr.innerHTML =
      '<td><span class="tbl-badge">' + r.bloodType + '</span></td>' +
      '<td>' + r.patient + '</td><td>' + r.hospital + '</td>' +
      '<td>' + r.units + '</td><td>' + r.contact + '</td>' +
      '<td>' + timeAgo(r.postedAt) + '</td>' +
      '<td><button class="tbl-delete" data-idx="' + realIdx + '">Remove</button></td>';
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll(".tbl-delete").forEach(b =>
    b.addEventListener("click", () => {
      const all = getRequests(); all.splice(parseInt(b.dataset.idx), 1);
      saveRequests(all); renderAdminPanel(); showToast("Request removed.");
    }));
}

function openEditModal(id) {
  const donor = getDonors().find(d => d.id === id);
  if (!donor) return;
  el("edit-id").value          = donor.id;
  el("edit-name").value        = donor.name;
  el("edit-age").value         = donor.age;
  el("edit-blood").value       = donor.bloodType;
  el("edit-city").value        = donor.city;
  el("edit-phone").value       = donor.phone;
  el("edit-available").checked = donor.available;
  const sel = el("edit-country");
  for (let i = 0; i < sel.options.length; i++) {
    if (sel.options[i].value === donor.country) { sel.selectedIndex = i; break; }
  }
  el("edit-modal").classList.remove("hidden");
}

function saveEditDonor() {
  const id = parseInt(el("edit-id").value);
  const changes = {
    name:      el("edit-name").value.trim(),
    age:       parseInt(el("edit-age").value, 10),
    bloodType: el("edit-blood").value,
    country:   el("edit-country").value,
    city:      el("edit-city").value.trim(),
    phone:     el("edit-phone").value.trim(),
    available: el("edit-available").checked
  };
  if (!changes.name || !changes.bloodType || !changes.city || !changes.phone) {
    showToast("Please fill in all required fields."); return;
  }
  updateDonor(id, changes);
  el("edit-modal").classList.add("hidden");
  renderAdminPanel();
  showToast("Record updated successfully.");
}

function handleAdminAddDonor(e) {
  e.preventDefault();
  const name  = el("admin-add-name").value.trim();
  const age   = parseInt(el("admin-add-age").value, 10);
  const blood = el("admin-add-blood").value;
  const cntry = el("admin-add-country").value;
  const city  = el("admin-add-city").value.trim();
  const phone = el("admin-add-phone").value.trim();
  const avail = el("admin-add-available").checked;
  if (!name || !blood || !cntry || !city || !phone || isNaN(age)) {
    showToast("Please fill in all fields."); return;
  }
  if (age < 18 || age > 65) { showToast("Age must be between 18 and 65."); return; }
  addDonor({ name, age, bloodType:blood, country:cntry, city, phone, available:avail });
  renderAdminPanel();
  showFeedback("admin-add-feedback", "Donor record added successfully.", "ok");
  document.getElementById("admin-add-form").reset();
}