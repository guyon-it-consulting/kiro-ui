import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToolBlock } from '../../src/client/components';

describe('ToolBlock', () => {
  const baseTool = { toolCallId: 'tc-1', title: 'Read src/app.ts', status: 'completed', expanded: false };

  it('renders title and status', () => {
    render(<ToolBlock tool={baseTool} onToggle={() => {}} editor="vscode" />);
    expect(screen.getByText('completed')).toBeInTheDocument();
  });

  it('shows arrow when expandable (has rawInput)', () => {
    const { container } = render(<ToolBlock tool={{ ...baseTool, rawInput: { path: '/x' } }} onToggle={() => {}} editor="vscode" />);
    expect(container.querySelector('.arrow')).toBeInTheDocument();
  });

  it('no arrow when not expandable', () => {
    const { container } = render(<ToolBlock tool={baseTool} onToggle={() => {}} editor="vscode" />);
    expect(container.querySelector('.arrow')).not.toBeInTheDocument();
  });

  it('calls onToggle when header clicked', () => {
    const onToggle = vi.fn();
    render(<ToolBlock tool={{ ...baseTool, rawInput: { x: 1 } }} onToggle={onToggle} editor="vscode" />);
    fireEvent.click(screen.getByText('completed').closest('.tool-header')!);
    expect(onToggle).toHaveBeenCalled();
  });

  it('shows expanded class when expanded', () => {
    const { container } = render(<ToolBlock tool={{ ...baseTool, expanded: true, rawInput: {} }} onToggle={() => {}} editor="vscode" />);
    expect(container.querySelector('.tool-block.expanded')).toBeInTheDocument();
  });

  it('renders raw input in details when expanded', () => {
    render(<ToolBlock tool={{ ...baseTool, expanded: true, rawInput: { path: '/src/app.ts' } }} onToggle={() => {}} editor="vscode" />);
    expect(screen.getByText('Input')).toBeInTheDocument();
  });

  it('renders raw output in details when expanded', () => {
    render(<ToolBlock tool={{ ...baseTool, expanded: true, rawOutput: 'file content here' }} onToggle={() => {}} editor="vscode" />);
    expect(screen.getByText('Output')).toBeInTheDocument();
    expect(screen.getByText('file content here')).toBeInTheDocument();
  });

  it('renders file path as vscode link', () => {
    const { container } = render(<ToolBlock tool={baseTool} onToggle={() => {}} editor="vscode" />);
    const link = container.querySelector('a.file-link');
    expect(link).toBeInTheDocument();
    expect(link?.getAttribute('href')).toContain('vscode://file/');
  });

  it('renders file path as cursor link', () => {
    const { container } = render(<ToolBlock tool={baseTool} onToggle={() => {}} editor="cursor" />);
    const link = container.querySelector('a.file-link');
    expect(link?.getAttribute('href')).toContain('cursor://file/');
  });

  it('renders plain text when editor is none', () => {
    const { container } = render(<ToolBlock tool={baseTool} onToggle={() => {}} editor="none" />);
    expect(container.querySelector('a.file-link')).not.toBeInTheDocument();
  });

  it('renders title without file path as plain text', () => {
    const tool = { toolCallId: 'tc-1', title: 'Thinking about code', status: 'completed', expanded: false };
    render(<ToolBlock tool={tool} onToggle={() => {}} editor="vscode" />);
    expect(screen.getByText('Thinking about code')).toBeInTheDocument();
  });

  it('renders diff viewer for diff content when expanded', () => {
    const tool = { ...baseTool, expanded: true, content: [{ type: 'diff', path: '/app.ts', oldText: 'a', newText: 'b' }] };
    const { container } = render(<ToolBlock tool={tool} onToggle={() => {}} editor="vscode" />);
    expect(container.querySelector('.diff')).toBeInTheDocument();
  });
});
