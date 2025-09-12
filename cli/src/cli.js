#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import Path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as util from 'node:util';

process.on('uncaughtException', (error) => {
  try {
    console.error(util.inspect(error));
  } catch (__error) {
    throw error;
  }
});

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason, reason.stack);
  // application specific logging, throwing an error, or other logic here
});

const __dirname = Path.dirname(fileURLToPath(import.meta.url));

if (!(process.env.NODE_OPTIONS || '').includes('--loader ts-node')) {
  /**
   * This code will get executed in js environment only.
   * If Typescript is detected using the code above, we will not end up here.
   */

  console.log("starting child process...")

  const childProcess = spawnSync(process.argv[0], process.argv.slice(1), {
    stdio: 'inherit',
    env: {
      ...process.env,
      TS_NODE_PROJECT: Path.join(__dirname, "tsconfig.json"),
      NODE_OPTIONS: [process.env.NODE_OPTIONS, '--loader ts-node/esm'].filter((item) => !!item).join(' ')
    },
    windowsHide: true
  });

  process.exit(childProcess.status ?? (childProcess.error ? 1 : 0));
}

async function main() {
  try {
    console.log("running main...")
    const { run } = await import('./runner.js');
    const success = await run();

    if (!success) {
      process.exit(1);
    }
  } catch (error) {
    console.error('error', error, Error.captureStackTrace(error));
    throw error;
  }
}

main();
