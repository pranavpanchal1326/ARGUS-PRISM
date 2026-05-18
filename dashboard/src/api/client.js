import {
  DEMO_ACCOUNTS, DEMO_ALERTS, DEMO_WARMTH_TIMELINE,
  DEMO_FLOWGRAPH, DEMO_RECRUITER_DATA, DEMO_AUTOSTR_CASES,
  DEMO_KPI_STATS, DEMO_HEALTH,
} from '../demo/demoData';

const USE_MOCK = true;
const BASE_URL = 'http://localhost:8000';

function mockDelay(data) { return new Promise(r => setTimeout(() => r(data), 200)); }
function ok(data)    { return { data, error: null, loading: false }; }
function err(e, ep)  { return { data: null, error: { status: e.status||0, message: e.message||'Network error', endpoint: ep }, loading: false }; }


async function apiFetch(path, opts = {}) {
  const url = BASE_URL + path;
  try {
    const res = await fetch(url, opts);
    if (!res.ok) throw { status: res.status, message: await res.text(), endpoint: url };
    return ok(await res.json());
  } catch (e) { return err(e, url); }
}

/* ── Mock data ─────────────────────────────────────────── */
const NAMES    = ['Rajesh Kumar','Priya Sharma','Amit Singh','Sunita Devi','Mohan Lal','Kavita Yadav','Ravi Shankar','Deepa Nair','Suresh Babu','Anita Singh','Ramesh Gupta','Lalita Prasad','Kiran Verma','Santosh Tiwari','Meena Pandey','Ajay Mishra','Pooja Rawat','Deepak Joshi','Rekha Soni','Vijay Kumar'];
const BRANCHES = ['Mumbai Central','Delhi East','Chennai South','Kolkata North','Bengaluru Tech','Hyderabad West','Pune Central','Ahmedabad Main','Jaipur HQ','Lucknow East'];
const SIGNALS  = ['Signal 1 — Test Credit Pattern','Signal 2 — Device Fingerprint','Signal 3 — Velocity Spike','Signal 4 — Dormant Reactivation','Signal 5 — FRI Contradiction','Signal 6 — SIM Swap Velocity'];
const SCORES   = [12,18,24,31,35,43,51,58,62,66,71,74,76,79,82,84,87,90,93,96];
const LEVELS   = ['CLEAN','CLEAN','CLEAN','CLEAN','CLEAN','CLEAN','WARMING','WARMING','WARMING','WARMING','WARMING','HOT','HOT','HOT','HOT','CRITICAL','CRITICAL','CRITICAL','IMMINENT','IMMINENT'];

const MOCK_ACCOUNTS = NAMES.map((name, i) => ({
  account_id:    `UBI-2026-DEMO-${String(i+1).padStart(3,'0')}`,
  name,
  branch:        BRANCHES[i % BRANCHES.length],
  account_type:  i % 3 === 0 ? 'CURRENT' : 'SAVINGS',
  warmth_score:  SCORES[i],
  risk_level:    LEVELS[i],
  top_signal:    SIGNALS[i % SIGNALS.length],
  taint_score:   i > 14 ? Math.round(SCORES[i] * 0.9) : 0,
  is_tainted:    i > 14,
  created_at:    '2026-03-10T08:00:00Z',
  last_activity: `2026-03-15T${String(8 + i).padStart(2,'0')}:${String(i*3%60).padStart(2,'0')}:00Z`,
  status:        i > 17 ? 'FROZEN' : i > 14 ? 'RESTRICTED' : 'ACTIVE',
}));

