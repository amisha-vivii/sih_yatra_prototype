# 🛡️ YatraShield

### Tourism Trust & Risk Intelligence Platform

YatraShield is an AI-powered tourism trust and risk intelligence platform designed to help travellers make safer and more informed decisions before choosing travel-related services.

It combines **trust intelligence, location intelligence, price intelligence, and AI-powered risk analysis** to identify potential risks and provide understandable insights to travellers.

---

## 🌍 Why YatraShield?

Travellers often have to make decisions based on incomplete information, unreliable reviews, unclear pricing, and limited knowledge of local risks.

YatraShield acts as a **trust layer for tourism**, helping travellers understand potential risks before they make a decision.

> **Travel smarter. Travel safer.**

---

## ✨ Key Features

### 🛡️ Trust Intelligence
Evaluates service reliability using service history, feedback consistency, registry information, and previous reports.

### 📍 Location Intelligence
Uses geographic context and nearby service information to understand risks associated with a particular area.

### 💰 Price Intelligence
Compares quoted prices against local benchmarks to identify unusual or potentially inflated pricing.

### 🤖 AI Risk Analysis
Uses AI-powered analysis to identify patterns in complaints, reviews, incidents, and unusual service/price combinations.

### 🗺️ Tourism Risk Map
Provides a visual representation of tourism-related risks, hotspots, and service intelligence across supported locations.

### 📊 Explainable Risk Scores
Instead of simply showing a risk score, YatraShield provides understandable reasons behind the score.

### 📝 Traveller Reports
Travellers can report incidents, misleading listings, overcharging, hidden charges, and other tourism-related issues.

### 👤 Role-Based Access
The platform separates access between:

- **Traveller**
- **Admin / Tourism Authority**

Each role receives its own dedicated dashboard and features.

---

## 🔄 How It Works

```text
Traveller Report
       ↓
Data Analysis
       ↓
AI Risk Detection
       ↓
Risk & Trust Score
       ↓
Traveller Warning
       ↓
Better Tourism Decisions



The platform continuously turns reported experiences and service information into useful tourism intelligence.

🧠 AI & Intelligence

YatraShield uses multiple intelligence signals to improve tourism risk detection.

Sentence Embeddings

Travel reviews and complaints can be represented as numerical vectors, allowing semantically similar complaints and recurring patterns to be identified even when different words are used.

Anomaly Detection

Anomaly detection is used to identify unusual combinations of service types, prices, and locations compared with observed patterns.

Explainable Analysis

The goal is not simply to label a business as "unsafe".

Instead, YatraShield highlights the signals contributing to a potential risk so that travellers can make informed decisions.

🏗️ Platform Architecture
                    ┌──────────────────┐
                    │     Traveller    │
                    └────────┬─────────┘
                             │
                             ↓
                    ┌──────────────────┐
                    │    YatraShield   │
                    │     Platform     │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              ↓              ↓              ↓
        Trust Data      Location Data   Price Data
              │              │              │
              └──────────────┼──────────────┘
                             ↓
                    ┌──────────────────┐
                    │   AI Risk Engine │
                    └────────┬─────────┘
                             ↓
                    ┌──────────────────┐
                    │ Risk Intelligence│
                    └────────┬─────────┘
                             ↓
                    Safer Decisions
🖥️ User Roles
👤 Traveller

Travellers can:

Register and log in
Check travel services
View trust and risk information
Explore tourism risk information
Submit reports
Understand pricing anomalies
View relevant warnings and insights
🏛️ Admin / Tourism Authority

Administrators can:

Monitor reported incidents
Review tourism risk patterns
Identify hotspots
Monitor service-related anomalies
Analyze complaint trends
Manage platform intelligence

Admin functionality is separated from the traveller experience through role-based authentication.

🎨 User Experience

YatraShield follows a clean, modern interface focused on:

Simple navigation
Clear risk communication
Minimal information overload
Visual data representation
Explainable insights
Responsive design

The public homepage introduces the platform, while detailed functionality becomes available after authentication.

🛠️ Technology Stack
Frontend
React
TypeScript
Vite
HTML5
CSS3
Modern responsive UI
AI / Data Intelligence
Sentence Embeddings
Semantic Similarity
Isolation Forest / Anomaly Detection
Risk Scoring
Location-based Analysis
Price Benchmarking
Development
Git
GitHub
Node.js
npm

The exact technologies used may evolve as the platform is developed further.

🚀 Getting Started
1. Clone the repository
git clone https://github.com/amisha-vivii/sih_yatra_prototype.git
2. Navigate to the project
cd sih_yatra_prototype
3. Install dependencies
npm install
4. Start the development server
npm run dev

The application will be available at the local development URL provided by Vite, typically:

http://localhost:5173
🔐 Environment Variables

If environment variables are required, create a .env file in the project root.

Example:

VITE_API_URL=your_api_url
VITE_MAP_API_KEY=your_map_api_key
⚠️ Security

Never commit API keys, passwords, tokens, or other sensitive credentials to GitHub.

Add environment files to .gitignore:

.env
.env.*
!.env.example
📁 Project Structure
sih_yatra_prototype/
│
├── public/
│
├── src/
│   ├── components/
│   ├── pages/
│   ├── assets/
│   └── ...
│
├── .gitignore
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
🎯 Project Vision

YatraShield aims to create a more transparent and trustworthy tourism ecosystem where travellers can make decisions based on meaningful intelligence rather than uncertainty.

The platform focuses on moving tourism safety from a reactive approach to a more preventive and data-driven approach.

Don't find out after you pay.

🚧 Project Status

Prototype / Smart India Hackathon Project

The current version demonstrates the core concept, user experience, tourism intelligence workflow, and AI-assisted risk analysis capabilities of YatraShield.

🔮 Future Scope

Potential future enhancements include:

Real-time tourism data integration
Government and tourism-authority data integration
More cities and destinations
Advanced fraud detection
Real-time price monitoring
Multilingual traveller support
Mobile application
Improved AI-based complaint clustering
Real-time tourism safety alerts
Integration with verified tourism service providers
