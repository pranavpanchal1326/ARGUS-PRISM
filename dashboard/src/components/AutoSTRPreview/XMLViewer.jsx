import React, { useState, useEffect } from 'react';

const XMLViewer = ({ xml }) => {
  const [visibleLines, setVisibleLines] = useState(0);
  const lines = xml.split('\n');

  useEffect(() => {
    setVisibleLines(0);
    const interval = setInterval(() => {
      setVisibleLines(prev => {
        if (prev < lines.length) return prev + 1;
        clearInterval(interval);
        return prev;
      });
    }, 20);
    return () => clearInterval(interval);
  }, [xml]);

  const highlightXML = (line) => {
    // Simple custom tokenizer
    const tokens = [];
    let i = 0;
    while (i < line.length) {
      if (line[i] === '<') {
        let tagEnd = line.indexOf('>', i);
        if (tagEnd === -1) tagEnd = line.length;
        const tagContent = line.substring(i + 1, tagEnd);
        const isClosing = tagContent.startsWith('/');
        
        tokens.push(<span key={i} className="xml-token--bracket">{'<'}</span>);
        if (isClosing) tokens.push(<span key={i + 1} className="xml-token--bracket">{'/'}</span>);
        
        // Parse attributes
        const parts = (isClosing ? tagContent.substring(1) : tagContent).split(' ');
        const tagName = parts[0];
        tokens.push(<span key={i + 2} className="xml-token--tag">{tagName}</span>);
        
        for (let j = 1; j < parts.length; j++) {
          const attr = parts[j];
          if (attr.includes('=')) {
            const [name, val] = attr.split('=');
            tokens.push(<span key={i + 3 + j} className="xml-token--attr">{` ${name}=`}</span>);
            tokens.push(<span key={i + 4 + j} className="xml-token--value">{val}</span>);
          } else {
            tokens.push(<span key={i + 3 + j} className="xml-token--attr">{` ${attr}`}</span>);
          }
        }
        
        tokens.push(<span key={i + 10} className="xml-token--bracket">{'>'}</span>);
        i = tagEnd + 1;
      } else {
        let textEnd = line.indexOf('<', i);
        if (textEnd === -1) textEnd = line.length;
        tokens.push(<span key={i} className="xml-token--text">{line.substring(i, textEnd)}</span>);
        i = textEnd;
      }
    }
    return tokens;
  };

  return (
    <div className="xml-viewer">
      <div className="xml-viewer__header">
        <span className="font-ui ghost-text" style={{ fontSize: '9px' }}>FIU-IND XML · SAPTRN + SAPINP + SAPLEP + SAPPIT</span>
        <span className="font-data ghost-text" style={{ fontSize: '9px' }}>{lines.length} LINES</span>
      </div>

      <div className="xml-viewer__container">
        <div className="xml-viewer__lines">
          {lines.map((_, i) => (
            <span key={i} className="xml-line-num" style={{ opacity: i < visibleLines ? 1 : 0 }}>
              {(i + 1).toString().padStart(2, '0')}
            </span>
          ))}
        </div>
        <div className="xml-viewer__content">
          {lines.slice(0, visibleLines).map((line, i) => (
            <div key={i} style={{ whiteSpace: 'pre', minHeight: '1.6em' }}>
              {highlightXML(line)}
              {i === visibleLines - 1 && visibleLines < lines.length && (
                <span className="blinking-cursor" style={{ width: '8px', height: '14px', display: 'inline-block', backgroundColor: 'var(--phosphor)', verticalAlign: 'middle', marginLeft: '4px', animation: 'phosphorBreathe 0.5s infinite' }} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default XMLViewer;
