import Path from 'path';
import { fileURLToPath } from 'url';
import { NPMPackageManager } from '@veto-party/baum__package_manager__npm';
import { IVersionManager } from '@veto-party/baum__registry';
import { GroupStep, IBaumManagerConfiguration, PKGMStep, ParallelStep } from 'baum';
import { PublicRegistryStep } from './registry/public/src/index.js';
import { VerdaccioRegistryStep } from './registry/verdaccio/src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = Path.dirname(__filename);

export default async (baum: IBaumManagerConfiguration) => {
  const pm = new NPMPackageManager();

  baum.setPackageManager(pm);
  baum.setRootDirectory(__dirname);

  const version = process.env.PUBLISH_VERSION ?? 'v0.0.0';

  const commonStep = new ParallelStep([new GroupStep([new PKGMStep(PKGMStep.DEFAULT_TYPES.RunPGKMWhenKeyExists('test'))]), new PKGMStep(PKGMStep.DEFAULT_TYPES.RunPGKMWhenKeyExists('build'))]);

  if (process.env.NODE_AUTH_TOKEN && process.env.CI) {
    baum.addExecutionStep(
      'publish-npm',
      new (class extends PublicRegistryStep {
        async modifyJSON(json: any, versionManager: IVersionManager) {
          await super.modifyJSON(json, versionManager);
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
    baum.addExecutionStep('publish', new VerdaccioRegistryStep(version).addInstallStep().addExecutionStep('prepare', commonStep));
  }
};
