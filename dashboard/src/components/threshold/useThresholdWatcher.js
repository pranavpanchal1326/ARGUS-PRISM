import { useState, useEffect, useRef, useCallback } from 'react';
import { THRESHOLDS } from './thresholdConfig';

/**
 * Custom hook to watch WarmthScore changes and trigger legal threshold events.
 * Deduplicates crossings per account per session.
 */
export function useThresholdWatcher({ currentScore, previousScore, accountId, onThresholdCrossed }) {
  const [activeCrossing, setActiveCrossing] = useState(null);
  const [crossingHistory, setCrossingHistory] = useState([]);
  const crossedSet = useRef(new Set()); // Stores `accountId-threshold`

  useEffect(() => {
    // Check for 75 crossing
    if (previousScore < 75 && currentScore >= 75) {
      triggerThreshold(75);
    }
    // Check for 85 crossing
    else if (previousScore < 85 && currentScore >= 85) {
      triggerThreshold(85);
    }
  }, [currentScore, previousScore, accountId]);

  const triggerThreshold = useCallback((thresholdValue) => {
    const key = `${accountId}-${thresholdValue}`;
    if (crossedSet.current.has(key)) return;

    const config = THRESHOLDS[thresholdValue];
    const event = {
      config,
      accountId,
      score: currentScore,
      timestamp: new Date().toISOString()
    };

    crossedSet.current.add(key);
    setActiveCrossing(event);
    setCrossingHistory(prev => [...prev, event]);

    if (onThresholdCrossed) {
      onThresholdCrossed(config, accountId);
    }
  }, [accountId, currentScore, onThresholdCrossed]);

  const dismissCrossing = useCallback(() => {
    setActiveCrossing(null);
  }, []);

  return {
    activeCrossing,
    dismissCrossing,
    crossingHistory
  };
}
