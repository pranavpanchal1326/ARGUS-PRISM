# ARGUS-PRISM — Prototype v0.1 Demo Video Script

> **Target Duration:** 8–10 minutes  
> **Format:** Screen recording + voiceover  
> **URL to open:** https://argus-prims.vercel.app  
> **Tip:** Rehearse once before recording. Keep transitions snappy. Don't read verbatim — use these as talking-point cues.

---

## ACT 1 — The Problem (0:00 – 1:00)

### 🎬 SCREEN: Open with a blank/dark screen or a title slide

**SAY:**
- "India lost over ₹11,000 crores to digital arrest scams and UPI fraud in 2024 alone."
- "Banks today rely on batch-processed, rule-based systems that flag accounts hours or even days after the money has already moved."
- "By the time an alert fires, the mule account has been drained, the recruiter has vanished, and the victim's money is gone."
- "We built ARGUS-PRISM to change that."

### 🎬 SCREEN: Transition to project title slide / logo

**SAY:**
- "ARGUS-PRISM is a real-time mule account detection and legal compliance engine."
- "It scores every account continuously using 6 behavioural signals, generates legally mandated evidence packages automatically, and gives fraud officers a single pane of glass to act — in under 60 seconds."

---

## ACT 2 — Architecture in 60 Seconds (1:00 – 2:00)

### 🎬 SCREEN: Show the architecture diagram (from `docs/prototype-v0.1-summary.md` or a prepared slide)

**SAY:**
- "Here's how it works end-to-end."
- "On the left — a live bank simulator seeds realistic transaction events into the pipeline."
- "In the middle — our Signal Extractor queries Neo4j for network patterns and PostgreSQL for account metadata, assembling a 43-dimensional feature vector."
- "That vector feeds into a retrained XGBoost model — trained on 400,000 synthetic records — which outputs a WarmthScore from 0 to 100."
- "If the score crosses regulatory thresholds — 75 for restrictions, 85 for mandatory STR filing — our Legal Trigger Engine fires automatically."
- "Everything streams to the React dashboard in real-time via WebSockets. Zero polling. Zero lag."

---

## ACT 3 — Live Dashboard Walkthrough (2:00 – 7:30)

### SCENE 1: Landing Page (2:00 – 2:20)

### 🎬 SCREEN: Open https://argus-prims.vercel.app — you'll see the landing page

**SAY:**
- "This is the public-facing landing page of ARGUS-PRISM."
- "It summarizes the platform's capabilities and legal compliance framework."

### 🖱️ CLICK: The "Launch Dashboard" or "Enter Dashboard" button

---

### SCENE 2: Alert Queue — The War Room (2:20 – 3:30)

### 🎬 SCREEN: The Alert Queue view loads (view [1] QUEUE)

**SAY:**
- "This is what an MLRO — a Money Laundering Reporting Officer — sees when they log in."
- "Every card here is a live, prioritized alert. Sorted by severity and WarmthScore — the highest risk accounts are always at the top."
- "Each card shows the account ID, the WarmthScore, the top contributing signal, and when the alert was generated."

### 🖱️ HOVER: Over one of the alert cards to show interaction

**SAY:**
- "Let's investigate this account."

### 🖱️ CLICK: On any alert card → it should transition to the Forensic Timeline (view [2])

---

### SCENE 3: Forensic Account Timeline (3:30 – 5:30)

### 🎬 SCREEN: The Account Timeline view loads with a score chart and account metadata

**SAY:**
- "This is the forensic deep-dive for the selected account."
- "At the top — account metadata: holder name, branch, KYC status, current WarmthScore, and risk level."
- "Below — a chronological timeline chart. Each point plots the account's WarmthScore over time. You can visually see the score escalating as suspicious signals accumulate."
- "The orange and red reference lines at 75 and 85 represent the regulatory thresholds — KYC restriction and mandatory STR filing."

### 🖱️ POINT: At the action buttons at the bottom of the timeline

**SAY:**
- "Now here's where PRISM becomes actionable. These aren't mock buttons — every single one is wired to the live backend."

### 🖱️ CLICK: "Mark False Positive" button

**SAY:**
- "If the MLRO determines this is a false positive, one click resolves all pending alerts for this account and resets the status. The system logs the resolution in an immutable audit trail."

> ⏳ Wait for the success overlay to appear and dismiss.

### 🖱️ CLICK: "Request Video KYC" button

**SAY:**
- "If the officer wants to escalate KYC verification, this button triggers a re-verification request. The KYC status transitions to RE_VERIFICATION instantly."

> ⏳ Wait for the success overlay.

### 🖱️ CLICK: "Generate Evidence Package →" button

**SAY:**
- "And this is the crown jewel — AutoSTR."
- "One click generates three legally mandated evidence packages simultaneously:"
  - "FIU-IND XML — formatted under the PMLA Section 12 SAPTRN schema"
  - "CBI Evidence PDF — structured for Supreme Court Writ 03/2025 compliance"
  - "RBI Regulatory Report — in the Cyber Security Framework format"
- "Each package is cryptographically hashed, timestamped, and made available for instant download."
- "Traditional banks take 7 days to file an STR. PRISM does it in under 60 seconds."

