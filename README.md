BloodLink - Blood Donor Finder
Connecting blood donors with patients who need them — instantly and directly.
BloodLink is a web application that helps patients, families, and hospitals find blood donors quickly. Users can search and filter donors by blood type, country, and availability. Donors can register themselves, post urgent blood requests, check their eligibility, track their donations, and view live FDA blood product safety notices.

Live Deployment
Server
URL
Role
Web01
http://3.82.193.211
Primary web server
Web02
http://44.212.20.80
Secondary web server
Load Balancer
http://54.86.103.142
Distributes traffic between servers

GitHub Repository: https://github.com/Monique-creator/blood-donor-finder

Admin Access (for graders)
Field
Value
Email
admin@bloodlink.com
Password
admin123

The Admin Panel tab appears in the navbar after logging in as admin. It provides full access to donor records, blood requests, and registered users with the ability to add, edit, and delete records.

Features
For Visitors (no account needed)
Browse the donor list and see blood type, location, and availability
View urgent blood requests posted by hospitals and families
Check blood type compatibility guide
Search FDA blood product safety notices
For Registered Users
View donor phone numbers and contact donors directly
Register as a blood donor
Post urgent blood requests
Check personal donation eligibility
Track personal donation history
For Admin
View and manage all donor records in a table
Add new donor records directly
Edit or delete any donor record
View and remove blood requests
View all registered user accounts

External APIs Used
1. REST Countries API
URL: https://restcountries.com
Documentation: https://restcountries.com/#api-endpoints-v3
Purpose: Fetches the full list of world countries to populate all country dropdowns in the app
API Key Required: No — completely free and open
2. OpenFDA API
URL: https://open.fda.gov
Documentation: https://open.fda.gov/apis/drug/enforcement/
Purpose: Fetches live blood product recall and enforcement notices from the U.S. FDA
API Key Required: Yes — free, no credit card needed
Get your key: https://open.fda.gov/apis/authentication/

API Key Security
The OpenFDA API key is stored in config.js which is listed in .gitignore and never committed to GitHub. The repository only contains config.example.js as a safe placeholder.
config.js          <- your real key, never committed
config.example.js  <- safe placeholder committed to GitHub
.gitignore         <- explicitly excludes config.js


Project Structure
blood-donor-finder/
├── index.html            Main HTML — all pages in one file
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


How to Run Locally
No build tools or npm required. Plain HTML, CSS, and JavaScript.
Step 1 — Clone the repository
git clone https://github.com/Monique-creator/blood-donor-finder.git
cd blood-donor-finder

Step 2 — Add your API key
cp config.example.js config.js

Open config.js and replace the placeholder with your real OpenFDA key.
Step 3 — Open with Live Server
In VS Code, right-click index.html and choose Open with Live Server.
Do not open by double-clicking — the Countries API requires HTTP, not file://.

Deployment
Upload to Web Servers
# Web01
scp -i ~/.ssh/school index.html ubuntu@3.82.193.211:/var/www/html/
scp -i ~/.ssh/school config.js ubuntu@3.82.193.211:/var/www/html/
scp -i ~/.ssh/school -r css/ js/ ubuntu@3.82.193.211:/var/www/html/

# Web02
scp -i ~/.ssh/school index.html ubuntu@44.212.20.80:/var/www/html/
scp -i ~/.ssh/school config.js ubuntu@44.212.20.80:/var/www/html/
scp -i ~/.ssh/school -r css/ js/ ubuntu@44.212.20.80:/var/www/html/

Load Balancer Nginx Config
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


Challenges and Solutions
Challenge
Solution
JS variables not shared across script files
Changed const/let to var for all globals
API key security
Stored in gitignored config.js
Countries dropdown empty when API slow
Applied 135+ country fallback list instantly before API call
LocalStorage corrupted from old app versions
Clear with localStorage.clear() in browser console
HAProxy conflict on port 80
Stopped with sudo systemctl stop haproxy
Server file permissions
Fixed with sudo chown -R ubuntu:ubuntu /var/www/html/
CORS when opening file directly
Always use Live Server, never open as file://


Credits
Country data: REST Countries API — https://restcountries.com
Safety data: OpenFDA API — https://open.fda.gov
Compatibility data: American Red Cross — https://www.redcrossblood.org
Font: Nunito via Google Fonts — https://fonts.google.com

Author
Monique Niyobyose — 2026