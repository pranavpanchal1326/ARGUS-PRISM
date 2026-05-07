import { useState, useEffect, useRef } from 'react';

/**
 * useNumberScanner
 * Rapidly cycles random numbers before snapping to the target value.
 * @param {number} targetValue - The real score to display.
 * @param {number} duration - Total animation time in ms (default 280).
 */
export const useNumberScanner = (targetValue, duration = 280) => {
  const [displayValue, setDisplayValue] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const timerRef = useRef(null);
  const scanEndRef = useRef(null);

  useEffect(() => {
    // Skip animation if target is 0 or on first render with 0
    if (targetValue === 0) {
      setDisplayValue(0);
      return;
    }

    // Start scanning
    setIsScanning(true);
    
    // Random cycle interval (every 28ms)
    timerRef.current = setInterval(() => {
      setDisplayValue(Math.floor(Math.random() * 100));
    }, 28);

    // Snap to real value after duration - 40ms
    scanEndRef.current = setTimeout(() => {
      clearInterval(timerRef.current);
      setDisplayValue(targetValue);
      setIsScanning(false);
    }, duration - 40);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (scanEndRef.current) clearTimeout(scanEndRef.current);
    };
  }, [targetValue, duration]);

  return { displayValue, isScanning };
};

export default useNumberScanner;
