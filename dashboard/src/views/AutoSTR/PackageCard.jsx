import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SM = { type:'spring', stiffness:200, damping:30 };

function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="8" cy="8" r="6.5"/>
      <path d="M8 4.5V8l2.5 2"/>
    </svg>
  );
}

function CheckCircle() {
  return (
    <motion.svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <motion.circle cx="14" cy="14" r="13"
        stroke="var(--success)" strokeWidth="1.5" fill="var(--success-bg)"
        initial={{scale:0}} animate={{scale:1}} transition={{type:'spring',stiffness:400,damping:40}} />
      <motion.path d="M8 14l4 4 8-8" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" fill="none"
        initial={{pathLength:0}} animate={{pathLength:1}} transition={{duration:0.4,delay:0.15}} />
    </motion.svg>
  );
}

function statusBorder(s) {
  if(s==='GENERATING') return 'var(--accent-border)';
  if(s==='COMPLETE')   return 'color-mix(in srgb, var(--success) 30%, transparent)';
  if(s==='ERROR')      return 'var(--accent-border)';
  return 'var(--border-default)';
}
function statusShadow(s) {
  if(s==='GENERATING') return '0 0 0 1px var(--accent-border)';
  if(s==='COMPLETE')   return '0 4px 16px color-mix(in srgb, var(--success) 12%, transparent)';
  return 'none';
}
function fillColor(s) {
  if(s==='GENERATING') return 'var(--accent)';
  if(s==='COMPLETE')   return 'var(--success)';
  if(s==='ERROR')      return 'var(--danger)';
  return 'transparent';
}

function ISTTime(date) {
  if(!date) return '';
  const d=new Date(date.toLocaleString('en-US',{timeZone:'Asia/Kolkata'}));
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')} IST`;
}

