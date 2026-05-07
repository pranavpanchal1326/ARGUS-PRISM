import React from 'react';
import styles from './AlertQueue.module.css';
import AlertCard from './AlertCard';
import QueueHeader from './QueueHeader';
import { useAlertQueue } from './useAlertQueue';
import { resolveCardState } from './alertQueueConfig';

const AlertQueue = ({ onAction }) => {
  const {
    alerts,
    totalCount,
    imminentCount,
    criticalCount,
    hotCount,
    warmingCount,
    lastRefreshed,
    scanningFields
  } = useAlertQueue({
    onNewImminent: (alert) => {
      console.log('NEW IMMINENT ALERT:', alert.alertId);
    }
  });

  const handleCardAction = (actionType, alertId, accountId) => {
    if (onAction) {
      onAction(actionType, alertId, accountId);
    }
  };

  return (
    <div className={styles.canvas}>
      <QueueHeader 
        imminentCount={imminentCount}
        criticalCount={criticalCount}
        hotCount={hotCount}
        warmingCount={warmingCount}
        totalCount={totalCount}
        lastRefreshed={lastRefreshed}
      />

      {alerts.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyPrimary}>NO ACCOUNTS ABOVE MONITORING THRESHOLD</div>
          <div className={styles.emptySecondary}>PRISM IS WATCHING · 0 ACTIVE ALERTS</div>
        </div>
      ) : (
        <div className={styles.grid}>
          {alerts.map(alert => (
            <div 
              key={alert.alertId}
              className={styles.gridItem}
              data-state={resolveCardState(alert.warmthScore).id}
            >
              <AlertCard 
                alert={alert}
                isScanning={scanningFields.has(alert.alertId)}
                onAction={handleCardAction}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AlertQueue;
