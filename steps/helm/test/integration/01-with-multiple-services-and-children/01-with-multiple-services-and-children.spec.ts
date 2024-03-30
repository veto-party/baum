import FileSystem from 'node:fs/promises';
import Path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BaumManager, CommandStep } from '@veto-party/baum__core';
import { NPMPackageManager } from '@veto-party/baum__package_manager__npm';
import { HelmGenerator } from '../../../src/HelmGenerator.js';
import { HelmGeneratorProvider } from '../../../src/HelmGeneratorProvider.js';
import { HelmPacker } from '../../../src/HelmPacker.js';
import { compareDirectories } from '../utility/compareDirectories.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = Path.dirname(__filename);

describe('A 01-with-multiple-services-and-children', () => {
  const testDirectory = Path.join(__dirname, 'workspace');

  afterEach(async () => {
    await FileSystem.rm(Path.join(testDirectory, 'helm'), {
      recursive: true
    });
  });

  it('Should run successfully', async () => {
    const stage0 = new BaumManager();

    stage0.setRootDirectory(testDirectory);
    stage0.setPackageManager(new NPMPackageManager());
    stage0.dontCopyLockFile();

    const helmfileProvider = new HelmGeneratorProvider(
      () => 'helm.veto.json',
      () => true,
      (workspace, root) => workspace.getName().replaceAll('/', '__').replaceAll('@', '')
    );
    const helmfileGenerator = new HelmGenerator(
      helmfileProvider,
      (workspace) => workspace.getName(),
      (metadata) => metadata.definition?.image ?? '',
      '1.0.0'
    );

    stage0.addExecutionStep('provide helm metadata', helmfileProvider);
    stage0.addExecutionStep('generate helm files', helmfileGenerator);

    await stage0.run();

    const stage1 = new BaumManager();

    stage1.setRootDirectory(testDirectory);
    stage1.setPackageManager(new NPMPackageManager());
    stage1.dontCopyLockFile();

    stage1.addExecutionStep('pack helm files', new HelmPacker());
    stage1.addExecutionStep('validate helm files', new CommandStep('helm lint .', Path.join(Path.resolve(testDirectory), 'helm', 'main')));

    await stage1.run();

    await new Promise((resolve) => setTimeout(resolve, 100)); // Wait for file handles to flush.
    const compareResult = await compareDirectories(Path.join(testDirectory, 'helm'), Path.join(__dirname, 'expected-helm'));

    expect(compareResult).toBe(true);
  }, 20000);
});
