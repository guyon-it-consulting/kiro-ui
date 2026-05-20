import { describe, it, expect } from 'vitest';
import { createReconnectState, nextDelay, resetReconnect, incrementAttempt, classifyStatus } from '../../src/client/wsLogic.js';

describe('WebSocket reconnect logic', () => {
  it('creates initial state with 0 attempts', () => {
    const state = createReconnectState();
    expect(state.attempt).toBe(0);
    expect(state.delay).toBe(1000);
    expect(state.maxDelay).toBe(30000);
  });

  it('nextDelay doubles with each attempt', () => {
    const state = createReconnectState();
    expect(nextDelay(state)).toBe(1000); // 1000 * 2^0
    expect(nextDelay({ ...state, attempt: 1 })).toBe(2000);
    expect(nextDelay({ ...state, attempt: 2 })).toBe(4000);
    expect(nextDelay({ ...state, attempt: 3 })).toBe(8000);
  });

  it('nextDelay caps at maxDelay', () => {
    const state = createReconnectState();
    expect(nextDelay({ ...state, attempt: 10 })).toBe(30000);
  });

  it('resetReconnect resets attempt to 0', () => {
    const state = { ...createReconnectState(), attempt: 5 };
    const reset = resetReconnect(state);
    expect(reset.attempt).toBe(0);
  });

  it('resetReconnect clears active timer', () => {
    const timer = setTimeout(() => {}, 10000);
    const state = { ...createReconnectState(), attempt: 3, timer };
    const reset = resetReconnect(state);
    expect(reset.timer).toBeNull();
  });

  it('incrementAttempt increases by 1', () => {
    const state = createReconnectState();
    expect(incrementAttempt(state).attempt).toBe(1);
    expect(incrementAttempt(incrementAttempt(state)).attempt).toBe(2);
  });
});

describe('classifyStatus', () => {
  it('readyState 0 = connecting', () => expect(classifyStatus(0)).toBe('connecting'));
  it('readyState 1 = connected', () => expect(classifyStatus(1)).toBe('connected'));
  it('readyState 2 = disconnected', () => expect(classifyStatus(2)).toBe('disconnected'));
  it('readyState 3 = disconnected', () => expect(classifyStatus(3)).toBe('disconnected'));
});
