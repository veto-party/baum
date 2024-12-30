import FileSystem from 'node:fs';
import Path from 'node:path';
import { inspect } from 'node:util';
import type JasmineType from 'jasmine';
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs/yargs';

process.on('uncaughtException', (error) => {
  if (inspect.custom in error) {
    const inspector = error[inspect.custom];
    if (typeof inspector === 'function') {
      console.log(inspector());
      return;
    }

    console.log(inspector);
  }
});

(async () => {
  const argv = await yargs(hideBin(process.argv)).argv;
  const currentPath = process.cwd();

  let configuration: any = {};

  if (FileSystem.existsSync(Path.join(currentPath, 'jasmine.json'))) {
    configuration = JSON.parse(FileSystem.readFileSync(Path.join(currentPath, 'jasmine.json')).toString());
  } else {
    throw new Error('jasmine.json not found');
  }

  configuration.jsLoader = 'import';

  const { default: Jasmine }: { default: typeof JasmineType } = await import('jasmine');
  const jasmine = new Jasmine({
    numWorkers: 3
  } as any);

  jasmine.loadConfig(configuration);

  jasmine.exitOnCompletion = true;

  let f: string | undefined = undefined;

  if (argv.f) {
    f = argv.f.toString();
  }

  console.log('RUNNING JASMINE NOW!');
  await jasmine.execute(undefined, f);
})().catch(console.error);
