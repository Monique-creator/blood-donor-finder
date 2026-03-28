// data.js — constants, seed data, localStorage helpers

var COUNTRIES_API = "https://restcountries.com/v3.1/all?fields=name,cca2";
var FDA_API       = "https://api.fda.gov/drug/enforcement.json";

var WAIT_DAYS = { "Whole Blood":56, "Platelets":7, "Plasma":28, "Double Red Cells":112 };

var BLOOD_COMPAT = [
  { type:"A+",  donateTo:"A+, AB+",                    receiveFrom:"A+, A-, O+, O-" },
  { type:"A-",  donateTo:"A+, A-, AB+, AB-",           receiveFrom:"A-, O-" },
  { type:"B+",  donateTo:"B+, AB+",                    receiveFrom:"B+, B-, O+, O-" },
  { type:"B-",  donateTo:"B+, B-, AB+, AB-",           receiveFrom:"B-, O-" },
  { type:"AB+", donateTo:"AB+ only",                   receiveFrom:"All types (Universal Recipient)" },
  { type:"AB-", donateTo:"AB+, AB-",                   receiveFrom:"AB-, A-, B-, O-" },
  { type:"O+",  donateTo:"A+, B+, O+, AB+",            receiveFrom:"O+, O-" },
  { type:"O-",  donateTo:"All types (Universal Donor)", receiveFrom:"O- only" }
];

// 20 sample donors — used on first load before any real donors register
var SEED_DONORS = [
  { id:1,  name:"Amara Diallo",      age:28, bloodType:"O+",  country:"Rwanda",       city:"Kigali",        phone:"+250 788 100 200", available:true  },
  { id:2,  name:"James Owusu",       age:34, bloodType:"A+",  country:"Ghana",        city:"Accra",         phone:"+233 24 555 6789", available:true  },
  { id:3,  name:"Fatima Nkosi",      age:25, bloodType:"B-",  country:"South Africa", city:"Johannesburg",  phone:"+27 82 333 4567",  available:false },
  { id:4,  name:"Emmanuel Mensah",   age:31, bloodType:"AB+", country:"Nigeria",      city:"Lagos",         phone:"+234 803 456 789", available:true  },
  { id:5,  name:"Chloe Andrianaivo", age:27, bloodType:"O-",  country:"Madagascar",   city:"Antananarivo",  phone:"+261 32 100 2200", available:true  },
  { id:6,  name:"Samuel Bekele",     age:22, bloodType:"A-",  country:"Ethiopia",     city:"Addis Ababa",   phone:"+251 91 234 567",  available:false },
  { id:7,  name:"Grace Mutua",       age:30, bloodType:"B+",  country:"Kenya",        city:"Nairobi",       phone:"+254 711 223 344", available:true  },
  { id:8,  name:"David Osei",        age:26, bloodType:"AB-", country:"Ghana",        city:"Kumasi",        phone:"+233 20 987 654",  available:true  },
  { id:9,  name:"Monique Uwimana",   age:24, bloodType:"A+",  country:"Rwanda",       city:"Huye",          phone:"+250 722 300 400", available:true  },
  { id:10, name:"Kwame Asante",      age:29, bloodType:"O+",  country:"Ghana",        city:"Tamale",        phone:"+233 20 111 223",  available:false },
  { id:11, name:"Aisha Diallo",      age:32, bloodType:"B+",  country:"Senegal",      city:"Dakar",         phone:"+221 77 432 110",  available:true  },
  { id:12, name:"Pierre Nkurunziza", age:35, bloodType:"AB+", country:"Burundi",      city:"Bujumbura",     phone:"+257 79 500 600",  available:true  },
  { id:13, name:"Leila Hassan",      age:23, bloodType:"O-",  country:"Tanzania",     city:"Dar es Salaam", phone:"+255 754 123 456", available:true  },
  { id:14, name:"Clement Habimana",  age:28, bloodType:"A-",  country:"Rwanda",       city:"Musanze",       phone:"+250 788 999 001", available:false },
  { id:15, name:"Aminata Camara",    age:21, bloodType:"B-",  country:"Guinea",       city:"Conakry",       phone:"+224 622 300 100", available:true  },
  { id:16, name:"John Mutabazi",     age:33, bloodType:"O+",  country:"Uganda",       city:"Kampala",       phone:"+256 700 112 233", available:true  },
  { id:17, name:"Sylvie Irakoze",    age:27, bloodType:"A+",  country:"Rwanda",       city:"Rubavu",        phone:"+250 788 400 500", available:true  },
  { id:18, name:"Kofi Boateng",      age:30, bloodType:"AB-", country:"Ghana",        city:"Cape Coast",    phone:"+233 24 777 889",  available:false },
  { id:19, name:"Halima Traore",     age:26, bloodType:"B+",  country:"Ivory Coast",  city:"Abidjan",       phone:"+225 07 123 456",  available:true  },
  { id:20, name:"Eric Nshimiyimana", age:31, bloodType:"O-",  country:"Rwanda",       city:"Nyagatare",     phone:"+250 788 600 700", available:true  }
];

// localStorage wrappers
function db_get(key)        { return JSON.parse(localStorage.getItem("bl_" + key) || "null"); }
function db_set(key, value) { localStorage.setItem("bl_" + key, JSON.stringify(value)); }

// On first visit there is nothing saved yet — return seeds and save them immediately
function getDonors() {
  let list = db_get("donors");
  if (!list || !list.length) {
    list = [...SEED_DONORS];
    db_set("donors", list); // save seeds so they persist
  }
  return list;
}

function saveDonors(list)      { db_set("donors", list); }
function getUsers()            { return db_get("users")    || []; }
function saveUsers(list)       { db_set("users", list); }
function getRequests()         { return db_get("requests") || []; }
function saveRequests(list)    { db_set("requests", list); }
function getDonationLog()      { return db_get("log")      || []; }
function saveDonationLog(list) { db_set("log", list); }

function fmtDate(str) {
  if (!str || str.length < 8) return str;
  const d = new Date(str.slice(0,4) + "-" + str.slice(4,6) + "-" + str.slice(6,8));
  return d.toLocaleDateString("en-US", { year:"numeric", month:"short", day:"numeric" });
}

function timeAgo(iso) {
  const mins = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return mins + "m ago";
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return hrs + "h ago";
  return Math.floor(hrs / 24) + "d ago";
}

function cut(text, max) {
  return text.length <= max ? text : text.slice(0, max).trim() + "...";
}

function el(id) { return document.getElementById(id); }
function setText(id, val) { const e = el(id); if (e) e.textContent = val; }