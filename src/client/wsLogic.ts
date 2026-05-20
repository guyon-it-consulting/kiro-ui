/** WebSocket reconnection logic - extracted for testability */

export interface ReconnectState {
  attempt: number;
  delay: number;
  maxDelay: number;
  timer: ReturnType<typeof setTimeout> | null;
}

export function createReconnectState(): ReconnectState {
  return { attempt: 0, delay: 1000, maxDelay: 30000, timer: null };
}

export function nextDelay(state: ReconnectState): number {
  const delay = Math.min(state.delay * Math.pow(2, state.attempt), state.maxDelay);
  return delay;
}

export function resetReconnect(state: ReconnectState): ReconnectState {
  if (state.timer) clearTimeout(state.timer);
  return { ...state, attempt: 0, delay: 1000, timer: null };
}

export function incrementAttempt(state: ReconnectState): ReconnectState {
  return { ...state, attempt: state.attempt + 1 };
}

/** Message type classification */
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export function classifyStatus(wsReadyState: number): ConnectionStatus {
  switch (wsReadyState) {
    case 0: return 'connecting';
    case 1: return 'connected';
    default: return 'disconnected';
  }
}
