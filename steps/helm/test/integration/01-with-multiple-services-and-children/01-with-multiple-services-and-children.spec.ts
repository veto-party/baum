import FileSystem from 'node:fs/promises';
import Path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BaumManager, CommandStep } from '@veto-party/baum__core';
import { NPMPackageManager } from '@veto-party/baum__package_manager__npm';
import { HelmGenerator } from '../../../src/HelmGenerator.js';
import { HelmGeneratorProvider } from '../../../src/HelmGeneratorProvider.js';
import { HelmPacker } from '../../../src/HelmPacker.js';
import { compareDirectories } from '../utility/compareDirectories.js';
import { Helm } from '../../../src/Helm.js';
import { StaticVersionProvider } from '../../../src/VersionStrategy/CurrentVersionMangager/implementation/StaticProvider.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = Path.dirname(__filename);

describe('A 01-with-multiple-services-and-children', () => {
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

      const helmfileProvider = new Helm(baum);
      helmfileProvider.setAliasGenerator((workspace) => workspace.getName().replaceAll('/', '__').replaceAll('@', ''));
      helmfileProvider.setVersionProvider(new StaticVersionProvider());
      helmfileProvider.setDockerFileForJobGenerator((schema) => schema.definition?.image ?? '');
      helmfileProvider.setDockerFileGenerator((workpace) => workpace.getName());

    await new Promise((resolve) => setTimeout(resolve, 100)); // Wait for file handles to flush.
    const compareResult = await compareDirectories(Path.join(testDirectory, 'helm'), Path.join(__dirname, 'expected-helm'));

    expect(compareResult).toBe(true);
  }, 20000);
});
