import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SettingsPage } from '../../src/client/SettingsPage';

vi.mock('../../src/client/apiFetch', () => ({
  apiFetch: vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })),
}));

const baseProps = {
  editor: 'vscode' as const,
  setEditor: vi.fn(),
  onClose: vi.fn(),
  send: vi.fn(),
  kiroSettings: { 'chat.diffTool': 'delta' },
  debugEnabled: false,
  setDebugEnabled: vi.fn(),
};

describe('SettingsPage', () => {
  it('renders header and close button', () => {
    render(<SettingsPage {...baseProps} />);
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeTruthy();
  });

  it('close button calls onClose', () => {
    render(<SettingsPage {...baseProps} />);
    screen.getByText('✕').click();
    expect(baseProps.onClose).toHaveBeenCalled();
  });

  it('renders section headings', () => {
    render(<SettingsPage {...baseProps} />);
    expect(screen.getByRole('heading', { name: 'General' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Permissions' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Limits' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Advanced' })).toBeTruthy();
  });

  it('renders kiro settings when provided', () => {
    render(<SettingsPage {...baseProps} />);
    expect(screen.getByText('chat.diffTool')).toBeTruthy();
  });

  it('renders empty kiro settings message', () => {
    render(<SettingsPage {...baseProps} kiroSettings={{}} />);
    expect(screen.getByText('No configurable settings available.')).toBeTruthy();
  });

  it('renders loading when kiroSettings is null', () => {
    render(<SettingsPage {...baseProps} kiroSettings={null} />);
    // Multiple "Loading..." may appear (trust + kiro settings)
    const loadings = screen.getAllByText('Loading...');
    expect(loadings.length).toBeGreaterThan(0);
  });

  it('renders editor select with options', () => {
    render(<SettingsPage {...baseProps} />);
    expect(screen.getByText('VS Code')).toBeTruthy();
    expect(screen.getByText('Cursor')).toBeTruthy();
    expect(screen.getByText('IntelliJ IDEA')).toBeTruthy();
  });

  it('sends kiro_settings_list on mount', () => {
    render(<SettingsPage {...baseProps} />);
    expect(baseProps.send).toHaveBeenCalledWith({ action: 'kiro_settings_list' });
  });
});
