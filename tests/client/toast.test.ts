import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Toast logic', () => {
  let toasts: { id: number; text: string; type: string }[] = [];
  let toastId = 0;

  function addToast(text: string, type: 'info' | 'error' | 'warning' = 'info') {
    const id = ++toastId;
    toasts = [...toasts.slice(-4), { id, text, type }];
    setTimeout(() => { toasts = toasts.filter(x => x.id !== id); }, 5000);
  }

  beforeEach(() => { vi.useFakeTimers(); toasts = []; toastId = 0; });
  afterEach(() => { vi.useRealTimers(); });

  it('creates toast with incrementing id', () => {
    addToast('Hello', 'info');
    expect(toasts).toHaveLength(1);
    expect(toasts[0]).toEqual({ id: 1, text: 'Hello', type: 'info' });
    addToast('World', 'error');
    expect(toasts[1].id).toBe(2);
  });

  it('auto-dismisses after 5000ms', () => {
    addToast('Temp', 'info');
    expect(toasts).toHaveLength(1);
    vi.advanceTimersByTime(5000);
    expect(toasts).toHaveLength(0);
  });

  it('keeps max 5 toasts', () => {
    for (let i = 0; i < 7; i++) addToast(`Toast ${i}`, 'info');
    expect(toasts).toHaveLength(5);
    expect(toasts[0].text).toBe('Toast 2');
  });

  it('manual dismiss removes by id', () => {
    addToast('A', 'info');
    addToast('B', 'warning');
    const idToRemove = toasts[0].id;
    toasts = toasts.filter(x => x.id !== idToRemove);
    expect(toasts).toHaveLength(1);
    expect(toasts[0].text).toBe('B');
  });
});
