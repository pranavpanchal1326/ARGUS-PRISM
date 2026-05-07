import React, { useEffect, useRef, useState } from 'react';

const PhosphorLine = ({ speedMultiplier = 1.0 }) => {
  const canvasRef = useRef(null);
  const particles = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = window.innerWidth;
    const height = 1;

    canvas.width = width;
    canvas.height = height;

    // Initialize particles
    particles.current = Array.from({ length: 12 }, () => ({
      x: Math.random() * width,
      width: 40 + Math.random() * 80,
      speed: 1 + Math.random() * 2,
      opacity: 0.6 + Math.random() * 0.4
    }));

    let animationFrame;

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      
      // Background (Void)
      ctx.fillStyle = '#0C0C09';
      ctx.fillRect(0, 0, width, height);

      particles.current.forEach(p => {
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = '#B8FF6B'; // Phosphor
        ctx.fillRect(p.x, 0, p.width, height);

        // Move
        p.x += p.speed * speedMultiplier;

        // Wrap around with random gap
        if (p.x > width) {
          p.x = -p.width - Math.random() * 80;
        }
      });

      animationFrame = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', handleResize);
    };
  }, [speedMultiplier]);

  return (
    <div className="phosphor-line-container">
      <canvas 
        ref={canvasRef} 
        style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '1px', 
          zIndex: 9999 
        }} 
      />
    </div>
  );
};

export default PhosphorLine;
