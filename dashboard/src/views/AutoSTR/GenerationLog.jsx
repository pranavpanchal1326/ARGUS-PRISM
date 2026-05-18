import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

const TAG = { fiu:'[FIU]  ', cbi:'[CBI]  ', rbi:'[RBI]  ', system:'[SYS]  ' };
const TAG_COLOR = { fiu:'var(--success)', cbi:'var(--accent)', rbi:'var(--warning)', system:'var(--text-tertiary)' };
const LVL_COLOR = { INFO:'var(--text-secondary)', SUCCESS:'var(--success)', WARN:'var(--warning)', ERROR:'var(--danger)' };
const LVL_LABEL = { INFO:'INFO   ', SUCCESS:'SUCCESS', WARN:'WARN   ', ERROR:'ERROR  ' };

function fmtTS(date) {
  const d=new Date(date);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}.${String(d.getMilliseconds()).padStart(3,'0')}`;
}

export default function GenerationLog({ log, globalStatus }) {
  const bodyRef = useRef(null);
  useEffect(()=>{
    if(bodyRef.current) bodyRef.current.scrollTop=bodyRef.current.scrollHeight;
  },[log.length]);

  return (
    <div style={{background:'var(--bg-elevated)',border:'1px solid var(--border-default)',
      borderRadius:'12px',overflow:'hidden'}}>

      {/* Terminal header */}
      <div style={{background:'var(--bg-surface)',borderBottom:'1px solid var(--border-default)',
        padding:'10px 24px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
          {['#FF5F57','#FEBC2E','#28C840'].map(c=>(
            <div key={c} style={{width:'10px',height:'10px',borderRadius:'50%',background:c}}/>
          ))}
          <span style={{fontFamily:'var(--font-mono)',fontSize:'10px',fontWeight:500,
            color:'var(--text-tertiary)',letterSpacing:'0.06em',marginLeft:'10px'}}>
            PRISM EVIDENCE ENGINE — AUDIT LOG
          </span>
        </div>
        {globalStatus==='COMPLETE' && (
          <span style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--success)'}}>
            ● IMMUTABLE — TAMPER EVIDENT
          </span>
        )}
      </div>

      {/* Log body */}
      <div ref={bodyRef} style={{
        height:'200px',overflowY:'auto',padding:'16px 24px',
        display:'flex',flexDirection:'column',gap:'6px',
        scrollbarWidth:'thin',scrollbarColor:'var(--border-strong) transparent',
      }}>
        {log.length===0 && (
          <span style={{fontFamily:'var(--font-mono)',fontSize:'11px',
            color:'var(--text-tertiary)',textAlign:'center',margin:'auto'}}>
            Awaiting generation command...
          </span>
        )}

        {log.map(entry=>(
          <motion.div key={entry.id}
            initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}}
            transition={{duration:0.18}}
            style={{display:'flex',alignItems:'flex-start',gap:'12px'}}
          >
            <span style={{fontFamily:'var(--font-mono)',fontSize:'10px',
              color:'var(--text-tertiary)',whiteSpace:'nowrap',width:'80px',flexShrink:0}}>
              {fmtTS(entry.timestamp)}
            </span>
            <span style={{fontFamily:'var(--font-mono)',fontSize:'10px',fontWeight:700,
              letterSpacing:'0.05em',width:'60px',flexShrink:0,
              color:LVL_COLOR[entry.level]||'var(--text-secondary)'}}>
              {LVL_LABEL[entry.level]||entry.level}
            </span>
            <span style={{fontFamily:'var(--font-mono)',fontSize:'10px',
              width:'60px',flexShrink:0,
              color:TAG_COLOR[entry.packageId]||'var(--text-tertiary)'}}>
              {TAG[entry.packageId]||`[${entry.packageId?.toUpperCase()}]`}
            </span>
            <span style={{fontFamily:'var(--font-mono)',fontSize:'11px',
              color:'var(--text-primary)',lineHeight:1.5,flex:1}}>
              {entry.message}
            </span>
          </motion.div>
        ))}

        {globalStatus==='GENERATING' && (
          <span style={{fontFamily:'var(--font-mono)',fontSize:'11px',
            color:'var(--accent)',animation:'blink-cursor 1s step-end infinite'}}>
            █
          </span>
        )}
      </div>
    </div>
  );
}
