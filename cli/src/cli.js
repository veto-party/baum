#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import Path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as util from 'node:util';

const __dirname = fileURLToPath(Path.dirname(Path.dirname(import.meta.resolve('baum'))));

process.on('uncaughtException', (error) => {
  try {
    console.error(error[util.inspect.custom](error));
  } catch (__error) {
    throw error;
  }
});

if ((process.env.NODE_OPTIONS || '').includes('--loader ts-node')) await import('./runner.js');
else {
  const childProcess = spawnSync(process.argv[0], process.argv.slice(1), {
    stdio: 'inherit',
    env: {
      ...process.env,
      TS_NODE_PROJECT: __dirname,
      NODE_OPTIONS: [process.env.NODE_OPTIONS, '--loader ts-node/esm', '--trace-uncaught', '--trace-warnings'].filter((item) => !!item).join(' ')
    },
    windowsHide: true
  });

  process.exit(childProcess.status || 0);
}
