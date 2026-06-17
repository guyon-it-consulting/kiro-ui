import { Router } from 'express';
import { homedir } from 'os';
import { getTrustRules, setTrustRules, saveTrust } from './trust.js';

export interface RouteDeps {
  authToken: string;
  trustFile: string;
  getSettings: () => Record<string, string>;
  setSettings: (s: Record<string, string>) => void;
  saveSettings: () => Promise<void>;
}

export function createRoutes(deps: RouteDeps): Router {
  const router = Router();

  // Auth middleware
  router.use((req, res, next) => {
    if (req.path === '/token') return next();
    const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token;
    if (token !== deps.authToken) return res.status(401).json({ error: 'Unauthorized' });
    next();
  });

  router.get('/token', (_req, res) => res.json({ token: deps.authToken }));

  router.get('/trust', (_req, res) => res.json(getTrustRules()));
  router.put('/trust', async (req, res) => { setTrustRules(req.body || {}); await saveTrust(deps.trustFile); res.json(getTrustRules()); });

  router.get('/settings', (_req, res) => res.json(deps.getSettings()));
  router.put('/settings', async (req, res) => {
    deps.setSettings({ ...deps.getSettings(), ...req.body });
    await deps.saveSettings();
    res.json(deps.getSettings());
  });

  router.post('/pick-folder', async (req, res) => {
    const startPath = req.body?.startPath || homedir();
    if (!/^[a-zA-Z0-9 _\-./~:\\]+$/.test(startPath)) return res.json({ path: null });
    try {
      const { execFile } = await import('child_process');
      const { promisify } = await import('util');
      const exec = promisify(execFile);
      let folder: string | null = null;
      if (process.platform === 'darwin') {
        const script = `set f to POSIX path of (choose folder with prompt "Select workspace folder" default location POSIX file "${startPath.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}")\nreturn f`;
        const { stdout } = await exec('osascript', ['-e', script]);
        folder = stdout.trim().replace(/\/$/, '');
      } else if (process.platform === 'win32') {
        const ps = `Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.FolderBrowserDialog; $f.SelectedPath = '${startPath.replace(/'/g, "''")}'; if($f.ShowDialog() -eq 'OK'){$f.SelectedPath}`;
        const { stdout } = await exec('powershell', ['-NoProfile', '-Command', ps]);
        folder = stdout.trim() || null;
      } else {
        const { stdout } = await exec('zenity', ['--file-selection', '--directory', `--filename=${startPath}/`]);
        folder = stdout.trim() || null;
      }
      res.json({ path: folder });
    } catch { res.json({ path: null }); }
  });

  return router;
}
