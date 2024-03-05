#!/usr/bin/env node
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import Path from 'path';

const __dirname = fileURLToPath(Path.dirname(Path.dirname(import.meta.resolve('baum'))));

console.log(__dirname);

process.on('uncaughtException', (error) => {
  console.log(JSON.stringify(error));
  throw error;
})

if ((process.env.NODE_OPTIONS || '').includes('--loader ts-node')) await import('./runner.js');

else {
  const childProcess = spawnSync(process.argv[0], process.argv.slice(1), {
    stdio: 'inherit',
    env: {
      ...process.env,
      TS_NODE_PROJECT: __dirname,
      NODE_OPTIONS: [process.env.NODE_OPTIONS, '--loader ts-node/esm', '--trace-uncaught'].filter((item) => !!item).join(' ')
    },
    windowsHide: true
  });

  process.exit(childProcess.status || 0);
}
