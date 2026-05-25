import { useEffect, useRef, useState, useCallback } from 'react';

export function useWebSocket(onMessage, url = null) {
  const [status, setStatus] = useState('CONNECTING');
  const wsRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef(null);
  const onMessageRef = useRef(onMessage);

  // Keep callback reference updated to avoid re-triggering effect
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const connect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    // Resolve base url: if absolute URL is provided in env, use it. Otherwise fall back to host.
    let wsUrl = url || import.meta.env.VITE_WS_URL;
    if (!wsUrl) {
      const isHttps = window.location.protocol === 'https:';
      const protocol = isHttps ? 'wss:' : 'ws:';
      const host = window.location.host.includes('localhost') || window.location.host.includes('127.0.0.1')
        ? 'localhost:8000'
        : window.location.host;
      wsUrl = `${protocol}//${host}/ws/live-feed`;
    }

    console.log('[WebSocket] Connecting to:', wsUrl);
    setStatus('CONNECTING');

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WebSocket] Connection established');
      setStatus('OPEN');
      reconnectAttemptsRef.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (onMessageRef.current) {
          onMessageRef.current(payload);
        }
      } catch (err) {
        console.error('[WebSocket] Failed to parse message:', err);
      }
    };

    ws.onerror = (error) => {
      console.error('[WebSocket] Error:', error);
    };

    ws.onclose = (event) => {
      console.log('[WebSocket] Connection closed:', event.code, event.reason);
      setStatus('CLOSED');
      
      // Exponential backoff for reconnection
      const baseDelay = 1000;
      const maxDelay = 30000;
      const delay = Math.min(maxDelay, baseDelay * Math.pow(2, reconnectAttemptsRef.current));
      reconnectAttemptsRef.current += 1;

      console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, delay);
    };
  }, [url]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        // Remove onclose handler so we don't trigger auto-reconnect on unmount
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [connect]);

  const send = useCallback((message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  return { status, send };
}