const MOCK_ALERTS = [
  { alert_id:'ALT-001', account_id:'UBI-2026-DEMO-019', account_name:'Rekha Soni',     alert_type:'WARMTH_THRESHOLD',   severity:'CRITICAL', score:90, top_signal:'Signal 4 — Dormant Reactivation', created_at:'2026-03-15T14:31:00Z', acknowledged:false, taint_hit:false },
  { alert_id:'ALT-002', account_id:'UBI-2026-DEMO-020', account_name:'Vijay Kumar',    alert_type:'TAINT_HIT',           severity:'CRITICAL', score:96, top_signal:'Signal 5 — FRI Contradiction',    created_at:'2026-03-15T14:28:00Z', acknowledged:false, taint_hit:true  },
  { alert_id:'ALT-003', account_id:'UBI-2026-DEMO-016', account_name:'Ajay Mishra',    alert_type:'WARMTH_THRESHOLD',   severity:'HIGH',     score:84, top_signal:'Signal 2 — Device Fingerprint',   created_at:'2026-03-15T13:55:00Z', acknowledged:false, taint_hit:false },
  { alert_id:'ALT-004', account_id:'UBI-2026-DEMO-017', account_name:'Pooja Rawat',    alert_type:'TAINT_HIT',           severity:'HIGH',     score:87, top_signal:'Signal 3 — Velocity Spike',       created_at:'2026-03-15T13:40:00Z', acknowledged:false, taint_hit:true  },
  { alert_id:'ALT-005', account_id:'UBI-2026-DEMO-018', account_name:'Deepak Joshi',   alert_type:'FLOWGRAPH_TRIGGER',  severity:'HIGH',     score:82, top_signal:'Signal 1 — Test Credit Pattern',  created_at:'2026-03-15T13:22:00Z', acknowledged:false, taint_hit:false },
  { alert_id:'ALT-006', account_id:'UBI-REC-001',       account_name:'Vinod Enterprises',alert_type:'RECRUITER_DETECTED',severity:'HIGH',    score:0,  top_signal:'Recruiter — 47 downstream accounts',created_at:'2026-03-15T12:50:00Z',acknowledged:false, taint_hit:false },
  { alert_id:'ALT-007', account_id:'UBI-2026-DEMO-015', account_name:'Meena Pandey',   alert_type:'WARMTH_THRESHOLD',   severity:'MEDIUM',   score:76, top_signal:'Signal 6 — SIM Swap Velocity',    created_at:'2026-03-15T12:30:00Z', acknowledged:false, taint_hit:false },
  { alert_id:'ALT-008', account_id:'UBI-2026-DEMO-014', account_name:'Santosh Tiwari', alert_type:'WARMTH_THRESHOLD',   severity:'MEDIUM',   score:74, top_signal:'Signal 4 — Dormant Reactivation', created_at:'2026-03-15T12:10:00Z', acknowledged:false, taint_hit:false },
  { alert_id:'ALT-009', account_id:'UBI-2026-DEMO-013', account_name:'Kiran Verma',    alert_type:'FLOWGRAPH_TRIGGER',  severity:'MEDIUM',   score:71, top_signal:'Signal 2 — Device Fingerprint',   created_at:'2026-03-15T11:45:00Z', acknowledged:false, taint_hit:false },
  { alert_id:'ALT-010', account_id:'UBI-2026-DEMO-010', account_name:'Anita Singh',    alert_type:'WARMTH_THRESHOLD',   severity:'LOW',      score:58, top_signal:'Signal 1 — Test Credit Pattern',  created_at:'2026-03-15T11:20:00Z', acknowledged:false, taint_hit:false },
  { alert_id:'ALT-011', account_id:'UBI-2026-DEMO-009', account_name:'Suresh Babu',    alert_type:'WARMTH_THRESHOLD',   severity:'LOW',      score:51, top_signal:'Signal 3 — Velocity Spike',       created_at:'2026-03-15T11:00:00Z', acknowledged:false, taint_hit:false },
  { alert_id:'ALT-012', account_id:'UBI-2026-DEMO-008', account_name:'Deepa Nair',     alert_type:'WARMTH_THRESHOLD',   severity:'LOW',      score:43, top_signal:'Signal 5 — FRI Contradiction',    created_at:'2026-03-15T10:40:00Z', acknowledged:false, taint_hit:false },
];

const MOCK_CASES = [
  { case_id:'CASE-9912', account_id:'UBI-2026-DEMO-020', account_name:'Vijay Kumar',    status:'OPEN',          risk_score:96, created_at:'2026-03-14T09:00:00Z', assigned_to:'MLRO-Sharma',  notes:'', str_status:'PENDING' },
  { case_id:'CASE-9913', account_id:'UBI-2026-DEMO-019', account_name:'Rekha Soni',     status:'OPEN',          risk_score:90, created_at:'2026-03-14T10:00:00Z', assigned_to:'MLRO-Sharma',  notes:'', str_status:'PENDING' },
  { case_id:'CASE-9914', account_id:'UBI-2026-DEMO-018', account_name:'Deepak Joshi',   status:'INVESTIGATING', risk_score:82, created_at:'2026-03-13T14:00:00Z', assigned_to:'MLRO-Kapoor',  notes:'Account under enhanced scrutiny.', str_status:'PENDING' },
  { case_id:'CASE-9915', account_id:'UBI-2026-DEMO-017', account_name:'Pooja Rawat',    status:'INVESTIGATING', risk_score:87, created_at:'2026-03-13T11:00:00Z', assigned_to:'MLRO-Kapoor',  notes:'Taint chain confirmed.', str_status:'FILED' },
  { case_id:'CASE-9916', account_id:'UBI-2026-DEMO-016', account_name:'Ajay Mishra',    status:'CLOSED',        risk_score:84, created_at:'2026-03-12T09:00:00Z', assigned_to:'MLRO-Sharma',  notes:'STR filed. Account frozen.', str_status:'APPROVED' },
];

