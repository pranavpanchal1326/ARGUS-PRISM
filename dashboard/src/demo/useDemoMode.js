import { useState, useCallback, useRef } from 'react';

const STEP_DURATION_MS = 60000;

export function useDemoMode() {
  const [isDemoMode,      setIsDemoMode]      = useState(false);
  const [isAutoPlaying,   setIsAutoPlaying]   = useState(false);
  const [autoPlayStep,    setAutoPlayStep]    = useState(0);
  const [focusedAccountId, setFocusedAccountId] = useState('UBI-2026-DEMO-001');
  const timerRef = useRef(null);

  const enterDemoMode = useCallback(() => {
    setIsDemoMode(true);
    setAutoPlayStep(0);
    setFocusedAccountId('UBI-2026-DEMO-001');
  }, []);

  const exitDemoMode = useCallback(() => {
    setIsDemoMode(false);
    setIsAutoPlaying(false);
    setAutoPlayStep(0);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const stopAutoPlay = useCallback(() => {
    setIsAutoPlaying(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const startAutoPlay = useCallback(() => {
    setIsAutoPlaying(true);
    setAutoPlayStep(0);
    timerRef.current = setInterval(() => {
      setAutoPlayStep(prev => {
        if (prev >= 3) { clearInterval(timerRef.current); timerRef.current = null; setIsAutoPlaying(false); return 3; }
        return prev + 1;
      });
    }, STEP_DURATION_MS);
  }, []);

  const resetDemo = useCallback(() => {
    stopAutoPlay();
    setAutoPlayStep(0);
    setFocusedAccountId('UBI-2026-DEMO-001');
  }, [stopAutoPlay]);

  const goToStep = useCallback((step) => { setAutoPlayStep(step); }, []);

  return {
    isDemoMode, isAutoPlaying, autoPlayStep, focusedAccountId,
    setFocusedAccountId, enterDemoMode, exitDemoMode,
    startAutoPlay, stopAutoPlay, resetDemo, goToStep,
  };
}
