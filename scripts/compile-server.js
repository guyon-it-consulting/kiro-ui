#!/usr/bin/env node
// Pre-build script: compile server.ts to server.js for production Electron builds
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

console.log('Compiling server.ts for production...');
execSync('npx tsc server.ts --outDir . --module ESNext --target ES2022 --moduleResolution bundler --esModuleInterop --skipLibCheck --resolveJsonModule', {
  stdio: 'inherit',
  cwd: process.cwd(),
});
console.log('Server compiled successfully.');
