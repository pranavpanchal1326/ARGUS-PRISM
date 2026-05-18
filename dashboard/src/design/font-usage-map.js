/**
 * PRISM — Font Usage Map
 * Single source of truth for "which typography class goes where".
 * Use this as a reference when building components.
 * AI reviewers: cross-check all component class names against this map.
 *
 * Team ARGUS · iDEA 2.0 · Union Bank of India
 */

export const FONT_USAGE = {
  // FRAUNCES — display
  landingHeroH1:        'type-hero-wonk',
  landingSectionTitle:  'type-display-lg type-display-opsz',
  dashboardScore:       'type-score-hero type-score-opsz tabular',
  kpiNumber:            'type-kpi tabular',
  cardScore:            'type-display-sm tabular',
  alertQueueScore:      'type-display-sm tabular',

  // DM SANS — ui
  navLinks:             'type-body-md',
  sidebarItems:         'type-body-md',
  sidebarSectionLabel:  'type-label-sm',
  buttonText:           'type-body-md',
  tableHeader:          'type-label-md',
  alertName:            'type-body-md',
  bodyText:             'type-body-lg',
  cardLabel:            'type-label-sm',
  pageTitle:            'type-heading-lg',
  sectionHeader:        'type-heading-md',

  // IBM PLEX MONO — data
  accountId:            'type-mono-sm tabular',
  timestamp:            'type-mono-xs tabular',
  transactionAmount:    'type-mono-md tabular',
  signalScore:          'type-mono-sm tabular',
  shapValue:            'type-mono-sm tabular',
  shaHash:              'type-mono-xs',
  xmlPreview:           'type-mono-xs',
  liveClockNavbar:      'type-mono-xs tabular',
  tickerText:           'type-ticker',
  badgeCount:           'type-mono-xs tabular',
};
