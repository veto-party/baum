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

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason, reason.stack);
  // application specific logging, throwing an error, or other logic here
});

if ((process.env.NODE_OPTIONS || '').includes('--loader ts-node')) {
  try {
    const { run } = await import('./runner.js');
    const success = await run();

    if (!success) {
      process.exit(1);
    }
  } catch (error) {
    console.error(error);
  }
} else {
  const childProcess = spawnSync(process.argv[0], process.argv.slice(1), {
    stdio: 'inherit',
    env: {
      ...process.env,
      TS_NODE_PROJECT: __dirname,
      NODE_OPTIONS: [process.env.NODE_OPTIONS, '--loader ts-node/esm', '--trace-uncaught', '--trace-warnings'].filter((item) => !!item).join(' ')
    },
    windowsHide: true
  });

  process.exit(childProcess.status ?? (childProcess.error ? 1 : 0));
}