const MOCK_RECRUITERS = [
  { recruiter_id:'UBI-REC-001', classification:'PLATFORM_SCALE',          downstream_count:47, frozen_count:16, active_count:31, campaign_start:'2026-03-08T00:00:00Z', total_test_amount:2340, accounts:Array.from({length:12},(_,i)=>`UBI-2026-M-${String(i+1).padStart(3,'0')}`) },
  { recruiter_id:'UBI-REC-002', classification:'INDUSTRIAL_ORCHESTRATOR', downstream_count:23, frozen_count:4,  active_count:19, campaign_start:'2026-03-10T00:00:00Z', total_test_amount:1150, accounts:Array.from({length:8}, (_,i)=>`UBI-2026-M-${String(i+21).padStart(3,'0')}`) },
  { recruiter_id:'UBI-REC-003', classification:'CAMPAIGN_COORDINATOR',    downstream_count:9,  frozen_count:0,  active_count:9,  campaign_start:'2026-03-12T00:00:00Z', total_test_amount:380,  accounts:Array.from({length:5}, (_,i)=>`UBI-2026-M-${String(i+31).padStart(3,'0')}`) },
];

/* ── Timeline builder ─────────────────────────────────── */
const EVT = { 24:'Signal 1 fired — test credits detected', 36:'Signal 2 fired — IMEI cluster match', 60:'KYC Re-verification triggered (RBI KYC MD S.38)', 72:'AutoSTR initiated (PMLA S.12)' };
function buildTimeline() {
  return Array.from({length:73},(_,h)=>({
    hour: h,
    score: +Math.min(100, Math.max(0, 21 + 63*Math.pow(h/72, 0.7) + (Math.random()-0.5)*4)).toFixed(1),
    event: EVT[h]||null,
  }));
}

/* ── GROUP A ── */
export async function fetchHealth() {
  if (USE_MOCK) return ok(await mockDelay({ status:'operational', engine:'PRISM', version:'2.0.0', services:DEMO_HEALTH, uptime_seconds:86400 }));
  return apiFetch('/health');
}

/* ── GROUP B ── */
export async function fetchAccounts({ page=1, limit=20, minScore=0 }={}) {
  if (USE_MOCK) return ok(await mockDelay(DEMO_ACCOUNTS.filter(a=>a.warmth_score>=minScore).slice((page-1)*limit, page*limit)));
  return apiFetch(`/api/accounts?page=${page}&limit=${limit}&min_score=${minScore}`);
}
export async function fetchAccount(accountId) {
  if (USE_MOCK) return ok(await mockDelay(DEMO_ACCOUNTS.find(a=>a.account_id===accountId)||DEMO_ACCOUNTS[0]));
  return apiFetch(`/api/accounts/${accountId}`);
}

/* ── GROUP C ── */
export async function fetchWarmthScore(accountId) {
  const acct = DEMO_ACCOUNTS.find(a=>a.account_id===accountId)||DEMO_ACCOUNTS[0];
  if (USE_MOCK) return ok(await mockDelay({ account_id:accountId, warmth_score:acct.warmth_score, risk_level:acct.risk_level, signals:acct.shap_breakdown.map((s,i)=>({ signal_name:`signal_${i+1}`, score:s.impact/100, weight:s.weight, description:s.signal })), shap_top3:acct.shap_breakdown.slice(0,3).map(s=>({ signal:s.signal, impact:s.impact })), timestamp:new Date().toISOString() }));
  return apiFetch(`/api/warmthscore/${accountId}`);
}
export async function fetchWarmthTimeline(accountId) {
  if (USE_MOCK) return ok(await mockDelay(DEMO_WARMTH_TIMELINE[accountId] ?? []));
  return apiFetch(`/api/warmthscore/${accountId}/timeline`);
}

/* ── GROUP D ── */
export async function fetchFlowGraph(accountId) {
  if (USE_MOCK) return ok(await mockDelay({ center_account:accountId, ...DEMO_FLOWGRAPH, pattern_flags:['LAYERING','ROUND_TRIP_PARTIAL','STRUCTURING'] }));
  return apiFetch(`/api/flowgraph/${accountId}`);
}

