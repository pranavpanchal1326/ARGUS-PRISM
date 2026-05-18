import React from 'react';

/**
 * PaperGrain — SVG filter definition component.
 *
 * Renders nothing visible. Only defines the SVG filter IDs
 * that CSS references via filter: url(#paper-grain).
 *
 * Mount ONCE as the first child of App root.
 * Do not mount inside any scrolling container.
 *
 * Two filter definitions:
 *   #paper-grain      — light mode (slope 0.025 ≈ 2.5% opacity)
 *   #paper-grain-dark — dark mode  (slope 0.04  ≈ 4.0% opacity)
 */
export function PaperGrain() {
  return (
    <svg
      width="0"
      height="0"
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
      aria-hidden="true"
    >
      <defs>

        {/* ── LIGHT MODE FILTER — slope 0.025 ───────────────────── */}
        <filter
          id="paper-grain"
          x="0%"
          y="0%"
          width="100%"
          height="100%"
          colorInterpolationFilters="sRGB"
        >
          {/*
            feTurbulence: generates organic noise texture.
            - type="fractalNoise": non-repeating, organic pattern
            - baseFrequency="0.65": grain size (lower = larger grain)
            - numOctaves="3": detail layers — 3 is the sweet spot
            - stitchTiles="stitch": prevents tiling seams
          */}
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.65"
            numOctaves="3"
            stitchTiles="stitch"
            result="noise"
          />
          {/*
            feColorMatrix: desaturate noise to pure gray.
            - type="saturate" values="0": removes all colour tint
          */}
          <feColorMatrix
            in="noise"
            type="saturate"
            values="0"
            result="grayNoise"
          />
          {/*
            feComponentTransfer: controls grain visibility.
            - feFuncA slope="0.025": ~2.5% grain opacity (light mode)
            - Nearly imperceptible in screenshots, visible in person.
          */}
          <feComponentTransfer in="grayNoise" result="fadedNoise">
            <feFuncA type="linear" slope="0.025" />
          </feComponentTransfer>
          {/*
            feBlend: composites grain over source graphic.
            - mode="multiply": darkens underlying surface subtly
            - Creates the printed paper texture feel
          */}
          <feBlend
            in="SourceGraphic"
            in2="fadedNoise"
            mode="multiply"
            result="blended"
          />
          {/*
            feComposite: clips result to source graphic boundary.
            - operator="atop": grain does not bleed outside element
          */}
          <feComposite
            in="blended"
            in2="SourceGraphic"
            operator="atop"
          />
        </filter>

        {/* ── DARK MODE FILTER — slope 0.04 ─────────────────────── */}
        {/*
          Dark surfaces absorb more grain visually.
          0.04 slope needed to match the 0.025 perceived intensity
          of the light mode variant on dark backgrounds.
        */}
        <filter
          id="paper-grain-dark"
          x="0%"
          y="0%"
          width="100%"
          height="100%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.65"
            numOctaves="3"
            stitchTiles="stitch"
            result="noise"
          />
          <feColorMatrix
            in="noise"
            type="saturate"
            values="0"
            result="grayNoise"
          />
          {/* slope 0.04 — stronger than light mode, matches perceived grain */}
          <feComponentTransfer in="grayNoise" result="fadedNoise">
            <feFuncA type="linear" slope="0.04" />
          </feComponentTransfer>
          <feBlend
            in="SourceGraphic"
            in2="fadedNoise"
            mode="multiply"
            result="blended"
          />
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

export default PaperGrain;
