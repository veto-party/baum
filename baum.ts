import Path from 'path';
import { fileURLToPath } from 'url';
import { NPMPackageManager } from '@veto-party/baum__package_manager__npm';
import { GroupStep, IBaumManagerConfiguration, PKGMStep, ParallelStep } from 'baum';
import { CopyStep } from './core/src/implementation/Step/CopyStep.js';
import { PublicRegistryStep } from './registry/public/src/index.js';
import { VerdaccioRegistryStep } from './registry/verdaccio/src/index.js';
import { IVersionManager } from '@veto-party/baum__registry';

const __filename = fileURLToPath(import.meta.url);
const __dirname = Path.dirname(__filename);

export default async (baum: IBaumManagerConfiguration) => {
  const pm = new NPMPackageManager();

  baum.setPackageManager(pm);
  baum.setRootDirectory(__dirname);

  baum.addExecutionStep('install', new PKGMStep((intent) => intent.install().ci()));
  baum.addExecutionStep(
    'prepare',
    new ParallelStep([new GroupStep([new PKGMStep(PKGMStep.DEFAULT_TYPES.RunPGKMWhenKeyExists('test'))]), new PKGMStep(PKGMStep.DEFAULT_TYPES.RunPGKMWhenKeyExists('build'))])
  );

  const version = process.env.PUBLISH_VERSION ?? 'v0.0.0';

  if (process.env.NODE_AUTH_TOKEN && process.env.CI) {
    baum.addExecutionStep(
      'publish-npm',
      new (class extends PublicRegistryStep {
        modifyJSON(json: any, versionManager: IVersionManager) {
          super.modifyJSON(json, versionManager);
          if (json.scripts?.build.includes('tsc')) {
            json.main = './dist/index.js';
          }

          json.repository = {
            type: "git",
            url: "git+https://github.com/veto-party/baum.git"
          };
          json.bugs = "https://github.com/veto-party/baum/issues";
          json.homepage = "https://github.com/veto-party/baum#readme";
        }
      })(version, 'https://registry.npmjs.org/', process.env.NODE_AUTH_TOKEN).addInstallStep()
    );
  } else if (!process.env.CI) {
    baum.addExecutionStep('publish', new VerdaccioRegistryStep(version).addInstallStep());
  }
};
