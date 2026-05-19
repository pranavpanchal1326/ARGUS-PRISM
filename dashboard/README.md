# ARGUS · PRISM — Dashboard

> Pre-crime Intelligence System for Mule Detection  
> Team ARGUS · iDEA 2.0 · PS3 · Union Bank of India

---

## ⚡ Quick Start (Run Locally in 3 steps)

```bash
# 1. Navigate to this folder
cd dashboard

# 2. Install dependencies
npm install

# 3. Start the dev server
npm run dev
```

Then open your browser and go to:

```
http://localhost:3000/
```

> **⚠️ Important:** Always go to `http://localhost:3000/` (root URL).  
> This loads the **Landing Page** first.  
> From there, click **"View Live Demo"** to enter the dashboard.

---

## 🗺️ Routes

| URL | What you see |
|-----|-------------|
| `http://localhost:3000/` | Landing Page — product overview, legal architecture, demo CTA |
| `http://localhost:3000/dashboard` | Redirects → Alert Queue (auto) |
| `http://localhost:3000/dashboard/alerts` | Alert Queue view |
| `http://localhost:3000/dashboard/timeline` | Account Timeline view |
| `http://localhost:3000/dashboard/flowgraph` | FlowGraph — mule network |
| `http://localhost:3000/dashboard/recruiter` | Recruiter Map |
| `http://localhost:3000/dashboard/autostr` | AutoSTR Panel |

---

## 🎬 Demo Mode

The dashboard ships with a **full offline demo** — no backend required.

1. Go to `http://localhost:3000/`
2. Click **"View Live Demo"** in the hero section
3. The dashboard loads with pre-seeded fraud scenario data
4. Use the **Demo Banner** at the top to step through the 72-hour timeline

The demo simulates:
- 4 active WarmthScore alerts across 4 mule accounts
- A 7-node mule network (FlowGraph)
- A recruiter coordinator detected at ₹4.2 Cr campaign scale
- 3 AutoSTR packages generating in real time

---

## 🔧 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + Vite 8 |
| Routing | React Router v6 |
| Animation | Framer Motion |
| Charts | Recharts + D3.js |
| Design | Washi Design System (custom CSS tokens) |
| State | React Context (DemoContext, ViewContext) |

---

## 📂 Folder Structure

```
dashboard/
├── src/
│   ├── landing/          ← Landing page (9 sections)
│   │   └── sections/     ← Hero, Nav, Footer, DemoCTA, FiveEngines...
│   ├── shell/            ← NavBar, Sidebar, Shell wrapper
│   ├── views/            ← 5 dashboard views (AlertQueue, Timeline...)
│   ├── components/       ← Shared UI components
│   ├── design/           ← CSS tokens, animations, typography
│   ├── demo/             ← Demo mode engine + data
│   ├── api/              ← API client + hooks
│   └── hooks/            ← Custom React hooks
├── index.html
├── vite.config.js
└── package.json
```

---

## 🚫 Common Issue

**"I only see the dashboard, not the landing page"**

Make sure you are going to the **root URL**:
```
http://localhost:3000/        ← CORRECT (shows landing page)
http://localhost:3000/dashboard  ← skips landing page
```

If you get a **404 when refreshing** on `/dashboard/*`, restart the dev server:
```bash
npm run dev
```
The server now has `historyApiFallback: true` which fixes all refresh 404s.

---

## 🏗️ Build for Production

```bash
npm run build
```

Output goes to `dashboard/dist/`. Serve it with any static server:
```bash
npx serve dist
```

> © 2026 Team ARGUS · iDEA 2.0 · Union Bank of India
