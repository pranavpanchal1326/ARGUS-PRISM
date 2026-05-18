import React from 'react';

/**
 * GrainFilter — SVG paper grain filter definition.
 *
 * Renders a zero-size SVG containing the #paper-grain filter definition.
 * Mount ONCE as the first child of App root. Never inside a scrolling
 * container or a transformed element.
 *
 * The filter is referenced in globals.css via:
 *   body { filter: url(#paper-grain); }
 *
 * Single filter (slope 0.03) — a middle ground between the light (0.025)
 * and dark (0.04) values in PaperGrain.jsx. For the 2C test scaffold
 * this single filter is sufficient. PaperGrain.jsx (dual-filter) is
 * used in production for per-mode grain strength.
 *
 * feTurbulence parameters — do not change without visual review:
 *   baseFrequency="0.65" — grain size, lower = larger grain
 *   numOctaves="3"       — detail layers, sweet spot for paper feel
 *   stitchTiles="stitch" — prevents visible tiling seams
 */
function GrainFilter() {
  return (
    <svg
      style={{
        position: 'absolute',
        width:    0,
        height:   0,
        overflow: 'hidden',
        top:      0,
        left:     0,
        pointerEvents: 'none',
      }}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <filter
          id="paper-grain"
          x="0%"
          y="0%"
          width="100%"
          height="100%"
          colorInterpolationFilters="sRGB"
        >
          {/* Generate organic, non-repeating fractal noise */}
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.65"
            numOctaves="3"
            stitchTiles="stitch"
            result="noise"
          />
          {/* Desaturate to pure gray — remove colour tint from noise */}
          <feColorMatrix
            in="noise"
            type="saturate"
            values="0"
            result="grayNoise"
          />
          {/* Control grain opacity — 0.03 = ~3% visible */}
          <feComponentTransfer in="grayNoise" result="fadedNoise">
            <feFuncA type="linear" slope="0.03" />
          </feComponentTransfer>
          {/* Blend grain over source graphic using multiply mode */}
          <feBlend
            in="SourceGraphic"
            in2="fadedNoise"
            mode="multiply"
            result="blended"
          />
          {/* Clip result to source graphic boundary — no bleed */}
          <feComposite
            in="blended"
            in2="SourceGraphic"
            operator="atop"
          />
        </filter>
      </defs>
    </svg>
  );
}

export default GrainFilter;
