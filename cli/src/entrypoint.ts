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