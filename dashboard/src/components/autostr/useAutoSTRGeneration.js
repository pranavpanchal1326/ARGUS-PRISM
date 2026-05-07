import { useState, useEffect, useRef, useCallback } from 'react';
import { PACKAGES, FEED_MESSAGES } from './autostrConfig';

export function useAutoSTRGeneration({ caseId, accountId, warmthScore, autoTrigger = false, onAllComplete }) {
  const [packages, setPackages] = useState(
    PACKAGES.reduce((acc, pkg) => {
      acc[pkg.id] = {
        ...pkg,
        status: 'IDLE',
        progress: 0,
        currentStep: 0,
        completedAt: null,
        fileSize: null,
        downloadUrl: null,
        error: null
      };
      return acc;
    }, {})
  );

  const [allComplete, setAllComplete] = useState(false);
  const [generationStartedAt, setGenerationStartedAt] = useState(null);
  const [feedMessages, setFeedMessages] = useState([]);
  const intervalsRef = useRef({});

  const addFeedMessage = useCallback((message) => {
    const timestamp = new Date().toLocaleTimeString('en-GB', { hour12: false });
    setFeedMessages(prev => {
      const next = [...prev, { time: timestamp, message }];
      return next.slice(-8); // Keep last 8
    });
  }, []);

  const triggerGeneration = useCallback(() => {
    if (generationStartedAt) return; // Already running
    
    setGenerationStartedAt(new Date().toISOString());
    
    PACKAGES.forEach((pkg, index) => {
      const stagger = index === 0 ? 0 : index === 1 ? 400 : 200;
      
      setTimeout(() => {
        setPackages(prev => ({
          ...prev,
          [pkg.id]: { ...prev[pkg.id], status: 'GENERATING' }
        }));
        
        startPackageSimulation(pkg.id);
      }, stagger);
    });
  }, [generationStartedAt]);

  const startPackageSimulation = (packageId) => {
    const pkg = PACKAGES.find(p => p.id === packageId);
    let step = 0;
    const totalSteps = 20;
    const intervalMs = pkg.estimatedMs / totalSteps;

    intervalsRef.current[packageId] = setInterval(() => {
      // Irregular interval simulation
      if (Math.random() > 0.3) {
        step++;
        const progress = (step / totalSteps) * 100;
        
        setPackages(prev => ({
          ...prev,
          [packageId]: { 
            ...prev[packageId], 
            progress, 
            currentStep: step,
            status: step === totalSteps ? 'COMPLETE' : 'GENERATING',
            completedAt: step === totalSteps ? new Date().toISOString() : null,
            fileSize: step === totalSteps ? (packageId === 'CBI_PACKAGE' ? '2.3 MB' : packageId === 'FIU_STR' ? '847 KB' : '142 KB') : null
          }
        }));

        // Fire feed message at 10% intervals (every 2 steps)
        if (step % 2 === 0) {
          const msgIndex = (step / 2) - 1;
          const msg = FEED_MESSAGES[packageId][msgIndex];
          if (msg) addFeedMessage(msg);
        }

        if (step === totalSteps) {
          clearInterval(intervalsRef.current[packageId]);
        }
      }
    }, intervalMs);
  };

  useEffect(() => {
    if (autoTrigger) triggerGeneration();
    return () => {
      Object.values(intervalsRef.current).forEach(clearInterval);
    };
  }, [autoTrigger, triggerGeneration]);

  useEffect(() => {
    const allDone = Object.values(packages).every(p => p.status === 'COMPLETE');
    if (allDone && generationStartedAt && !allComplete) {
      setAllComplete(true);
      if (onAllComplete) onAllComplete(packages);
    }
  }, [packages, generationStartedAt, allComplete, onAllComplete]);

  return {
    packages,
    allComplete,
    generationStartedAt,
    triggerGeneration,
    feedMessages
  };
}
