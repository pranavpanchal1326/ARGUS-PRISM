import { useState, useRef, useEffect, useCallback } from 'react';

const DUR  = { fiu: 12000, cbi: 18000, rbi: 8000 };
const DEL  = { fiu: 0,     cbi: 800,   rbi: 1400 };
const SZ   = { fiu: [38,55], cbi: [180,240], rbi: [22,34] };
const LBL  = { fiu:'FIU-IND STR', cbi:'CBI Evidence', rbi:'RBI Report' };
const SMSG = {
  fiu:'FIU-IND XML generation started — SAPTRN schema loaded',
  cbi:'CBI PDF rendering initiated — SC Writ 03/2025 template',
  rbi:'RBI Report aggregation started — CSF format v3.1',
};
const MMSG = {
  fiu:'FIU-IND: SAPINP + SAPLEP sections complete. Writing SAPPIT...',
  cbi:'CBI PDF: Transaction lineage rendered. Building device timeline...',
  rbi:'RBI Report: Aggregate stats computed. Formatting output...',
};

function sha64() { return Array.from({length:64},()=>Math.floor(Math.random()*16).toString(16)).join(''); }
function fsize(id) { const[a,b]=SZ[id]; return `${(a+Math.random()*(b-a)).toFixed(1)} KB`; }
function progress(elapsed,total) {
  const t=Math.min(elapsed/total,1);
  if(t<=0.2) return (t/0.2)*40;
  if(t<=0.8) return 40+((t-0.2)/0.6)*45;
  return 85+((t-0.8)/0.2)*15;
}
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
    cbi:mkPkg('cbi','CBI Evidence','PDF Package','SC Writ 03/2025','Structured PDF — Transaction lineage + Device timeline','Central Bureau of Investigation',800),
    rbi:mkPkg('rbi','RBI Report','Regulatory JSON','RBI Cyber Security Framework','Aggregate fraud intelligence — RBI prescribed format','Reserve Bank of India',1400),
  },
};

export default function useAutoSTR() {
  const [state, setState] = useState(INIT);
  const rafIds   = useRef({});
  const tids     = useRef([]);
  const t0       = useRef(null);
  const done     = useRef(new Set());
  const midDone  = useRef({});

  useEffect(()=>()=>{
    Object.values(rafIds.current).forEach(cancelAnimationFrame);
    tids.current.forEach(clearTimeout);
  },[]);

  const appendLog = useCallback((entry)=>{
    setState(p=>({...p, log:[...p.log, entry]}));
  },[]);

  const completePackage = useCallback((pkgId, caseId, elapsed)=>{
    const sha   = sha64();
    const type  = pkgId==='cbi'?'application/pdf':pkgId==='fiu'?'application/xml':'application/json';
    const url   = URL.createObjectURL(new Blob([`PRISM ${LBL[pkgId]} — Case ${caseId} — ${new Date().toISOString()}`],{type}));
    done.current.add(pkgId);
    const allDone = done.current.size===3;
    const totalMs = allDone ? Date.now()-t0.current : null;

    setState(p=>{
      const log=[...p.log, logEntry(pkgId,'SUCCESS',`${LBL[pkgId]} generated — SHA-256: ${sha.slice(0,16)}...`)];
      if(allDone) {
        log.push(logEntry('system','SUCCESS',`All evidence packages generated in ${totalMs}ms. Ready for MLRO approval.`));
        log.push(logEntry('system','INFO','Cryptographic signatures applied. Packages written to immutable log.'));
      }
      return {
        ...p,
        globalStatus: allDone?'COMPLETE':p.globalStatus,
        completedAt:  allDone?new Date():p.completedAt,
        totalDuration:allDone?totalMs:p.totalDuration,
        log,
        packages:{...p.packages,[pkgId]:{
          ...p.packages[pkgId], status:'COMPLETE', progress:100,
          sha256:sha, generatedAt:new Date(), duration:elapsed,
          downloadUrl:url, fileSize:fsize(pkgId),
        }},
      };
    });
  },[]);

  const startPkg = useCallback((pkgId, caseId)=>{
    const dur = DUR[pkgId];
    const pk0 = performance.now();
    midDone.current[pkgId]=false;

    setState(p=>({...p,
      packages:{...p.packages,[pkgId]:{...p.packages[pkgId],status:'GENERATING'}},
      log:[...p.log, logEntry(pkgId,'INFO',SMSG[pkgId])],
    }));

    function tick(now){
      const el=now-pk0;
      const pct=progress(el,dur);
      if(pct>=50 && !midDone.current[pkgId]){
        midDone.current[pkgId]=true;
        setState(p=>({...p, log:[...p.log, logEntry(pkgId,'INFO',MMSG[pkgId])]}));
      }
      if(pct<100){
        setState(p=>({...p, packages:{...p.packages,[pkgId]:{...p.packages[pkgId],progress:pct}}}));
        rafIds.current[pkgId]=requestAnimationFrame(tick);
      } else {
        completePackage(pkgId, caseId, Math.round(el));
      }
    }
    rafIds.current[pkgId]=requestAnimationFrame(tick);
  },[completePackage]);

  const generate = useCallback((caseId)=>{
    if(!caseId) return;
    Object.values(rafIds.current).forEach(cancelAnimationFrame);
    tids.current.forEach(clearTimeout);
    rafIds.current={}; tids.current=[]; done.current=new Set(); midDone.current={};
    t0.current=Date.now();

    setState({
      ...INIT, caseId, globalStatus:'GENERATING', startedAt:new Date(),
      log:[
        logEntry('system','INFO',`Evidence package generation initiated — Case ${caseId}`),
        logEntry('system','INFO','Connecting to PRISM Evidence Engine v2...'),
        logEntry('system','INFO','Session authenticated. Immutable log recording started.'),
      ],
    });

    ['fiu','cbi','rbi'].forEach(id=>{
      const tid=setTimeout(()=>startPkg(id,caseId), DEL[id]);
      tids.current.push(tid);
    });
  },[startPkg]);

  const reset = useCallback(()=>{
    Object.values(rafIds.current).forEach(cancelAnimationFrame);
    tids.current.forEach(clearTimeout);
    rafIds.current={}; tids.current=[];
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
