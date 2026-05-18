import { useEffect } from 'react';
import { useDemoContext } from './DemoContext';

const STEP_VIEWS = ['ALERT_QUEUE', 'ACCOUNT_TIMELINE', 'FLOW_GRAPH', 'AUTOSTR'];

/**
 * AutoPlayController — renders nothing, drives Shell navigation
 * based on autoPlayStep from DemoContext.
 * Must be mounted inside ShellContent so it has access to onNavigate.
 */
export function AutoPlayController({ onNavigate }) {
  const { isAutoPlaying, autoPlayStep } = useDemoContext();
  useEffect(() => {
    if (isAutoPlaying && onNavigate) {
      onNavigate(STEP_VIEWS[autoPlayStep] ?? 'ALERT_QUEUE');
    }
  }, [autoPlayStep, isAutoPlaying]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
