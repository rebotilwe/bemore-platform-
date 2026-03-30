# BeMore SME Access Initiative — Full Stack MVP

## Architecture
```
frontend/index.html     ← Single-page app (works standalone OR with backend)
backend/server.js       ← Node.js + Express REST API
backend/.env.example    ← Configuration template
```

## 🚀 QUICK START (3 Steps)

### Step 1 — Run the frontend RIGHT NOW (no backend needed)
Open `frontend/index.html` in any browser.
- Data saves to localStorage automatically
- Admin login: credentials set via environment variables
- Fully functional for demos and user testing

---

### Step 2 — Set up MongoDB Atlas (free tier, 5 mins)
1. Go to https://cloud.mongodb.com → Create free account
2. Create a cluster → Choose free M0 tier (Sandton/Jo'burg region if available)
3. Database Access → Add user → username + password
4. Network Access → Add IP → Allow from anywhere (0.0.0.0/0) for MVP
5. Connect → Drivers → Copy connection string
6. Looks like: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/`

---

### Step 3 — Start the backend
```bash
cd backend

# Copy and fill in your environment config
cp .env.example .env
# Edit .env: paste your MongoDB URI + set credentials

# Install dependencies
npm install

# Start in development mode (auto-restarts on changes)
npm run dev

# OR start in production
npm start
```

Backend starts at: http://localhost:5000

---

## 🔄 How the Frontend Switches to MongoDB

The frontend auto-detects the backend:
```javascript
const API_URL = 'http://localhost:5000/api';
```

On page load it tries `GET /api/health`. If your backend is running → it uses MongoDB. If not → it falls back to localStorage (demo mode). **No code changes needed.**

When you deploy:
1. Change `API_URL` in `frontend/index.html` to your deployed backend URL
2. Example: `const API_URL = 'https://bemore-api.railway.app/api'`

---

## 📡 API Reference

### Public Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/health | Health check |
| POST | /api/applications | Submit application form |

### Admin Endpoints (require JWT Bearer token)
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/login | Admin login → returns JWT |
| GET | /api/auth/verify | Verify token |
| GET | /api/applications | List all (supports filters: userType, status, search, page, limit) |
| GET | /api/applications/stats | Dashboard stats |
| GET | /api/applications/:id | Single application detail |
| PATCH | /api/applications/:id | Update status / deal room / notes |
| GET | /api/applications/export/csv | Export CSV |
| GET | /api/reports/:name | Pre-built reports |

### Report Names
- `high-value-developers` — R5m+ funding requirement
- `pipeline-ready-land` — Serviced + zoned landowners
- `institutional-grade-housing` — 500+ beds, 95%+ occupancy
- `deal-room-shortlist` — All shortlisted/invited

---

## 🚢 Deployment (Tomorrow Ready)

### Option A: Railway (Easiest, ~10 mins)
1. Push to GitHub
2. Go to https://railway.app → New Project → Deploy from GitHub
3. Add environment variables (copy from .env)
4. Get your URL → update `API_URL` in frontend

### Option B: Vercel (Frontend) + Railway (Backend)
- Frontend: `vercel --prod` from `/frontend` folder
- Backend: Railway deployment

### Option C: Single VPS (DigitalOcean R100/month)
```bash
# On your server
git clone your-repo
cd bemore/backend
npm install --production
npm start
# Use PM2 for process management: pm2 start server.js
```

---

## 🔐 Security Checklist (before going live)

- [ ] Change ADMIN_PASSWORD from default
- [ ] Generate strong JWT_SECRET (64+ chars)
- [ ] Restrict MongoDB Atlas network access to your server IP
- [ ] Enable HTTPS (Railway/Vercel do this automatically)
- [ ] Set FRONTEND_URL to your actual domain (CORS)
- [ ] Remove demo hint from login page

---

## 📊 MongoDB Collections

### applications
```json
{
  "_id": "ObjectId",
  "refNumber": "BM-2026-1234",
  "userType": "developer",
  "personal": {
    "firstName": "Thabo",
    "surname": "Nkosi",
    "email": "thabo@dev.co.za",
    "phone": "+27821234567",
    "companyName": "Nkosi Dev (Pty) Ltd"
  },
  "formData": {
    "projectStage": "Construction Ready",
    "fundingRequirement": "R20m+",
    "developmentTypes": ["Residential", "Mixed-Use"]
  },
  "tags": ["HIGH_VALUE", "LARGE_CAPITAL", "SHOVEL_READY"],
  "status": "shortlisted",
  "dealRoom": {
    "summitAccess": true,
    "dealRoomEntry": false,
    "funders": ["DBSA", "NHFC"]
  },
  "submittedAt": "2026-03-24T10:30:00Z"
}
```

---

## 📈 Phase 2 Roadmap (post-summit)

- [ ] AI scoring model (score applicants 0–100 based on tag combinations)
- [ ] WhatsApp notification via Twilio
- [ ] Multi-admin with role management
- [ ] Firebase swap (if you want real-time admin updates)
- [ ] POPIA consent management
- [ ] Applicant portal (check your status via ref number)
