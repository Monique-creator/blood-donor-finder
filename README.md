# 🩸 BloodLink — Blood Donor Finder

BloodLink is a web app I built to help people find blood donors quickly. The idea is simple — when someone needs blood urgently, they should be able to find a compatible donor nearby without going through a hospital system. Visitors can search donors by blood type and location, post urgent requests, and donors can register themselves directly on the platform.

## 🎥 Demo Video

https://www.loom.com/share/b89c2b1557ac4ccb82614b3afe48d05b

##  Live URLs

| | URL |
|-|-----|
| Main site (HTTPS) | https://moniqueniyobyose.tech |
| Web Server 1 | http://3.82.193.211 |
| Web Server 2 | http://44.212.20.80 |
| Load Balancer | http://54.86.103.142 |

## Admin Login

```
Email:    admin@bloodlink.com
Password: admin123
```

> **Note for graders:** These credentials are hardcoded intentionally for demo purposes. This is a frontend-only application with no real backend — all data is stored in the browser's localStorage. In a real production app, admin accounts would be managed on a secure backend server with hashed passwords and proper authentication.



##  Features

- Search and filter donors by blood type, country, and availability
- Register as a blood donor
- Post urgent blood requests that all visitors can see
- Check if you are eligible to donate today
- Track your personal donation history
- Search live FDA blood product recall notices
- Blood type compatibility guide
- Dark and light mode toggle
- Phone numbers hidden from guests — only visible after signing in
- Full admin panel to manage donors, requests, and users

---

## Tech Stack

- HTML5, CSS3, Vanilla JavaScript
- Split into 5 JS files by responsibility
- localStorage for data persistence (no backend needed)
- Nginx on all three servers
- Let's Encrypt SSL via Certbot

---

## APIs Used

### 1. REST Countries API
- **Endpoint:** `https://restcountries.com/v3.1/all?fields=name,cca2`
- **Docs:** https://restcountries.com
- **Key required:** No
- **What it does:** Fills every country dropdown in the app with all 195 countries fetched live. If the API fails, a built-in fallback list of 135 countries loads instantly so dropdowns are never empty.

### 2 OpenFDA Drug Enforcement API
- **Endpoint:** `https://api.fda.gov/drug/enforcement.json`
- **Docs:** https://open.fda.gov/apis/drug/enforcement/
- **Key required:** Yes — free at https://open.fda.gov/apis/authentication/
- **What it does:** Fetches real blood product recall notices from the U.S. FDA. Users search by keyword and see live results with product names, recall reasons, and dates.

---

##  API Key Security

The OpenFDA key lives in `config.js` which is in `.gitignore` so it never reaches GitHub. The repo has `config.example.js` as a safe placeholder instead.

```
config.js          ← real API key — gitignored, never on GitHub
config.example.js  ← safe placeholder committed to GitHub
.gitignore         ← explicitly excludes config.js
```

---

## Running Locally

1. Clone the repo and `cd` into it
2. Copy `config.example.js` to `config.js` and add your OpenFDA key
3. Right-click `index.html` in VS Code → **Open with Live Server**

> Don't open the file by double-clicking — the Countries API needs HTTP to work, not `file://`

---

##  Deployment

### Upload to servers
```bash
# Fix permissions
ssh -i ~/.ssh/school ubuntu@3.82.193.211 "sudo chown -R ubuntu:ubuntu /var/www/html/"
ssh -i ~/.ssh/school ubuntu@44.212.20.80 "sudo chown -R ubuntu:ubuntu /var/www/html/"

# Web01
scp -i ~/.ssh/school index.html config.js ubuntu@3.82.193.211:/var/www/html/
scp -i ~/.ssh/school -r css/ js/ ubuntu@3.82.193.211:/var/www/html/

# Web02
scp -i ~/.ssh/school index.html config.js ubuntu@44.212.20.80:/var/www/html/
scp -i ~/.ssh/school -r css/ js/ ubuntu@44.212.20.80:/var/www/html/
```

### Load balancer Nginx config
```nginx
upstream bloodlink_servers {
    server 3.82.193.211;
    server 44.212.20.80;
}
server {
    listen 80;
    server_name moniqueniyobyose.tech www.moniqueniyobyose.tech;
    location / {
        proxy_pass http://bloodlink_servers;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### SSL
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d moniqueniyobyose.tech -d www.moniqueniyobyose.tech
```

### Verify load balancing works
```bash
for i in 1 2 3 4; do curl -s -I http://moniqueniyobyose.tech | grep X-Served-By; done
```

Output alternates between `7030-web-01` and `7030-web-02` confirming round-robin is working.

---

## Architecture

```
            [Users]
               |
   [moniqueniyobyose.tech HTTPS]
               |
      [Load Balancer lb-01]
       54.86.103.142 Nginx
               |
     ┌─────────┴─────────┐
     ↓                   ↓
  [web-01]           [web-02]
3.82.193.211      44.212.20.80
     ↓                   ↓
[REST Countries]    [OpenFDA]
```

---

## Project Structure

```
blood-donor-finder/
├── index.html            All pages in one HTML file
├── config.js             OpenFDA API key (gitignored)
├── config.example.js     Safe placeholder for GitHub
├── .gitignore            Excludes config.js
├── README.md             This file
├── css/
│   └── style.css         All styles — light/dark theme, responsive
└── js/
    ├── data.js           Constants, seed donors, localStorage helpers
    ├── auth.js           User accounts, admin login, session management
    ├── donors.js         Donor state, filtering, sorting, card rendering
    ├── admin.js          Admin panel — records table, edit/delete/add
    └── app.js            Navigation, API calls, event listeners, init
```

---

## Challenges I Faced and their solutions

**Variables not shared across JS files** — `const` and `let` are scoped to their script block and invisible to other files. Switching shared globals to `var` fixed the blank compatibility guide and missing donor data.

**Empty country dropdowns** — Fixed by loading a built-in fallback list immediately on page load, then replacing it with the full API response when it arrives.

**Corrupted localStorage crashing the app** — Old data from previous versions broke JSON parsing on load. Cleared it with `localStorage.clear()` in the browser console.

**HAProxy blocking Nginx on port 80** — Stopped it with `sudo systemctl stop haproxy` before starting Nginx on the load balancer.

**SSL only covering www subdomain** — Re-ran certbot with both `-d moniqueniyobyose.tech` and `-d www.moniqueniyobyose.tech` to cover both.

**File permission errors on upload** — Fixed with `sudo chown -R ubuntu:ubuntu /var/www/html/` before uploading files.

**App not working when opened directly** — Opening `index.html` as `file://` blocks the Countries API due to CORS. Always use Live Server which serves over HTTP.


##  Credits

- REST Countries API — https://restcountries.com
- OpenFDA API — https://open.fda.gov
- Blood type compatibility — American Red Cross https://www.redcrossblood.org
- Nunito font — Google Fonts
- SSL certificate — Let's Encrypt



##  Author

**Monique Niyobyose** — 2026
- GitHub: https://github.com/Monique-creator/blood-donor-finder
- Live App: https://moniqueniyobyose.tech