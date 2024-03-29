import Path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BaumManager } from '@veto-party/baum__core';
import { NPMPackageManager } from '@veto-party/baum__package_manager__npm';
import { HelmGenerator } from '../../../src/HelmGenerator.js';
import { HelmGeneratorProvider } from '../../../src/HelmGeneratorProvider.js';
import { compareDirectories } from '../utility/compareDirectories.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = Path.dirname(__filename);

describe('A simple test', () => {
  it('Should run successfully', async () => {
    const baum = new BaumManager();

    const testDirectory = Path.join(__dirname, 'workspace');

    baum.setRootDirectory(testDirectory);
    baum.setPackageManager(new NPMPackageManager());
    baum.dontCopyLockFile();

    const helmfileProvider = new HelmGeneratorProvider(
      () => 'helm.veto.json',
      (workspace) => workspace.getPackageFile().name.startsWith('@veto/'),
      (workspace, root) => workspace.getName().replaceAll('/', '__').replaceAll('@', '')
    );
    const helmfileGenerator = new HelmGenerator(
      helmfileProvider,
      (workspace) => workspace.getName(),
      (metadata) => metadata.definition?.image ?? '',
      '1.0.0'
    );

    baum.addExecutionStep('provide helm metadata', helmfileProvider);
    baum.addExecutionStep('generate helm files', helmfileGenerator);

    await baum.run();

    await new Promise((resolve) => setTimeout(resolve, 100)); // Wait for file handles to flush.
    const compareResult = await compareDirectories(Path.join(testDirectory, 'helm'), Path.join(__dirname, 'expected-helm'));

    expect(compareResult).toBe(true);
  });
});
