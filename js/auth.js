// auth.js — user accounts, admin login, session management
// Admin: admin@bloodlink.com / admin123

var ADMIN_EMAIL = "admin@bloodlink.com";
var ADMIN_PASS  = "admin123";
var currentUser = null;

function getCurrentUser() { return currentUser; }
function isAdmin()        { return !!(currentUser && currentUser.role === "admin"); }
function isLoggedIn()     { return currentUser !== null; }

function loadSession() {
  const s = db_get("session");
  if (s) currentUser = s;
}

function signUp(name, email, password) {
  if (email === ADMIN_EMAIL) return { ok:false, msg:"This email is reserved." };
  const users = getUsers();
  if (users.find(u => u.email === email)) return { ok:false, msg:"An account with this email already exists." };
  const user = { id:Date.now(), name, email, password, role:"user", joined:new Date().toISOString() };
  users.push(user);
  saveUsers(users);
  currentUser = { id:user.id, name:user.name, email:user.email, role:"user" };
  db_set("session", currentUser);
  return { ok:true };
}

function signIn(email, password) {
  if (email === ADMIN_EMAIL && password === ADMIN_PASS) {
    currentUser = { id:0, name:"Admin", email:ADMIN_EMAIL, role:"admin" };
    db_set("session", currentUser);
    return { ok:true, role:"admin" };
  }
  const user = getUsers().find(u => u.email === email && u.password === password);
  if (!user) return { ok:false, msg:"Incorrect email or password." };
  currentUser = { id:user.id, name:user.name, email:user.email, role:"user" };
  db_set("session", currentUser);
  return { ok:true, role:"user" };
}

function signOut() {
  currentUser = null;
  localStorage.removeItem("bl_session");
}