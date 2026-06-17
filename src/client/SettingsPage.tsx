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
  const [suggestionsEnabled, setSuggestionsEnabled] = useState(true);
  const [suggestionsRegion, setSuggestionsRegion] = useState('');
  const [suggestionsProfile, setSuggestionsProfile] = useState('');
  const [suggestionsModel, setSuggestionsModel] = useState('');
  const [suggestionsCount, setSuggestionsCount] = useState('3');
  const [suggestionsTest, setSuggestionsTest] = useState<{ status: 'idle' | 'loading' | 'ok' | 'error'; message?: string }>({ status: 'idle' });
  const [availableModels, setAvailableModels] = useState<{ id: string; name: string; group: string }[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
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
    setSuggestionsEnabled(d.suggestionsEnabled !== 'false');
    setSuggestionsRegion(d.suggestionsRegion || '');
    setSuggestionsProfile(d.suggestionsProfile || '');
    setSuggestionsModel(d.suggestionsModel || '');
    setSuggestionsCount(d.suggestionsCount || '3');
  }).catch(() => setFetchError('Failed to load settings')); }, []);
  useEffect(() => { send({ action: 'kiro_settings_list' }); }, []);
  const saveTrust = (updated: Record<string, string>) => { setTrust(updated); apiFetch('/api/trust', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) }).catch(() => setFetchError('Failed to save trust rules')); };
  const saveSetting = (key: string, value: string) => { setSecLimits(s => ({ ...s, [key]: value })); apiFetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [key]: value }) }).catch(() => setFetchError('Failed to save')); };
  const fetchModels = () => { setModelsLoading(true); apiFetch('/api/suggestions/models').then(r => r.json()).then(d => setAvailableModels(d.models || [])).catch(() => {}).finally(() => setModelsLoading(false)); };
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchModels(); }, []);
  const removeRule = (key: string) => { const { [key]: _removed, ...rest } = trust; saveTrust(rest); };
  // eslint-disable-next-line react-hooks/set-state-in-effect
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
          <thead><tr><th>Setting</th><th>Value</th></tr></thead>
          <tbody>
            <tr>
              <td>Workspace directory</td>
              <td>
                <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                  <input className="settings-input" style={{width:'280px'}} value={workspace} onChange={e => setWorkspace(e.target.value)} placeholder="~/.kiro-ui/workspace" />
                  <button className="settings-save-btn" onClick={(e) => { apiFetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workspace }) }).then(() => { (e.target as HTMLButtonElement).textContent = '✓ Saved'; setTimeout(() => { (e.target as HTMLButtonElement).textContent = 'Save'; }, 1500); }); }}>Save</button>
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
        <h3>ACP Transport</h3>
        <p className="settings-desc">How to connect to the Kiro agent. Changes apply to new sessions only.</p>
        <table className="trust-table">
          <thead><tr><th>Setting</th><th>Value</th></tr></thead>
          <tbody>
            <tr>
              <td>Transport mode</td>
              <td>
                <select value={transport} onChange={e => setTransport(e.target.value as TransportType)}>
                  <option value="process">Process (spawn command)</option>
                  <option value="tcp">TCP (connect to host:port)</option>
                </select>
              </td>
            </tr>
            {transport === 'process' && (
              <tr>
                <td>Command</td>
                <td><input className="settings-input" style={{width:'280px'}} value={acpCommand} onChange={e => setAcpCommand(e.target.value)} placeholder="kiro-cli acp" /></td>
              </tr>
            )}
            {transport === 'tcp' && (<>
              <tr><td>Host</td><td><input className="settings-input" style={{width:'200px'}} value={tcpHost} onChange={e => setTcpHost(e.target.value)} placeholder="localhost" /></td></tr>
              <tr><td>Port</td><td><input className="settings-input" style={{width:'80px'}} value={tcpPort} onChange={e => setTcpPort(e.target.value)} placeholder="9000" /></td></tr>
            </>)}
            <tr>
              <td></td>
              <td><button className="settings-save-btn" onClick={(e) => { apiFetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transport, acpCommand, tcpHost, tcpPort }) }).then(() => { (e.target as HTMLButtonElement).textContent = '✓ Saved'; setTimeout(() => { (e.target as HTMLButtonElement).textContent = 'Save transport'; }, 1500); }); }}>Save transport</button></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="settings-section">
        <h3>Suggestions</h3>
        <p className="settings-desc">Generate follow-up suggestions via Amazon Bedrock after each turn. Requires AWS credentials.</p>
        <table className="trust-table">
          <thead><tr><th>Setting</th><th>Value</th></tr></thead>
          <tbody>
            <tr><td>Enabled</td><td><label className="settings-toggle"><input type="checkbox" checked={suggestionsEnabled} onChange={e => { setSuggestionsEnabled(e.target.checked); saveSetting('suggestionsEnabled', String(e.target.checked)); }} /> {suggestionsEnabled ? 'On' : 'Off'}</label></td></tr>
            <tr><td>AWS Region</td><td><input className="settings-input" style={{width:'160px'}} value={suggestionsRegion} onChange={e => setSuggestionsRegion(e.target.value)} onBlur={e => saveSetting('suggestionsRegion', e.target.value)} placeholder="us-east-1" /></td></tr>
            <tr><td>AWS Profile</td><td><input className="settings-input" style={{width:'160px'}} value={suggestionsProfile} onChange={e => setSuggestionsProfile(e.target.value)} onBlur={e => saveSetting('suggestionsProfile', e.target.value)} placeholder="default" /></td></tr>
            <tr><td>Model</td><td><select className="settings-input" style={{width:'280px'}} value={suggestionsModel} onChange={e => { setSuggestionsModel(e.target.value); saveSetting('suggestionsModel', e.target.value); }}><option value="">amazon.nova-lite-v1:0 (default)</option>{['Inference Profiles', 'Foundation Models'].map(g => { const items = availableModels.filter(m => m.group === g); return items.length ? <optgroup key={g} label={g}>{items.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</optgroup> : null; })}</select>{modelsLoading && <span style={{color:'var(--text-dim)',marginLeft:'8px'}}>Loading...</span>}<button className="settings-save-btn" style={{marginLeft:'8px'}} onClick={() => { saveSetting('suggestionsRegion', suggestionsRegion); saveSetting('suggestionsProfile', suggestionsProfile); fetchModels(); }}>↻</button></td></tr>
            <tr><td>Suggestions count</td><td><input className="settings-input" style={{width:'60px'}} type="number" min="1" max="5" value={suggestionsCount} onChange={e => setSuggestionsCount(e.target.value)} onBlur={e => saveSetting('suggestionsCount', e.target.value)} /></td></tr>
            <tr><td>Test connection</td><td>
              <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                <button className="settings-save-btn" onClick={() => { setSuggestionsTest({ status: 'loading' }); apiFetch('/api/suggestions/test', { method: 'POST' }).then(r => r.json()).then(d => setSuggestionsTest(d.ok ? { status: 'ok', message: `✓ ${d.model}` } : { status: 'error', message: d.error })).catch(e => setSuggestionsTest({ status: 'error', message: e.message })); }}>Test model</button>
                {suggestionsTest.status === 'loading' && <span style={{color:'var(--text-dim)'}}>Testing...</span>}
                {suggestionsTest.status === 'ok' && <span style={{color:'var(--green)'}}>{suggestionsTest.message}</span>}
                {suggestionsTest.status === 'error' && <span style={{color:'var(--red)'}}>{suggestionsTest.message}</span>}
              </div>
            </td></tr>
          </tbody>
        </table>
      </div>

      <div className="settings-section">
        <h3>Trust Rules</h3>
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

      {kiroSettings && Object.keys(kiroSettings).length > 0 && <div className="settings-section">
        <h3>Kiro Agent Settings</h3>
        <p className="settings-desc">Settings from the Kiro CLI agent. Changes are applied immediately.</p>
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
      </div>}

      <div className="settings-section">
        <h3>Limits</h3>
        <p className="settings-desc">Resource limits for local Kiro agent processes. Changes apply after restart.</p>
        <table className="trust-table">
          <thead><tr><th>Setting</th><th>Value</th></tr></thead>
          <tbody>
            <tr><td>Max concurrent sessions</td><td><input className="settings-input" style={{width:'80px'}} defaultValue={secLimits.maxTabs || '10'} onBlur={e => saveSetting('maxTabs', e.target.value)} /></td></tr>
            <tr><td>Agent memory limit (MB)</td><td><input className="settings-input" style={{width:'80px'}} defaultValue={secLimits.maxChildMemMb || '512'} onBlur={e => saveSetting('maxChildMemMb', e.target.value)} /></td></tr>
            <tr><td>Max prompts per minute</td><td><input className="settings-input" style={{width:'80px'}} defaultValue={secLimits.maxMsgsPerMin || '30'} onBlur={e => saveSetting('maxMsgsPerMin', e.target.value)} /></td></tr>
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
