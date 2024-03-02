#!/usr/bin/env node
import { spawnSync } from 'child_process';

if ((process.env.NODE_OPTIONS || '').includes('--loader ts-node')) await import('./runner.js');
else {
  const childProcess = spawnSync(process.argv[0], process.argv.slice(1), {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_OPTIONS: [process.env.NODE_OPTIONS, '--loader ts-node/esm', '--trace-uncaught'].filter((item) => !!item).join(' ')
    },
    windowsHide: true
  });

  process.exit(childProcess.status || 0);
}