/* ── GROUP E ── */
export async function fetchAlerts({ severity=null, acknowledged=false }={}) {
  if (USE_MOCK) { let a=DEMO_ALERTS.filter(x=>x.acknowledged===acknowledged); if(severity) a=a.filter(x=>severity.split(',').includes(x.severity)); return ok(await mockDelay(a)); }
  const q=new URLSearchParams({ acknowledged:String(acknowledged), ...(severity&&{severity}) }); return apiFetch(`/api/alerts?${q}`);
}
export async function acknowledgeAlert(alertId) {
  if (USE_MOCK) return ok(await mockDelay({ success:true, alert_id:alertId, acknowledged_at:new Date().toISOString() }));
  return apiFetch(`/api/alerts/${alertId}/acknowledge`,{ method:'POST' });
}

/* ── GROUP F ── */
export async function fetchCases({ status='OPEN' }={}) {
  if (USE_MOCK) { const c=DEMO_AUTOSTR_CASES.map(x=>({ case_id:x.case_id, account_id:x.account_id, account_name:x.account_name, status:x.status==='GENERATED'?'OPEN':x.status, risk_score:x.warmth_score, created_at:x.generated_at, assigned_to:'MLRO-Sharma', notes:'', str_status:x.mlro_status==='PENDING_APPROVAL'?'PENDING':'FILED' })); return ok(await mockDelay(status==='ALL'?c:c.filter(c=>c.status===status))); }
  return apiFetch(`/api/cases?status=${status}`);
}
export async function updateCase(caseId, patch) {
  if (USE_MOCK) { const c=DEMO_AUTOSTR_CASES[0]||{}; return ok(await mockDelay({...c,...patch})); }
  return apiFetch(`/api/cases/${caseId}`,{ method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify(patch) });
}

/* ── GROUP G ── */
export async function generateAutoSTR(caseId, progressCallback=()=>{}) {
  if (USE_MOCK) {
    await new Promise(r=>setTimeout(r,1000)); progressCallback('FIU_XML',33);
    await new Promise(r=>setTimeout(r,1000)); progressCallback('CBI_PDF',66);
    await new Promise(r=>setTimeout(r,1000));
    return ok({ case_id:caseId, generated_at:new Date().toISOString(), packages:{ fiu_ind:{ status:'GENERATED', filename:`STR_${caseId}_FIU.xml`, sha256:'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2', legal_basis:'PMLA Section 12', generation_ms:1240 }, cbi_package:{ status:'GENERATED', filename:`CBI_${caseId}_EVIDENCE.pdf`, sha256:'e5f6a7b8c9d0e5f6a7b8c9d0e5f6a7b8c9d0e5f6a7b8c9d0e5f6a7b8c9d0e5f6', legal_basis:'SC Writ 03/2025', generation_ms:1820 }, rbi_report:{ status:'GENERATED', filename:`RBI_${caseId}_REPORT.json`, sha256:'i9j0k1l2m3n4i9j0k1l2m3n4i9j0k1l2m3n4i9j0k1l2m3n4i9j0k1l2m3n4i9j0', legal_basis:'RBI Cyber Security Framework', generation_ms:980 } }, total_ms:3040 });
  }
  const res=await apiFetch(`/api/autostr/generate/${caseId}`,{method:'POST'}); return res;
}
export async function downloadPackage(caseId, packageType) {
  await new Promise(r => setTimeout(r, 200));

  const MAP={ fiu_ind:['application/xml',`<?xml version="1.0"?><STR><case_id>${caseId}</case_id><authority>FIU-IND</authority><legal_basis>PMLA Section 12</legal_basis></STR>`,'xml'], cbi_package:['application/pdf',`CBI EVIDENCE PACKAGE\nCase: ${caseId}\n[SC Writ 03/2025]\nGenerated: ${new Date().toISOString()}`,'pdf'], rbi_report:['application/json',JSON.stringify({case_id:caseId,report_type:'RBI_REGULATORY',generated:new Date().toISOString()},null,2),'json'] };
  const [type,content,ext]=MAP[packageType]||MAP.rbi_report;
  const url=URL.createObjectURL(new Blob([content],{type}));
  const a=document.createElement('a'); a.href=url; a.download=`PRISM-${packageType.toUpperCase()}-${caseId}.${ext}`; a.click(); URL.revokeObjectURL(url);
  return ok({ success:true, filename:`PRISM-${packageType}-${caseId}.${ext}` });
}

/* ── GROUP H ── */
export async function fetchRecruiters() {
  if (USE_MOCK) return ok(await mockDelay(DEMO_RECRUITER_DATA.recruiters));
  return apiFetch('/api/recruiters');
}
export async function freezeRecruiterCampaign(recruiterId) {
  if (USE_MOCK) { await new Promise(r=>setTimeout(r,1200)); return ok({ success:true, recruiter_id:recruiterId, accounts_frozen:5, frozen_at:new Date().toISOString() }); }
  return apiFetch(`/api/recruiters/${recruiterId}/freeze`,{method:'POST'});
}
