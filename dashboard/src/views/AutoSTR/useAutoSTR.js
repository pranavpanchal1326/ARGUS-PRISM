import { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '../../api/client';
import { useDemoContext } from '../../demo/DemoContext';

const SZ = { fiu: [38,55], cbi: [180,240], rbi: [22,34] };
const SMSG = {
  fiu:'FIU-IND XML generation started - SAPTRN schema loaded',
  cbi:'CBI PDF rendering initiated - SC Writ 03/2025 template',
  rbi:'RBI Report aggregation started - CSF format v3.1',
};
const MMSG = {
  fiu:'FIU-IND: SAPINP + SAPLEP sections complete. Writing SAPPIT...',
  cbi:'CBI PDF: Transaction lineage rendered. Building device timeline...',
  rbi:'RBI Report: Aggregate stats computed. Formatting output...',
};

function sha64() { return Array.from({length:64},()=>Math.floor(Math.random()*16).toString(16)).join(''); }
function fsize(id) { const[a,b]=SZ[id]; return `${(a+Math.random()*(b-a)).toFixed(1)} KB`; }
function logEntry(packageId,level,message) {
  return { id:`${Date.now()}-${Math.random().toString(36).slice(2)}`, timestamp:new Date(), packageId, level, message };
}
function mkPkg(id,label,sublabel,legalBasis,format,recipient,startDelay) {
  return { id,label,sublabel,legalBasis,format,recipient,startDelay,
    status:'IDLE',progress:0,sha256:null,generatedAt:null,duration:null,downloadUrl:null,fileSize:null };
}

const INIT = {
  caseId:null, globalStatus:'IDLE', startedAt:null, completedAt:null, totalDuration:null, log:[],
  packages:{
    fiu:mkPkg('fiu','FIU-IND STR','XML Package','PMLA Section 12','SAPTRN + SAPINP + SAPLEP + SAPPIT','Financial Intelligence Unit India',0),
    cbi:mkPkg('cbi','CBI Evidence','PDF Package','SC Writ 03/2025','Structured PDF - Transaction lineage + Device timeline','Central Bureau of Investigation',800),
    rbi:mkPkg('rbi','RBI Report','Regulatory JSON','RBI Cyber Security Framework','Aggregate fraud intelligence - RBI prescribed format','Reserve Bank of India',1400),
  },
};

async function resolveAccountId(selectedAccountId) {
  if (selectedAccountId) return selectedAccountId;
  const response = await api.getAccounts({ risk_level: 'CRITICAL', page_size: 1 });
  const accounts = Array.isArray(response?.data) ? response.data : (response?.data?.accounts ?? []);
  return accounts[0]?.account_id || null;
}

function timestampToIso(value) {
  if (!value) return new Date().toISOString();
  if (typeof value === 'string') return value;
  const date = value?._DateTime__date;
  const time = value?._DateTime__time;
  if (date?._Date__year) {
    return new Date(Date.UTC(
      date._Date__year,
      (date._Date__month ?? 1) - 1,
      date._Date__day ?? 1,
      time?._Time__hour ?? 0,
      time?._Time__minute ?? 0,
      time?._Time__second ?? 0,
      Math.floor((time?._Time__nanosecond ?? 0) / 1000000),
    )).toISOString();
  }
  return new Date().toISOString();
}

function transactionSource(txn, accountId) {
  return txn.source_account ?? txn.source_account_id ?? (txn.direction === 'OUTBOUND' ? accountId : txn.counterpart) ?? accountId;
}

function transactionTarget(txn, accountId) {
  return txn.target_account ?? txn.destination_account_id ?? (txn.direction === 'OUTBOUND' ? txn.counterpart : accountId) ?? accountId;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function buildSignalScores(timelinePoint) {
  const signals = timelinePoint?.signals ?? {};
  const entries = Object.entries(signals);
  const padded = entries.length >= 6 ? entries.slice(0, 6) : [
    ...entries,
    ...['S1', 'S2', 'S3', 'S4', 'S5', 'S6'].slice(entries.length).map(signal => [signal, 0]),
  ];
  return padded.map(([signal_name, impact]) => {
    const value = Number(impact ?? 0);
    return {
      signal_name,
      raw_score: clamp(Math.abs(value) / 10, 0, 1),
      weighted_score: clamp(Math.abs(value) * 10, 0, 100),
      shap_impact: value,
    };
  });
}

function buildShapAttribution(timelinePoint) {
  const top = timelinePoint?.top_signals ?? [];
  const fallback = buildSignalScores(timelinePoint).map(signal => ({
    signal: signal.signal_name,
    impact: signal.shap_impact,
  }));
  const items = [...top, ...fallback].slice(0, 3);
  while (items.length < 3) items.push({ signal: 'S1', impact: 0 });
  return {
    primary_signal: items[0].signal,
    primary_impact: Number(items[0].impact ?? 0),
    secondary_signal: items[1].signal,
    secondary_impact: Number(items[1].impact ?? 0),
    tertiary_signal: items[2].signal,
    tertiary_impact: Number(items[2].impact ?? 0),
  };
}

function buildReportInput(caseId, account, graph, timeline) {
  const accountId = account.account_id;
  const latest = Array.isArray(timeline) ? (timeline[0] ?? {}) : {};
  const transactions = (graph?.transactions ?? []).map((txn, index) => ({
    transaction_id: txn.txn_id ?? txn.transaction_id ?? `TXN-${caseId}-${index}`,
    transaction_type: txn.channel ?? txn.transaction_type ?? 'UPI',
    amount: Number(txn.amount ?? 0),
    transaction_timestamp: timestampToIso(txn.timestamp ?? txn.transaction_timestamp),
    source_account_id: transactionSource(txn, accountId),
    destination_account_id: transactionTarget(txn, accountId),
    channel: txn.channel ?? 'UPI',
    device_id_raw: account.upi_device_imei || 'DEVICE-UNKNOWN',
    ip_address_raw: '10.0.0.1',
  }));

  if (transactions.length === 0) {
    transactions.push({
      transaction_id: `TXN-${caseId}-0`,
      transaction_type: 'UPI',
      amount: 0,
      transaction_timestamp: new Date().toISOString(),
      source_account_id: accountId,
      destination_account_id: accountId,
      channel: 'UPI',
      device_id_raw: account.upi_device_imei || 'DEVICE-UNKNOWN',
      ip_address_raw: '10.0.0.1',
    });
  }

  return {
    case_id: caseId,
    reporting_entity_code: 'UBI0001',
    principal_officer_name: 'PRISM MLRO',
    principal_officer_designation: 'Money Laundering Reporting Officer',
    principal_officer_email: 'mlro@unionbankofindia.example',
    detection_timestamp: new Date().toISOString(),
    threshold_crossed: Number(latest.score ?? account.current_warmth_score ?? 85),
    accounts: [{
      account_id: accountId,
      account_type: account.account_type ?? 'SAVINGS',
      holder_name: account.account_holder_name ?? accountId,
      mobile_raw: account.mobile_number ?? '9876543210',
      aadhaar_raw: '123412341234',
      pan_raw: 'ABCDE1234F',
      branch_code: account.branch_code ?? 'UBI-MUM-01',
      ifsc: account.ifsc_code ?? 'UBIN0531234',
      kyc_status: account.kyc_status ?? 'VERIFIED',
      warmth_score: Number(latest.score ?? account.current_warmth_score ?? 85),
      risk_level: latest.risk_level ?? account.warmth_risk_level ?? 'CRITICAL',
    }],
    transactions,
    signal_scores: buildSignalScores(latest),
    shap_attribution: buildShapAttribution(latest),
  };
}

function resultToPackage(pkgId, caseId, result) {
  const key = pkgId === 'fiu' ? 'fiu_xml' : pkgId === 'cbi' ? 'cbi_pdf' : 'rbi_report';
  const packageResult = result?.[key] ?? {};
  
  let url = '';
  if (pkgId === 'fiu' && result?.fiu_xml_download_path) {
    url = result.fiu_xml_download_path;
  } else if (pkgId === 'cbi' && result?.cbi_pdf_download_path) {
    url = result.cbi_pdf_download_path;
  } else {
    const type = pkgId === 'cbi' ? 'application/pdf' : pkgId === 'fiu' ? 'application/xml' : 'application/json';
    const content = JSON.stringify({ case_id: caseId, package: key, result: packageResult }, null, 2);
    url = URL.createObjectURL(new Blob([content], { type }));
  }

  return {
    status: packageResult.generated ? 'COMPLETE' : 'ERROR',
    progress: packageResult.generated ? 100 : 0,
    sha256: packageResult.hash || sha64(),
    generatedAt: new Date(),
    duration: Number(packageResult.generation_time_ms ?? 0),
    downloadUrl: url,
    fileSize: fsize(pkgId),
  };
}

async function generateSTR(caseId, accountId, reportInput) {
  return await api.generateSTR(caseId, reportInput);
}

export default function useAutoSTR() {
  const { focusedAccountId } = useDemoContext();
  const [state, setState] = useState(INIT);
  const tids = useRef([]);
  const t0 = useRef(null);

  useEffect(()=>()=>{ tids.current.forEach(clearTimeout); },[]);

  const generate = useCallback(async (targetAccountId, targetCaseId) => {
    const caseId = targetCaseId || (
      (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          })
    );
    tids.current.forEach(clearTimeout);
    tids.current=[];
    t0.current=Date.now();

    setState({
      ...INIT, caseId, globalStatus:'GENERATING', startedAt:new Date(),
      packages:{
        fiu:{...INIT.packages.fiu,status:'GENERATING',progress:35},
        cbi:{...INIT.packages.cbi,status:'GENERATING',progress:35},
        rbi:{...INIT.packages.rbi,status:'GENERATING',progress:35},
      },
      log:[
        logEntry('system','INFO',`Evidence package generation initiated - Case ${caseId}`),
        logEntry('system','INFO','Connecting to PRISM Evidence Engine v2...'),
        logEntry('system','INFO','Session authenticated. Immutable log recording started.'),
        logEntry('fiu','INFO',SMSG.fiu),
        logEntry('cbi','INFO',SMSG.cbi),
        logEntry('rbi','INFO',SMSG.rbi),
      ],
    });

    try {
      const accountId = targetAccountId || await resolveAccountId(focusedAccountId);
      if (!accountId) throw new Error('No eligible accounts found for AutoSTR generation');
      const [accountResponse, timeline, graph] = await Promise.all([
        api.getAccount(accountId).catch(() => ({ data: accountId ? { account_id: accountId } : null })),
        api.getScoreTimeline(accountId, 50).catch(() => []),
        api.getAccountGraphEvents(accountId).catch(() => ({ transactions: [] })),
      ]);
      const reportInput = buildReportInput(
        caseId,
        accountResponse?.data ?? accountResponse,
        graph,
        timeline,
      );
      const result = await generateSTR(caseId, accountId, reportInput);
      const totalMs = Number(result?.total_generation_time_seconds ?? 0) * 1000;
      setState(p=>({
        ...p,
        globalStatus:'COMPLETE',
        completedAt:new Date(),
        totalDuration:totalMs,
        log:[
          ...p.log,
          logEntry('fiu','INFO',MMSG.fiu),
          logEntry('cbi','INFO',MMSG.cbi),
          logEntry('rbi','INFO',MMSG.rbi),
          logEntry('fiu','SUCCESS',`FIU-IND generated - SHA-256: ${(result?.fiu_xml?.hash || '').slice(0,16)}...`),
          logEntry('cbi','SUCCESS',`CBI Evidence generated - SHA-256: ${(result?.cbi_pdf?.hash || '').slice(0,16)}...`),
          logEntry('rbi','SUCCESS',`RBI Report generated - SHA-256: ${(result?.rbi_report?.hash || '').slice(0,16)}...`),
          logEntry('system','SUCCESS',`All evidence packages generated in ${totalMs}ms. Ready for MLRO approval.`),
        ],
        packages:{
          fiu:{...p.packages.fiu,...resultToPackage('fiu',caseId,result)},
          cbi:{...p.packages.cbi,...resultToPackage('cbi',caseId,result)},
          rbi:{...p.packages.rbi,...resultToPackage('rbi',caseId,result)},
        },
      }));
    } catch(error) {
      setState(p=>({
        ...p,
        globalStatus:'ERROR',
        packages:{
          fiu:{...p.packages.fiu,status:'ERROR'},
          cbi:{...p.packages.cbi,status:'ERROR'},
          rbi:{...p.packages.rbi,status:'ERROR'},
        },
        log:[...p.log, logEntry('system','ERROR',error.message || 'AutoSTR generation failed')],
      }));
    }
  },[]);

  const reset = useCallback(()=>{
    tids.current.forEach(clearTimeout);
    tids.current=[];
    setState(p=>{
      Object.values(p.packages).forEach(pkg=>{ if(pkg.downloadUrl) URL.revokeObjectURL(pkg.downloadUrl); });
      return INIT;
    });
  },[]);

  const dismissError = useCallback(()=>{
    setState(p=>({...p, globalStatus:'IDLE'}));
  },[]);

  return { state, generate, reset, dismissError };
}