> ⏳ Wait for the generation overlay to complete. If a PDF download triggers, mention it.

---

### SCENE 4: AutoSTR Dedicated Panel (5:30 – 6:30)

### 🖱️ NAVIGATE: Click on the AutoSTR tab/link in the sidebar or navigation

### 🎬 SCREEN: The AutoSTR Panel view loads

**SAY:**
- "This is the dedicated AutoSTR console."
- "Officers can select a specific case from the dropdown and trigger the full evidence compilation."

### 🖱️ CLICK: Select a case from the dropdown

### 🖱️ CLICK: "Generate Evidence Package" button

**SAY:**
- "The generation log on the left shows real-time progress — connecting to the evidence engine, authenticating the session, and generating each package sequentially."
- "On the right, you see the three package cards — FIU, CBI, and RBI — each with their SHA-256 integrity hash, file size, and a download link."
- "Every package is independently verifiable and court-admissible."

> ⏳ Wait for packages to show COMPLETE status.

---

### SCENE 5: Network Flow Graph (6:30 – 7:15)

### 🖱️ NAVIGATE: Press [3] or click the NETWORK tab in the bottom nav

### 🎬 SCREEN: The D3 force-directed flow graph loads

**SAY:**
- "This is the transaction network graph — powered by Neo4j."
- "Each node represents an account. The size and colour indicate WarmthScore severity — green is clean, red is imminent threat."
- "The lines represent transaction flows — thicker lines mean higher amounts."
- "Diamond-shaped nodes are coordinator accounts — recruiter nodes orchestrating downstream mule operations."

### 🖱️ HOVER: Over individual nodes to show tooltips with score, signal, and taint data

**SAY:**
- "Hovering reveals the account's WarmthScore, primary signal, and taint propagation score."
- "This gives investigators a bird's-eye view of the entire money flow network in real-time."

---

### SCENE 6: Recruiter Map (7:15 – 8:00)

### 🖱️ NAVIGATE: Press [4] or click the RECRUITER tab

### 🎬 SCREEN: The Recruiter Map view loads with campaign cards on the left

**SAY:**
- "The Recruiter Map identifies coordinator accounts — the command-and-control nodes behind mule campaigns."
- "On the left, each card shows a detected recruiter network: its classification tier, the number of downstream mule accounts, total transacted amount, and campaign status."

### 🖱️ CLICK: On a recruiter card to select it

**SAY:**
- "Selecting a recruiter loads the campaign graph on the right — showing how funds flowed from the coordinator to each downstream mule."
- "Officers can freeze an entire campaign with a single click — instantly suspending all linked accounts under RBI KYC Master Direction Section 38."

### 🖱️ CLICK: (Optional) Click the Freeze button to show the confirmation modal

---

## ACT 4 — Technical Differentiators (8:00 – 9:00)

### 🎬 SCREEN: Can stay on the dashboard, or switch to a summary slide

**SAY:**
- "Let me quickly highlight what makes PRISM different from existing solutions."
- "**Real-time, not batch.** Every score update is computed and broadcasted within milliseconds via WebSockets. No 5-minute polling. No overnight batch jobs."
- "**Explainable AI.** Every WarmthScore comes with full SHAP attribution — we don't just flag an account, we tell you exactly which signals contributed and by how much."
- "**Legally compliant by design.** The system doesn't just detect fraud — it automatically generates court-admissible evidence packages formatted for FIU-IND, CBI, and RBI."
- "**Six specialized signals.** Test credits, device fingerprinting, velocity derivatives, dormant reactivation, FRI contradiction, and SIM swap velocity — each engineered to catch a specific phase of the mule warming lifecycle."

---

## ACT 5 — Closing (9:00 – 9:45)

### 🎬 SCREEN: Switch to a closing slide or stay on the dashboard

**SAY:**
- "To summarize — ARGUS-PRISM compresses the detection-to-action cycle from days to seconds."
- "A mule account that would have operated undetected for weeks under traditional systems is now flagged, investigated, evidence-packaged, and frozen — all within a single session."
- "This is Prototype v0.1 — a fully functional, end-to-end proof of concept."
- "We built PRISM not just as a tool, but as a new standard for how Indian banking should fight financial fraud."
- "Thank you."

---

## Quick Reference — Navigation Shortcuts

| Key | View | What It Shows |
|-----|------|---------------|
| `1` | QUEUE | Prioritized alert cards |
| `2` | FORENSIC | Account timeline + action buttons |
| `3` | NETWORK | D3 transaction flow graph |
| `4` | RECRUITER | Coordinator campaign tracker |

---

## Pre-Recording Checklist

- [ ] Open https://argus-prims.vercel.app in Chrome (dark mode preferred)
- [ ] Ensure screen resolution is 1920×1080 for clean recording
- [ ] Close all browser tabs except the demo
- [ ] Disable browser notifications and popups
- [ ] Test that the Alert Queue loads accounts (may take 2–3 seconds on first load)
- [ ] Have the architecture diagram ready as a slide or image if you want to show it
- [ ] Do one full dry run before recording
