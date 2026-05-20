#!/usr/bin/env node
// Generate app icons from SVG for all platforms
// Run: node scripts/generate-icons.js
// Requires: sharp (npm install sharp --save-dev)
//
// For now, create a placeholder PNG that electron-builder can use.
// Replace build/icon.png with your actual icon (1024x1024) and re-run.

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const buildDir = join(__dirname, '..', 'build');

// Minimal 1024x1024 PNG with the Kiro ghost (purple on dark)
// This is a placeholder SVG - replace with actual icon asset
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" rx="200" fill="#131313"/>
  <g transform="translate(256, 200) scale(22)">
    <path d="M7.5 16.5c-1.8 4-0.3 5.2 2.5 3.3 0.8 2.6 3.7 1.6 4.8 0 2.5-4.5 1.5-9.1 1.3-10 -1.8-6.4-10.7-6.4-12.2 0-0.4 1.1-0.4 2.4-0.6 3.7-0.1 0.7-0.2 1.1-0.4 1.8-0.2 0.4-0.4 0.8-0.7 1.4-0.5 0.9-0.3 2.8 2.3 1.8l0.2-0.1z" fill="#9046ff" stroke="#9046ff" stroke-width="0.5"/>
    <ellipse cx="12.5" cy="9.5" rx="0.9" ry="1.3" fill="#131313"/>
    <ellipse cx="15.5" cy="9.5" rx="0.9" ry="1.3" fill="#131313"/>
  </g>
</svg>`;

writeFileSync(join(buildDir, 'icon.svg'), svg);
console.log('Created build/icon.svg');
console.log('');
console.log('To generate platform icons, install sharp and run:');
console.log('  npm install sharp --save-dev');
console.log('  Then use sharp to convert icon.svg to:');
console.log('  - build/icon.icns (macOS)');
console.log('  - build/icon.ico (Windows)');
console.log('  - build/icons/256x256.png (Linux)');
console.log('');
console.log('Or use https://www.electron.build/icons for manual conversion.');
