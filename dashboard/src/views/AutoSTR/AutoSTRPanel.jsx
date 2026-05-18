import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useAutoSTR from './useAutoSTR';
import PackageCard from './PackageCard';
import GenerationLog from './GenerationLog';
import { generateAutoSTR as apiGenerate, downloadPackage as apiDownload } from '../../api/client';

const LEGAL = [
  { authority:'FIU-IND', mandate:'PMLA Section 12',
    detail:'Mandatory STR within 7 days of suspicion', prismTime:'< 60 minutes' },
  { authority:'CBI',     mandate:'SC Writ 03/2025',
    detail:'Primary investigation agency — digital arrest fraud', prismTime:'Auto-generated at WarmthScore 85+' },
  { authority:'RBI',     mandate:'Cyber Security Framework',
    detail:'Compulsory real-time fraud reporting', prismTime:'Event-driven — instant generation' },
];

function Spinner() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
    style={{animation:'spin 0.8s linear infinite',flexShrink:0}}>
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25"/>
    <path d="M14 8a6 6 0 00-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>;
}

function elapsedStr(startedAt) {
  if(!startedAt) return '00:00';
  const s=Math.floor((Date.now()-new Date(startedAt).getTime())/1000);
  return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
}

export default function AutoSTRPanel() {
  const { state, generate, reset } = useAutoSTR();
  const { globalStatus } = state;

  const [selectedCase, setSelectedCase] = useState('');
  const [elapsed, setElapsed] = useState('00:00');
  const timerRef = useRef(null);

  useEffect(()=>{
    if(globalStatus==='GENERATING'){
      timerRef.current=setInterval(()=>setElapsed(elapsedStr(state.startedAt)),1000);
    } else {
      clearInterval(timerRef.current);
      if(globalStatus!=='GENERATING') setElapsed('00:00');
    }
    return ()=>clearInterval(timerRef.current);
  },[globalStatus]);

  function handleGenerate(){
    if(!selectedCase) return;
    if(globalStatus==='COMPLETE'||globalStatus==='ERROR'){
      reset();
      setTimeout(()=>generate(selectedCase),100);
    } else {
      generate(selectedCase);
    }
  }

  const btnLabel = globalStatus==='GENERATING' ? 'Generating...'
    : globalStatus==='COMPLETE' ? 'Generate New Package'
    : globalStatus==='ERROR'   ? 'Retry Generation'
    : 'Generate Evidence Package';

  return (
    <div style={{padding:'32px',maxWidth:'1400px',display:'flex',flexDirection:'column',gap:'32px'}}>

      {/* Page header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:'16px'}}>
        <div>
          <h1 style={{fontFamily:'var(--font-display)',fontSize:'28px',fontWeight:700,
            fontVariationSettings:"'opsz' 36,'WONK' 0",color:'var(--text-primary)',margin:0}}>
            AutoSTR — Evidence Package Generator
          </h1>
          <p style={{fontFamily:'var(--font-ui)',fontSize:'13px',color:'var(--text-secondary)',marginTop:'4px',marginBottom:0}}>
            Generates FIU-IND XML, CBI Evidence PDF, and RBI Report simultaneously
          </p>
        </div>

        <div style={{display:'flex',alignItems:'center',gap:'12px',flexWrap:'wrap'}}>
          {/* Case selector */}
          <div style={{position:'relative'}}>
            <select value={selectedCase} onChange={e=>setSelectedCase(e.target.value)}
              style={{fontFamily:'var(--font-mono)',fontSize:'13px',color:'var(--text-primary)',
                background:'var(--bg-surface)',border:'1px solid var(--border-default)',
                borderRadius:'8px',padding:'8px 36px 8px 14px',cursor:'pointer',
                appearance:'none',outline:'none',minWidth:'280px'}}>
              <option value="">Select a case...</option>
              <option value="CASE-9912">CASE-9912 — UBI-2026-DEMO-001 (Score: 92)</option>
              <option value="CASE-9913">CASE-9913 — UBI-2026-DEMO-002 (Score: 84)</option>
              <option value="CASE-9914">CASE-9914 — UBI-2026-DEMO-003 (Score: 78)</option>
            </select>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
              stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round"
              style={{position:'absolute',right:'10px',top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}}>
              <path d="M2 4l4 4 4-4"/>
            </svg>
          </div>

          {/* Generate button */}
          <button onClick={handleGenerate}
            disabled={!selectedCase||globalStatus==='GENERATING'}
            style={{
              fontFamily:'var(--font-ui)',fontSize:'14px',fontWeight:600,
              color:'var(--bg-base)',background:'var(--accent)',
              border:'none',borderRadius:'10px',padding:'10px 20px',cursor:'pointer',
              display:'flex',alignItems:'center',gap:'8px',
              opacity:(!selectedCase||globalStatus==='GENERATING')?0.6:1,
              transition:'background 0.15s ease',
            }}
            onMouseEnter={e=>{if(selectedCase&&globalStatus!=='GENERATING')e.currentTarget.style.background='var(--accent-hover)';}}
            onMouseLeave={e=>e.currentTarget.style.background='var(--accent)'}
          >
            {globalStatus==='GENERATING'&&<Spinner/>}
            {btnLabel}
          </button>
        </div>
      </div>

      {/* Status banner */}
      <AnimatePresence mode="wait">
        {globalStatus==='GENERATING' && (
          <motion.div key="gen-banner"
            initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}
            transition={{duration:0.2}}
            style={{
              background:'color-mix(in srgb, var(--accent) 8%, var(--bg-surface))',
              border:'1px solid var(--accent-border)',borderRadius:'12px',
              padding:'16px 24px',display:'flex',alignItems:'center',gap:'16px',
            }}>
            <Spinner/>
            <div style={{flex:1}}>
              <div style={{fontFamily:'var(--font-ui)',fontSize:'14px',fontWeight:600,color:'var(--text-primary)'}}>
                Generating evidence packages...
              </div>
              <div style={{fontFamily:'var(--font-ui)',fontSize:'12px',color:'var(--text-secondary)'}}>
                Do not close this window. Generation is in progress.
              </div>
            </div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'18px',fontWeight:500,color:'var(--accent)',
              fontVariantNumeric:'tabular-nums',minWidth:'52px',textAlign:'right'}}>
              {elapsed}
            </div>
          </motion.div>
        )}

        {globalStatus==='COMPLETE' && (
          <motion.div key="done-banner"
            initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}
            transition={{duration:0.2}}
            style={{
              background:'var(--success-bg)',
              border:'1px solid color-mix(in srgb, var(--success) 25%, transparent)',
              borderRadius:'12px',padding:'16px 24px',
              display:'flex',alignItems:'center',gap:'16px',
            }}>
            <motion.div initial={{scale:0}} animate={{scale:1}}
              transition={{type:'spring',stiffness:400,damping:40}}
              style={{width:'28px',height:'28px',borderRadius:'50%',
                background:'var(--success-bg)',border:'2px solid var(--success)',
                display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <span style={{color:'var(--success)',fontWeight:700}}>✓</span>
            </motion.div>
            <div style={{flex:1}}>
              <div style={{fontFamily:'var(--font-ui)',fontSize:'14px',fontWeight:600,color:'var(--success)'}}>
                All evidence packages generated successfully
              </div>
              <div style={{fontFamily:'var(--font-ui)',fontSize:'12px',color:'var(--text-secondary)'}}>
                Total generation time: {((state.totalDuration||0)/1000).toFixed(1)}s · Packages cryptographically signed · Written to immutable log
              </div>
            </div>
            <button onClick={()=>console.log('MLRO submission triggered for',state.caseId)}
              style={{fontFamily:'var(--font-ui)',fontSize:'12px',fontWeight:600,
                color:'var(--bg-base)',background:'var(--accent)',border:'none',
                borderRadius:'8px',padding:'8px 16px',cursor:'pointer',whiteSpace:'nowrap'}}>
              Submit to MLRO for Approval
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Package cards grid */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'24px'}}>
        <PackageCard pkg={state.packages.fiu} index={0} isGlobalIdle={globalStatus==='IDLE'}/>
        <PackageCard pkg={state.packages.cbi} index={1} isGlobalIdle={globalStatus==='IDLE'}/>
        <PackageCard pkg={state.packages.rbi} index={2} isGlobalIdle={globalStatus==='IDLE'}/>
      </div>

      {/* Generation log */}
      <GenerationLog log={state.log} globalStatus={globalStatus}/>

      {/* Legal mandate footer */}
      {(globalStatus==='IDLE'||globalStatus==='COMPLETE') && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'16px'}}>
          {LEGAL.map((item,i)=>(
            <motion.div key={item.authority}
              initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}
              transition={{type:'spring',stiffness:200,damping:30,delay:i*0.1}}
              style={{background:'var(--bg-surface)',border:'1px solid var(--border-default)',
                borderRadius:'12px',padding:'16px 24px',display:'flex',flexDirection:'column',gap:'8px'}}>
              <div style={{fontFamily:'var(--font-mono)',fontSize:'10px',
                textTransform:'uppercase',color:'var(--text-tertiary)',letterSpacing:'0.08em'}}>
                {item.authority}
              </div>
              <div style={{fontFamily:'var(--font-display)',fontSize:'16px',fontWeight:600,
                fontVariationSettings:"'opsz' 24,'WONK' 0",color:'var(--text-primary)'}}>
                {item.mandate}
              </div>
              <div style={{fontFamily:'var(--font-ui)',fontSize:'12px',color:'var(--text-secondary)'}}>
                {item.detail}
              </div>
              <div style={{height:'1px',background:'var(--border-default)'}}/>
              <div style={{display:'flex',gap:'6px',alignItems:'baseline'}}>
                <span style={{fontFamily:'var(--font-mono)',fontSize:'11px',color:'var(--text-tertiary)'}}>
                  PRISM:
                </span>
                <span style={{fontFamily:'var(--font-mono)',fontSize:'11px',fontWeight:600,color:'var(--success)'}}>
                  {item.prismTime}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <style>{`
        @media(max-width:900px){
          .autostr-grid{grid-template-columns:1fr!important;}
        }
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes blink-cursor{0%,100%{opacity:1}50%{opacity:0}}
      `}</style>
    </div>
  );
}
