import React from 'react';

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) return <div className="message system">Something went wrong: {this.state.error.message}<br/><button onClick={() => this.setState({ error: null })}>Retry</button></div>;
    return this.props.children;
  }
}

// Re-export extracted components for backward compatibility
export { ToolBlock, ToolGroup } from './ToolBlock';
export { ThinkingBlock } from './ThinkingBlock';
export { MessageActions } from './MessageActions';
export { McpPanel } from './McpPanel';
export { SettingsPage } from './SettingsPage';
export { PanelMessage } from './PanelMessage';
