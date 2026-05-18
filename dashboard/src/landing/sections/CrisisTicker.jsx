import React from 'react';
import { motion } from 'framer-motion';
import useFadeInView from '../../hooks/useFadeInView';
import '../../design/landing-animations.css';

const TICKER_ITEMS = [
  { text: '₹36,014 Cr FY25 bank fraud',                                              highlight: true  },
  { text: 'Up 194% year-on-year',                                                     highlight: false },
  { text: '₹21,515 Cr in FY26 H1 alone',                                             highlight: true  },
  { text: '71% absorbed by public sector banks',                                      highlight: false },
  { text: '23 banks running MuleHunter.AI',                                           highlight: false },
  { text: "India's largest banks reverting to branch verification",                   highlight: false },
  { text: '15 seconds UPI fraud cashout window',                                      highlight: true  },
  { text: 'Supreme Court Writ 03/2025 directs AI-based mule detection',               highlight: false },
  { text: '5,092 fraud cases FY26 H1',                                                highlight: false },
  { text: 'Fraud cases fell 72% — losses rose 30%',                                  highlight: true  },
];

/* Doubled for seamless loop — translate exactly -50% */
const DOUBLED = [...TICKER_ITEMS, ...TICKER_ITEMS];

function CrisisTicker() {
  const { ref, inView } = useFadeInView({ threshold: 0.1, rootMargin: '0px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={{ opacity: inView ? 1 : 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      style={{
        width:        '100%',
        height:       '44px',
        background:   'var(--bg-surface)',
        borderTop:    '1px solid var(--border-default)',
        borderBottom: '1px solid var(--border-default)',
        overflow:     'hidden',
        position:     'relative',
        display:      'flex',
        alignItems:   'center',
        boxShadow:    'inset 0 1px 0 color-mix(in srgb, var(--accent) 8%, transparent)',
      }}
      aria-hidden="true"
    >
      {/* Left gradient fade mask */}
      <div
        style={{
          position:   'absolute',
          left:       0,
          top:        0,
          bottom:     0,
          width:      '80px',
          background: 'linear-gradient(to right, var(--bg-surface) 0%, transparent 100%)',
          zIndex:     2,
          pointerEvents: 'none',
        }}
      />

      {/* Right gradient fade mask */}
      <div
        style={{
          position:   'absolute',
          right:      0,
          top:        0,
          bottom:     0,
          width:      '80px',
          background: 'linear-gradient(to left, var(--bg-surface) 0%, transparent 100%)',
          zIndex:     2,
          pointerEvents: 'none',
        }}
      />

      {/*
        .ticker-track applies: animation: ticker-scroll 60s linear infinite
        We override duration to 70s inline.
        translateX(-50%) seamlessly loops because content is doubled.
      */}
      <div
        className="ticker-track"
        style={{ animationDuration: '70s', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}
      >
        {DOUBLED.map((item, i) => (
          <span
            key={i}
            style={{ display: 'inline-flex', alignItems: 'center' }}
          >
            {/* Item text */}
            <span
              className={item.highlight ? 'ticker-number' : undefined}
              style={{
                fontFamily:    'var(--font-mono)',
                fontSize:      '11px',
                fontWeight:    item.highlight ? 600 : 400,
                letterSpacing: '0.02em',
                color: item.highlight ? 'var(--accent)' : 'var(--text-secondary)',
              }}
            >
              {item.text}
            </span>
            {/* Separator dot — after every item (ensures seamless loop) */}
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize:   '8px',
                color:      'var(--accent)',
                margin:     '0 16px',
                lineHeight: 1,
              }}
              aria-hidden="true"
            >
              ●
            </span>
          </span>
        ))}
      </div>
    </motion.div>
  );
}

export default CrisisTicker;
