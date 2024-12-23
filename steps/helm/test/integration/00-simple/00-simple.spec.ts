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

describe('00-simple', () => {
  describe('A simple test', () => {
    const testDirectory = Path.join(__dirname, 'workspace');

    beforeEach(async () => {
      await FileSystem.rm(Path.join(testDirectory, 'helm'), {
        recursive: true
      }).catch(() => undefined);
    });

    it('Should run successfully', async () => {
      const baum = new BaumManager();

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

      baum.addExecutionStep('pack helm files', new HelmPacker(helmfileGenerator));
      baum.addExecutionStep('validate helm files', new CommandStep('helm lint .', Path.join(Path.resolve(testDirectory), 'helm', 'main')));

      await baum.run();

      await new Promise((resolve) => setTimeout(resolve, 100)); // Wait for file handles to flush.
      const compareResult = await compareDirectories(Path.join(testDirectory, 'helm'), Path.join(__dirname, 'expected-helm'));

      expect(compareResult).toBe(true);
    }, 40000);
  });

})