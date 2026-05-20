import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';

let trustRules: Record<string, string> = {};

export function getTrustRules() { return trustRules; }
export function setTrustRules(rules: Record<string, string>) { trustRules = rules; }

export async function loadTrust(filePath: string, _readFile = readFile) {
  try { trustRules = JSON.parse(await _readFile(filePath, 'utf8') as string); } catch { trustRules = {}; }
}

export async function saveTrust(filePath: string, _mkdir = mkdir, _writeFile = writeFile) {
  await _mkdir(dirname(filePath), { recursive: true });
  await _writeFile(filePath, JSON.stringify(trustRules, null, 2));
}

export function matchTrust(title: string): 'allow_always' | 'reject_always' | null {
  if (trustRules[title] === 'allow_always') return 'allow_always';
  if (trustRules[title] === 'reject_always') return 'reject_always';
  return null;
}
