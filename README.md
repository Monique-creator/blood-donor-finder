BloodLink – Blood Donor Finder

BloodLink is a simple web app that helps people find blood donors quickly. Users can search for donors by blood type, country, and availability, or register themselves as donors. The app also shows real-time blood safety notices using data from the U.S. FDA.

Why this project matters

Blood shortages are a serious problem. BloodLink makes it easier for patients and families to find donors fast, without complicated processes.

It also includes FDA safety updates, so users can see important information about blood products. This makes the app not just useful, but also informative.

APIs Used

1. REST Countries API
Used to get a list of countries (for forms and filters)
No API key needed
Website: https://restcountries.com/

2. OpenFDA API
Used to fetch real blood safety and recall data
Requires a free API key
Get your key: https://open.fda.gov/apis/authentication/
Website: https://open.fda.gov/
API Key Setup

The API key is stored safely in a file called config.js.

config.js → contains your real API key (not uploaded to GitHub)
config.example.js → template file (safe to share)

How to Run the Project

1. Clone the project:
git clone https://github.com/YOUR_USERNAME/blood-donor-finder.git
cd blood-donor-finder

2. Add your API key
cp config.example.js  config.js

Edit config.js:

const CONFIG = {
  OPENFDA_API_KEY: "your_api_key_here"
};

3. Open the app

Option A (recommended):

Use VS Code Live Server
Right-click index.html → Open with Live Server

Option B:

Open index.html directly in your browser
(Some features may not work due to browser restrictions.)

Project Structure
blood-donor-finder/
├── index.html
├── config.js
├── config.example.js
├── css/style.css
├── js/app.js
├── .gitignore
└── README.md

Main Features
Search donors by blood type, country, and availability
Register as a donor
Save donor data in the browser (localStorage)
View real FDA blood safety notices
Search FDA data by keywords (e.g., blood, plasma)
Blood type compatibility guide
Works on mobile and desktop
Handles errors if APIs fail

Deployment 
The app is hosted on two web servers with a load balancer:

Web01 → 3.82.193.211
Web02 → 44.212.20.80
Load Balancer → 54.86.103.142

Nginx is used to serve the app and distribute traffic between servers.

Challenges & Solutions
Making APIs useful: Added real FDA data instead of just basic features
API security: Stored the key in config.js and excluded it from GitHub
API failure: Added fallback messages and local data
No backend: Used localStorage to save donor data
Form validation: Added custom validation for better user feedback

Credits
REST Countries API
OpenFDA (U.S. FDA)
American Red Cross (blood compatibility info)
Google Fonts

Note
The OpenFDA API key is not included in the repository. It is provided separately as required.

