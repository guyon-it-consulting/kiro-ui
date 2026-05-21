#!/usr/bin/env node
// Pre-build script: bundle server.ts into a single server.js for production Electron builds
import { execSync, spawnSync } from 'child_process';
import { writeFileSync } from 'fs';

console.log('Bundling server.ts for production...');
execSync(`npx esbuild server.ts --bundle --platform=node --target=node22 --format=esm --outfile=server.js --banner:js="import { createRequire } from 'module'; const require = createRequire(import.meta.url);"`, {
  stdio: 'inherit',
  cwd: process.cwd(),
});

// Write a package.json next to server.js so Node treats it as ESM
writeFileSync('server.package.json', JSON.stringify({ type: 'module' }));

console.log('Server bundled successfully.');
