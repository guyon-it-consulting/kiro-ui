import { useState, useEffect, useRef } from 'react';
import { apiFetch } from './apiFetch';
import type { EditorType, TransportType } from './types';

interface SettingsPageProps {
  editor: EditorType;
  setEditor: (v: EditorType) => void;
  onClose: () => void;
  send: (data: Record<string, unknown>) => void;
  kiroSettings: Record<string, unknown> | null;
  debugEnabled: boolean;
  setDebugEnabled: (v: boolean) => void;
}

export function SettingsPage({ editor, setEditor, onClose, send, kiroSettings, debugEnabled, setDebugEnabled }: SettingsPageProps) {
  const [trust, setTrust] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const [workspace, setWorkspace] = useState('');
  const [transport, setTransport] = useState<TransportType>('process');
  const [acpCommand, setAcpCommand] = useState('kiro-cli acp');
  const [tcpHost, setTcpHost] = useState('localhost');
  const [tcpPort, setTcpPort] = useState('9000');
  const [secLimits, setSecLimits] = useState<Record<string, string>>({});
  const [fetchError, setFetchError] = useState<string | null>(null);
  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  useEffect(() => { apiFetch('/api/trust').then(r => r.json()).then(d => { setTrust(d); setLoaded(true); }).catch(() => setFetchError('Failed to load trust rules')); }, []);
  useEffect(() => { apiFetch('/api/settings').then(r => r.json()).then(d => {
    setWorkspace(d.workspace || '');
    setTransport(d.transport || 'process');
    setAcpCommand(d.acpCommand || 'kiro-cli acp');
    setTcpHost(d.tcpHost || 'localhost');
    setTcpPort(d.tcpPort || '9000');
    setSecLimits({ maxTabs: d.maxTabs || '', maxMsgsPerMin: d.maxMsgsPerMin || '', maxChildMemMb: d.maxChildMemMb || '' });
  }).catch(() => setFetchError('Failed to load settings')); }, []);
  useEffect(() => { send({ action: 'kiro_settings_list' }); }, []);
  const saveTrust = (updated: Record<string, string>) => { setTrust(updated); apiFetch('/api/trust', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) }).catch(() => setFetchError('Failed to save trust rules')); };
  const saveSecurity = (key: string, value: string) => { setSecLimits(s => ({ ...s, [key]: value })); apiFetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [key]: value }) }).catch(() => setFetchError('Failed to save')); };
  const removeRule = (key: string) => { const { [key]: _removed, ...rest } = trust; saveTrust(rest); };
  const updateKiroSetting = (key: string, value: string) => {
    if (debounceRef.current[key]) clearTimeout(debounceRef.current[key]);
    debounceRef.current[key] = setTimeout(() => send({ action: 'kiro_settings_set', key, value }), 500);
  };
  return (
    <div className="settings-page">
      <div className="settings-header">
        <h2>Settings</h2>
        <button className="settings-close" onClick={onClose}>✕</button>
      </div>
      {fetchError && <p className="settings-desc" style={{color:'var(--red)'}}>{fetchError}</p>}

      <div className="settings-section">
        <h3>General</h3>
        <p className="settings-desc">Workspace and editor preferences.</p>
        <table className="trust-table">
          <tbody>
            <tr>
              <td>Workspace directory</td>
              <td>
                <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                  <input className="settings-input" style={{width:'280px'}} value={workspace} onChange={e => setWorkspace(e.target.value)} placeholder="~/.kiro-ui/workspace" />
                  <button className="settings-save-btn" onClick={() => apiFetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workspace }) })}>Save</button>
                </div>
              </td>
            </tr>
            <tr>
              <td>Editor for file links</td>
              <td>
                <select value={editor} onChange={e => setEditor(e.target.value as EditorType)}>
                  <option value="vscode">VS Code</option>
                  <option value="cursor">Cursor</option>
                  <option value="idea">IntelliJ IDEA</option>
                  <option value="none">None (plain text)</option>
                </select>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="settings-section">
        <h3>Workspace Directory</h3>
        <p className="settings-desc">Default working directory for new sessions. Defaults to ~/.kiro-ui/workspace.</p>
        <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
          <input className="settings-input" style={{width:'320px'}} value={workspace} onChange={e => setWorkspace(e.target.value)} placeholder="/path/to/your/project" />
          <button className="settings-save-btn" onClick={() => apiFetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workspace }) })}>Save</button>
        </div>
      </div>
      <div className="settings-section">
        <h3>ACP Transport</h3>
        <p className="settings-desc">How to connect to the Kiro agent. Use "Process" to spawn a local command, or "TCP" to connect to a remote agent (e.g. via socat tunnel).</p>
        <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
          <select value={transport} onChange={e => setTransport(e.target.value as TransportType)}>
            <option value="process">Process (spawn command)</option>
            <option value="tcp">TCP (connect to host:port)</option>
          </select>
          {transport === 'process' && (
            <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
              <input className="settings-input" style={{width:'320px'}} value={acpCommand} onChange={e => setAcpCommand(e.target.value)} placeholder="kiro-cli acp" />
            </div>
          )}
          {transport === 'tcp' && (
            <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
              <input className="settings-input" style={{width:'200px'}} value={tcpHost} onChange={e => setTcpHost(e.target.value)} placeholder="localhost" />
              <span style={{color:'var(--text-dim)'}}>:</span>
              <input className="settings-input" style={{width:'80px'}} value={tcpPort} onChange={e => setTcpPort(e.target.value)} placeholder="9000" />
            </div>
          )}
          <button className="settings-save-btn" onClick={() => apiFetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transport, acpCommand, tcpHost, tcpPort }) })}>Save transport</button>
          <p className="settings-desc" style={{fontSize:'11px',marginBottom:0}}>Changes apply to new tabs/sessions. Existing connections are not affected.</p>
        </div>
      </div>
      <div className="settings-section">
        <h3>Trust Rules</h3>
        <p className="settings-desc">Tools marked "Always allow" or "Always reject" are persisted here. These auto-apply on future permission requests.</p>
        {!loaded ? <p className="settings-desc">Loading...</p> : Object.keys(trust).length === 0 ? <p className="settings-desc" style={{fontStyle:'italic'}}>No trust rules configured yet.</p> : (
          <table className="trust-table">
            <thead><tr><th>Tool</th><th>Policy</th><th></th></tr></thead>
            <tbody>
              {Object.entries(trust).map(([tool, policy]) => (
                <tr key={tool}>
                  <td>{tool}</td>
                  <td><span className={`trust-badge ${policy}`}>{policy.replace('_', ' ')}</span></td>
                  <td><button className="trust-remove" onClick={() => removeRule(tool)}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="settings-section">
        <h3>Kiro Agent Settings</h3>
        <p className="settings-desc">Settings from the Kiro CLI agent. Changes are applied immediately.</p>
        {!kiroSettings ? <p className="settings-desc" style={{fontStyle:'italic'}}>Loading...</p> : Object.keys(kiroSettings).length === 0 ? <p className="settings-desc" style={{fontStyle:'italic'}}>No configurable settings available.</p> : (
          <table className="trust-table">
            <thead><tr><th>Key</th><th>Value</th></tr></thead>
            <tbody>
              {Object.entries(kiroSettings).map(([key, val]) => (
                <tr key={key}>
                  <td><code>{key}</code></td>
                  <td>{typeof val === 'boolean' ? (
                    <select value={String(val)} onChange={e => updateKiroSetting(key, e.target.value)}><option value="true">true</option><option value="false">false</option></select>
                  ) : (
                    <input className="settings-input" value={String(val ?? '')} onChange={e => updateKiroSetting(key, e.target.value)} />
                  )}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="settings-section">
        <h3>Permissions</h3>
        <p className="settings-desc">Persistent trust rules for tool calls. Tools marked "Always allow" or "Always reject" auto-apply without prompting.</p>
        {!loaded ? <p className="settings-desc">Loading...</p> : Object.keys(trust).length === 0 ? <p className="settings-desc" style={{fontStyle:'italic'}}>No trust rules configured yet.</p> : (
          <table className="trust-table">
            <thead><tr><th>Tool</th><th>Policy</th><th></th></tr></thead>
            <tbody>
              {Object.entries(trust).map(([tool, policy]) => (
                <tr key={tool}>
                  <td>{tool}</td>
                  <td><span className={`trust-badge ${policy}`}>{policy.replace('_', ' ')}</span></td>
                  <td><button className="trust-remove" onClick={() => removeRule(tool)}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="settings-section">
        <h3>Limits</h3>
        <p className="settings-desc">Resource limits for local Kiro agent processes. Changes apply after restart.</p>
        <table className="trust-table">
          <thead><tr><th>Setting</th><th>Value</th></tr></thead>
          <tbody>
            <tr><td>Max concurrent sessions (tabs)</td><td><input className="settings-input" style={{width:'80px'}} defaultValue={secLimits.maxTabs || '10'} onBlur={e => saveSecurity('maxTabs', e.target.value)} /></td></tr>
            <tr><td>Agent memory limit (MB)</td><td><input className="settings-input" style={{width:'80px'}} defaultValue={secLimits.maxChildMemMb || '512'} onBlur={e => saveSecurity('maxChildMemMb', e.target.value)} /></td></tr>
            <tr><td>Max prompts per minute</td><td><input className="settings-input" style={{width:'80px'}} defaultValue={secLimits.maxMsgsPerMin || '30'} onBlur={e => saveSecurity('maxMsgsPerMin', e.target.value)} /></td></tr>
          </tbody>
        </table>
      </div>

      <div className="settings-section">
        <h3>Advanced</h3>
        <p className="settings-desc">Developer tools and diagnostics.</p>
        <label className="settings-toggle"><input type="checkbox" checked={debugEnabled} onChange={e => { setDebugEnabled(e.target.checked); send({ action: 'set_debug', enabled: e.target.checked }); }} /> Show protocol log (raw ACP JSON-RPC traffic)</label>
      </div>
    </div>
  );
}
