#!/usr/bin/env node
/**
 * pod CLI entry point
 * 
 * This file loads the compiled TypeScript CLI.
 * Run `npm run build` before using the CLI.
 */

import('../dist/index.js').catch((err) => {
  console.error('Error loading pod CLI:', err.message);
  console.error('');
  console.error('Make sure to run `npm run build` first.');
  process.exit(1);
});
