import React, { useState, useEffect, useRef } from 'react';
import styles from './GenerationFeed.module.css';

const FeedLine = ({ time, message, isLast, allComplete }) => {
  const [displayedText, setDisplayedText] = useState('');
  
  useEffect(() => {
    let index = 0;
    setDisplayedText('');
    const interval = setInterval(() => {
      if (index < message.length) {
        setDisplayedText(prev => prev + message[index]);
        index++;
      } else {
        clearInterval(interval);
      }
    }, 12);
    return () => clearInterval(interval);
  }, [message]);

  return (
    <div className={styles.line}>
      <span className={styles.time}>[{time}]</span>
      <span className={styles.message}>
        {' · '}{displayedText}
        {isLast && !allComplete && displayedText.length === message.length && (
          <span className={styles.cursor} />
        )}
      </span>
    </div>
  );
};

const GenerationFeed = ({ messages, allComplete }) => {
  const feedRef = useRef(null);

  return (
    <div className={styles.container}>
      <div className={styles.header}>GENERATION FEED</div>
      <div className={styles.feedArea} ref={feedRef}>
        {messages.map((msg, i) => (
          <FeedLine 
            key={i + msg.time} 
            time={msg.time} 
            message={msg.message} 
            isLast={i === messages.length - 1}
            allComplete={allComplete}
          />
        ))}
      </div>
    </div>
  );
};

export default GenerationFeed;
