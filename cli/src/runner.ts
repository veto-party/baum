import Path from 'node:path';
import { BaumManager } from '@veto-party/baum__core';
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs/yargs';

const argv = await yargs(hideBin(process.argv)).argv;

export const run = async () => {
  const baum = new BaumManager();

  let path: string;
  if (typeof argv.config === 'string') {
    path = Path.isAbsolute(argv.config) ? argv.config : Path.join(process.cwd(), argv.config);
  } else {
    path = process.cwd();
  }

  await (await import(`file:///${path}`).catch(() => import(`file:///${Path.join(path, 'baum.js')}`))).default(baum);

  console.log('Running baum now!');
  const success = await baum.run().then(
    () => true,
    (error) => {
      console.error(error);
      return false;
    }
  );

  if (!success) {
    process.exit(1);
  }
};
