import React, { useState, useEffect } from 'react';
import { SYSTEM_SERVICES } from './liveThreatConfig';
import styles from './SystemHealth.module.css';

const HealthIndicator = ({ service, status }) => {
  const isDown = status === 'DOWN' || status === 'ERROR';
  const isDegraded = status === 'DEGRADED';
  const isLive = status === 'LIVE' || status === 'READY';

  let statusClass = styles.live;
  if (isDegraded) statusClass = styles.degraded;
  if (isDown) statusClass = styles.down;

  return (
    <div className={styles.indicatorUnit}>
      <div className={`${styles.square} ${statusClass}`} />
      <span className={`${styles.label} ${isDown ? styles.labelDown : ''}`}>{service.label}</span>
    </div>
  );
};

const SystemHealth = ({ systemHealth }) => {
  const [alertMessage, setAlertMessage] = useState(null);

  useEffect(() => {
    const degradedServices = Object.entries(systemHealth).filter(([_, status]) => status !== 'LIVE' && status !== 'READY');
    if (degradedServices.length > 0) {
      const [id, status] = degradedServices[0];
      const service = SYSTEM_SERVICES.find(s => s.id === id);
      const timestamp = new Date().toLocaleTimeString('en-GB', { hour12: false });
      setAlertMessage(`[${timestamp}] · ${service?.label || id} ${status} · MONITORING CONTINUES ON CACHED DATA`);
      
      const timer = setTimeout(() => setAlertMessage(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [systemHealth]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.indicators}>
        {SYSTEM_SERVICES.map(service => (
          <HealthIndicator 
            key={service.id} 
            service={service} 
            status={systemHealth[service.id]} 
          />
        ))}
      </div>
      
      {alertMessage && (
        <div className={styles.statusStrip}>
          <div className={styles.teletype}>{alertMessage}</div>
        </div>
      )}
    </div>
  );
};

export default SystemHealth;
