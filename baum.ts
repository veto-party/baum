import Path from 'path';
import { fileURLToPath } from 'url';
import { NPMPackageManager } from '@veto-party/baum__package_manager__npm';
import { GroupStep, IBaumManagerConfiguration, PKGMStep, ParallelStep } from 'baum';
import { CopyStep } from './core/src/implementation/Step/CopyStep.js';
import { VerdaccioRegistryStep } from './registry/verdaccio/src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = Path.dirname(__filename);

export default async (baum: IBaumManagerConfiguration) => {

  const pm = new NPMPackageManager();

  baum.setPackageManager(pm);
  baum.setRootDirectory(__dirname);

  baum.addExecutionStep('install', new PKGMStep((intent) => intent.install().ci()));
  baum.addExecutionStep('prepare', new ParallelStep([
    new GroupStep([new PKGMStep(PKGMStep.DEFAULT_TYPES.RunPGKMWhenKeyExists("test")), new CopyStep('**/*.report.xml', (_, file) => Path.join(__dirname, 'out', new Date().toISOString(), Path.basename(file)))]),
    new PKGMStep(PKGMStep.DEFAULT_TYPES.RunPGKMWhenKeyExists("build")),
  ]));

  baum.addExecutionStep('publish', new VerdaccioRegistryStep("v0.0.0"));
};