export default function PackageCard({ pkg, index, isGlobalIdle }) {
  const [dots, setDots] = useState('');
  const [copied, setCopied] = useState(false);

  /* Dots cycling */
  useEffect(()=>{
    if(pkg.status!=='GENERATING'){setDots('');return;}
    let n=0;
    const id=setInterval(()=>{n=(n+1)%4;setDots('.'.repeat(n));},500);
    return ()=>clearInterval(id);
  },[pkg.status]);

  function copyHash(){
    navigator.clipboard.writeText(pkg.sha256||'');
    setCopied(true);
    setTimeout(()=>setCopied(false),1500);
  }

  function download(){
    if(!pkg.downloadUrl) return;
    const ext={fiu:'xml',cbi:'pdf',rbi:'json'}[pkg.id]||'txt';
    const a=document.createElement('a');
    a.href=pkg.downloadUrl;
    a.download=`PRISM-${pkg.id.toUpperCase()}-${Date.now()}.${ext}`;
    a.click();
  }

  const pct=Math.round(pkg.progress);

  return (
    <motion.div
      initial={{opacity:0,y:24}} animate={{opacity:1,y:0}}
      transition={{...SM, delay:index*0.1}}
      style={{
        background:'var(--bg-surface)',
        border:`1px solid ${statusBorder(pkg.status)}`,
        borderRadius:'16px', padding:'24px',
        display:'flex', flexDirection:'column', gap:'16px',
        position:'relative', overflow:'hidden',
        minHeight:'320px', boxShadow:statusShadow(pkg.status),
        transition:'border-color 0.3s ease, box-shadow 0.3s ease',
      }}
    >
      {/* Top accent progress line */}
      <div style={{position:'absolute',top:0,left:0,right:0,height:'2px',background:'var(--border-default)'}}>
        <div style={{
          position:'absolute',top:0,left:0,height:'2px',
          width:`${pkg.progress}%`,
          background:fillColor(pkg.status),
          transition:'width 0.1s linear',
          borderRadius:'0 1px 1px 0',
        }}/>
      </div>

      {/* Header */}
      <div style={{display:'flex',flexDirection:'column',gap:'4px'}}>
        <span style={{fontFamily:'var(--font-ui)',fontSize:'10px',fontWeight:700,
          letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--text-tertiary)'}}>
          {pkg.sublabel}
        </span>
        <span style={{fontFamily:'var(--font-display)',fontSize:'22px',fontWeight:700,
          fontVariationSettings:"'opsz' 32,'WONK' 0",color:'var(--text-primary)',lineHeight:1.1}}>
          {pkg.label}
        </span>
      </div>

      {/* Legal basis badge */}
      <div style={{display:'flex',flexDirection:'column',gap:'4px'}}>
        <span style={{
          display:'inline-flex',alignItems:'center',padding:'3px 10px',borderRadius:'999px',
          background: pkg.id==='cbi' ? 'var(--accent-subtle)' : 'color-mix(in srgb, var(--success-bg) 60%, transparent)',
          color:      pkg.id==='cbi' ? 'var(--accent)' : 'var(--success)',
          border:`1px solid ${pkg.id==='cbi'?'var(--accent-border)':'color-mix(in srgb, var(--success) 20%, transparent)'}`,
          fontFamily:'var(--font-ui)',fontSize:'10px',fontWeight:600,letterSpacing:'0.05em',
          alignSelf:'flex-start',
        }}>
          {pkg.legalBasis}
        </span>
        <span style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text-tertiary)'}}>
          → {pkg.recipient}
        </span>
      </div>

      <div style={{height:'1px',background:'var(--border-default)'}}/>

      {/* Status body */}
      <AnimatePresence mode="wait">
        <motion.div key={pkg.status}
          initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}
          transition={{duration:0.2}}
          style={{flex:1,display:'flex',flexDirection:'column',gap:'12px'}}
        >
          {pkg.status==='IDLE' && (
            <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
              <ClockIcon/>
              <span style={{fontFamily:'var(--font-ui)',fontSize:'12px',color:'var(--text-tertiary)'}}>
                Waiting for generation to start
              </span>
            </div>
          )}

          {pkg.status==='GENERATING' && (
            <>
              <div>
                <div style={{fontFamily:'var(--font-display)',fontSize:'36px',fontWeight:700,
                  fontVariationSettings:"'opsz' 48,'WONK' 0",fontVariantNumeric:'tabular-nums',
                  color:'var(--accent)',lineHeight:1}}>
                  {pct}
                </div>
                <div style={{fontFamily:'var(--font-ui)',fontSize:'11px',color:'var(--text-tertiary)'}}>
                  % complete
                </div>
              </div>
              <div style={{fontFamily:'var(--font-mono)',fontSize:'11px',color:'var(--text-secondary)'}}>
                Processing{dots}
              </div>
              <div style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text-tertiary)'}}>
                {pkg.format}
              </div>
            </>
          )}

          {pkg.status==='COMPLETE' && (
            <>
              <CheckCircle/>

              {/* SHA-256 */}
              <div>
                <div style={{fontFamily:'var(--font-ui)',fontSize:'10px',fontWeight:600,
                  textTransform:'uppercase',letterSpacing:'0.08em',color:'var(--text-tertiary)',marginBottom:'6px'}}>
                  SHA-256
                </div>
                <div style={{
                  display:'flex',alignItems:'center',justifyContent:'space-between',
                  background:'var(--bg-elevated)',border:'1px solid var(--border-default)',
                  borderRadius:'8px',padding:'8px 10px',position:'relative',
                }}>
                  <span style={{fontFamily:'var(--font-mono)',fontSize:'10px',
                    color:'var(--text-secondary)',letterSpacing:'0.04em',wordBreak:'break-all'}}>
                    {(pkg.sha256||'').slice(0,32)}...
                  </span>
                  <button onClick={copyHash}
                    style={{background:'none',border:'none',cursor:'pointer',padding:'2px',flexShrink:0,position:'relative'}}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.2">
                      <rect x="4" y="4" width="7" height="7" rx="1"/>
                      <path d="M2 8V2h6"/>
                    </svg>
                    {copied && (
                      <span style={{
                        position:'absolute',bottom:'20px',right:0,
                        background:'var(--text-primary)',color:'var(--bg-base)',
                        fontSize:'10px',padding:'2px 8px',borderRadius:'4px',whiteSpace:'nowrap',zIndex:10,
                      }}>Copied!</span>
                    )}
                  </button>
                </div>
              </div>

              {/* File info */}
              <div style={{display:'flex',gap:'16px'}}>
                {[
                  {label:'File size', value:pkg.fileSize},
                  {label:'Generated', value:ISTTime(pkg.generatedAt)},
                ].map(({label,value})=>(
                  <div key={label}>
                    <div style={{fontFamily:'var(--font-ui)',fontSize:'10px',fontWeight:600,
                      textTransform:'uppercase',letterSpacing:'0.08em',color:'var(--text-tertiary)',marginBottom:'2px'}}>
                      {label}
                    </div>
                    <div style={{fontFamily:'var(--font-mono)',fontSize:'11px',
                      fontWeight:500,color:'var(--text-secondary)'}}>
                      {value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Duration badge */}
              <span style={{
                display:'inline-flex',alignSelf:'flex-start',padding:'3px 10px',borderRadius:'999px',
                background:'var(--success-bg)',color:'var(--success)',
                border:'1px solid color-mix(in srgb, var(--success) 25%, transparent)',
                fontFamily:'var(--font-ui)',fontSize:'10px',fontWeight:600,
              }}>
                Generated in {((pkg.duration||0)/1000).toFixed(1)}s
              </span>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Footer */}
      {pkg.status==='GENERATING' && (
        <div>
          <div style={{height:'4px',background:'var(--bg-subtle)',borderRadius:'999px',overflow:'hidden'}}>
            <div style={{
              height:'100%',borderRadius:'999px',
              background:'linear-gradient(to right, var(--accent), color-mix(in srgb, var(--accent) 70%, var(--warning)))',
              width:`${pct}%`, transition:'width 0.1s linear',
            }}/>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',marginTop:'6px'}}>
            <span style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text-tertiary)'}}>
              Processing {pkg.format.split('—')[0].trim()}
            </span>
            <span style={{fontFamily:'var(--font-mono)',fontSize:'10px',fontWeight:500,color:'var(--text-secondary)'}}>
              {pct}%
            </span>
          </div>
        </div>
      )}

      {pkg.status==='COMPLETE' && (
        <button onClick={download} style={{
          width:'100%',fontFamily:'var(--font-ui)',fontSize:'13px',fontWeight:600,
          color:'var(--bg-base)',background:'var(--accent)',border:'none',borderRadius:'8px',
          padding:'10px',cursor:'pointer',transition:'background 0.15s ease',
        }}
          onMouseEnter={e=>e.target.style.background='var(--accent-hover)'}
          onMouseLeave={e=>e.target.style.background='var(--accent)'}
        >
          ↓ Download {pkg.sublabel}
        </button>
      )}
    </motion.div>
  );
}
