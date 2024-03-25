import FileSystem from 'node:fs';
import Path from 'node:path';
import type JasmineType from 'jasmine';
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs/yargs';

const argv = await yargs(hideBin(process.argv)).argv;

const currentPath = process.cwd();

const json = JSON.parse(FileSystem.readFileSync(Path.join(currentPath, 'package.json')).toString());

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
