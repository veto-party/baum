import Path from 'path';
import { fileURLToPath } from 'url';
import { NPMPackageManager } from '@veto-party/baum__package_manager__npm';
import { GroupStep, IBaumManagerConfiguration, PKGMStep, ParallelStep, PublishStep } from 'baum';
import FileSystem from 'fs/promises';
import { CopyStep } from './core/src/implementation/Step/CopyStep.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = Path.dirname(__filename);

export default (baum: IBaumManagerConfiguration) => {
  baum.setPackageManager(new NPMPackageManager());
  baum.setRootDirectory(__dirname);


  baum.addExecutionStep('prepare', new ParallelStep([
    new GroupStep([new PKGMStep((intent) => intent.run().setRunStep('test'))])
  ])
  baum.addExecutionStep('prepare', new ParallelStep([new GroupStep([new PKGMStep((()), new CopyStep('**/*.report.xml', (_, file) => Path.join(__dirname, 'out', new Date().toISOString(), Path.basename(file)))]), new PKGMStep('build')]));

  const oldFiles: Record<string, any> = {};

  baum.addExecutionStep('package_modification', {
    clean: async (workspace) => {
      const givenPath = Path.join(workspace.getDirectory(), 'package.json');

      const oldFile = oldFiles[`${workspace.getName()}-${workspace.getVersion()}`];

      if (oldFile) {
        await FileSystem.writeFile(givenPath, oldFiles[`${workspace.getName()}-${workspace.getVersion()}`]);
      }
    },
    execute: async (workspace, pm) => {
      const givenPath = Path.join(workspace.getDirectory(), 'package.json');
      const file = (await FileSystem.readFile(givenPath)).toString();

      oldFiles[`${workspace.getName()}-${workspace.getVersion()}`] = file;

      const jsonFile = JSON.parse(file);

      if (jsonFile.scripts && jsonFile.scripts.build.trim().startsWith('tsc')) {
        if (jsonFile.main !== undefined && jsonFile.main === "./src/index.ts") {
          jsonFile.main = './dist/index.js';
          jsonFile.types = './dist/index.d.ts';
        }
      }

      jsonFile.version = process.env.PUBLISH_VERSION;
      jsonFile.license = 'MIT';

      await FileSystem.writeFile(givenPath, JSON.stringify(jsonFile));
    }
  });

  baum.addExecutionStep('publish', new PublishStep());
};
