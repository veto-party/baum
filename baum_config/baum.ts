import Path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NPMPackageManager } from '@veto-party/baum__package_manager__npm';
import type { IVersionManager } from '@veto-party/baum__registry';
import { PublicRegistryStep } from '@veto-party/baum__registry__public';
import { VerdaccioRegistryStep } from '@veto-party/baum__registry__verdaccio';
import { ConditionalGitDiffStep } from '../steps/git_diff/src/index.js';
import { type IBaumManagerConfiguration, type IPackageManager, type IWorkspace, PKGMStep, ParallelStep } from 'baum';

const __filename = fileURLToPath(import.meta.url);
const __dirname = Path.join(Path.dirname(__filename), '..');

export default async (baum: IBaumManagerConfiguration) => {
  const pm = new NPMPackageManager();

  baum.setPackageManager(pm);
  baum.setRootDirectory(__dirname);

  if (process.env.CI_TEST || !process.env.CI) {
    baum.addExecutionStep('test', new ConditionalGitDiffStep(
      new PKGMStep(PKGMStep.DEFAULT_TYPES.RunPGKMWhenKeyExists('test')),
      () => process.env['github.event.repository.default_branch'] ?? 'main',
      async (_, git) => (await git.branchLocal()).current === (process.env['github.event.repository.default_branch'] ?? 'main')
    ));
    if (process.env.CI_TEST) {
      return;
    }
  }

  const version = process.env.PUBLISH_VERSION ?? 'v0.0.0';

  const commonStep = new ParallelStep([new PKGMStep(PKGMStep.DEFAULT_TYPES.RunPGKMWhenKeyExists('build')), new PKGMStep(PKGMStep.DEFAULT_TYPES.RunPGKMWhenKeyExists('generate'))]);

  if (process.env.NODE_AUTH_TOKEN && process.env.CI) {
    baum.addExecutionStep(
      'publish-npm',
      new (class extends PublicRegistryStep {
        async modifyJSON(json: any, versionManager: IVersionManager, workspace: IWorkspace, pm: IPackageManager, root: string) {
          await super.modifyJSON(json, versionManager, workspace, pm, root);
          if (json.scripts?.build.includes('tsc')) {
            json.main = './dist/index.js';
          }

          json.repository = {
            type: 'git',
            url: 'git+https://github.com/veto-party/baum.git'
          };
          json.bugs = 'https://github.com/veto-party/baum/issues';
          json.homepage = 'https://github.com/veto-party/baum#readme';
        }
      })(version, 'https://registry.npmjs.org/', process.env.NODE_AUTH_TOKEN)
        .addInstallStep()
        .addExecutionStep('prepare', commonStep)
    );
  } else if (!process.env.CI) {
    baum.addExecutionStep(
      'publish',
      new (class extends VerdaccioRegistryStep {
        async modifyJSON(json: any, versionManager: IVersionManager, workspace: IWorkspace, pm: IPackageManager, root: string): Promise<void> {
          await super.modifyJSON(json, versionManager, workspace, pm, root);
          if (json.scripts?.build.includes('tsc')) {
            json.main = './dist/index.js';
          }
        }
      })(version)
        .addInstallStep()
        .addExecutionStep('prepare', commonStep)
    );
  }
};
