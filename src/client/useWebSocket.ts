import { useEffect, useRef, useState, useCallback } from 'react';
import { initToken, getToken } from './apiFetch';

export type WsStatus = 'connecting' | 'connected' | 'disconnected';

export function useWebSocket(onMessage: (data: any) => void) {
  const [status, setStatus] = useState<WsStatus>('connecting');
  const wsRef = useRef<WebSocket | null>(null);
  const retriesRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const onMessageRef = useRef(onMessage);
  const connectRef = useRef<() => void>(null);

  useEffect(() => { onMessageRef.current = onMessage; });

  const connect = useCallback(async () => {
    setStatus('connecting');
    await initToken();
    const wsHost = location.port === '5173' ? `${location.hostname}:3000` : location.host;
    const ws = new WebSocket(`ws://${wsHost}?token=${getToken()}`);
    wsRef.current = ws;

    ws.onopen = () => { setStatus('connected'); retriesRef.current = 0; };
    ws.onmessage = (e) => onMessageRef.current(JSON.parse(e.data));
    ws.onclose = () => {
      setStatus('disconnected');
      wsRef.current = null;
      const delay = Math.min(1000 * 2 ** retriesRef.current, 30000);
      retriesRef.current++;
      timerRef.current = setTimeout(() => connectRef.current?.(), delay);
    };
  }, []);

  useEffect(() => { connectRef.current = connect; }, [connect]);

  useEffect(() => {
    connect(); // eslint-disable-line react-hooks/set-state-in-effect
    return () => { clearTimeout(timerRef.current); wsRef.current?.close(); };
  }, [connect]);

  const send = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify(data));
  }, []);

  return { send, status };
}
