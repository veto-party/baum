import FileSystem from 'node:fs/promises';
import Path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BaumManager, type IStep } from '@veto-party/baum__core';
import { NPMPackageManager } from '@veto-party/baum__package_manager__npm';
import { simpleGit } from 'simple-git';
import { ConditionalGitDiffStep } from '../../../src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = Path.dirname(__filename);

const baseDir = Path.join(__dirname, 'test-repo');

describe('Simple test', () => {
  beforeEach(async () => {
    if (
      await FileSystem.stat(baseDir).then(
        () => true,
        () => false
      )
    ) {
      await FileSystem.rm(baseDir, { recursive: true, force: true });
    }

    await FileSystem.mkdir(baseDir);
    await FileSystem.cp(Path.join(__dirname, 'template'), baseDir, { recursive: true });

    const git = simpleGit({
      baseDir
    });

    await git.init(['-b', 'main']);

    await git.addConfig('user.email', 'example@example.com');
    await git.addConfig('user.name', 'Example example');

    await git.add('*');
    await git.commit('initial commit example');
    await git.checkoutBranch('example', 'main');
  });

  it('Not run anything', async () => {
    const baum = new BaumManager();

    baum.setPackageManager(new NPMPackageManager());
    baum.setRootDirectory(baseDir);

    let cleanHasRun = false;
    let executeHasRun = false;

    baum.addExecutionStep(
      'should-not-run',
      new ConditionalGitDiffStep(
        new (class implements IStep {
          async execute(): Promise<void> {
            executeHasRun = true;
          }
          async clean(): Promise<void> {
            cleanHasRun = true;
          }
        })(),
        () => 'main'
      )
    );

    let cleanHasRunSuccessfully = false;
    let executeHasRunSuccessfully = false;

    baum.addExecutionStep(
      'should-run',
      new (class implements IStep {
        async execute(): Promise<void> {
          executeHasRunSuccessfully = true;
        }

        async clean(): Promise<void> {
          cleanHasRunSuccessfully = true;
        }
      })()
    );

    await baum.run();

    expect(cleanHasRun).not.toBeTruthy();
    expect(executeHasRun).not.toBeTruthy();
    expect(cleanHasRunSuccessfully).toBeTruthy();
    expect(executeHasRunSuccessfully).toBeTruthy();
  });
});
