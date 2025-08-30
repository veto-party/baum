import Crypto from 'node:crypto';
import FileSystem from 'node:fs/promises';
import Path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type IExecutablePackageManager, type IWorkspace, RunOnce } from '@veto-party/baum__core';
import { DockerBuildStep } from '@veto-party/baum__steps__docker';
import yaml from 'yaml';

const __rootDir = Path.dirname(fileURLToPath(import.meta.resolve('@veto-party/baum__registry__verdaccio/package.json')));

const newConfigPath = (packageName: string, absolute?: boolean) => Path.join(...[absolute ? __rootDir : undefined, 'configuration', Crypto.createHash('sha256').update(packageName).digest().toString('hex'), 'config.yaml'].filter((value): value is string => typeof value === 'string'));

@RunOnce()
export class PrepareStep extends DockerBuildStep {
  constructor(
    name: string,
    private cwd: string,
    private public_address: string
  ) {
    super(Path.join(cwd, 'Dockerfile'), name, () => ({
      CONFIG_PATH: newConfigPath(cwd, false)
    }));
  }

  async execute(workspace: IWorkspace, pm: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    const packages = await pm.readWorkspace(rootDirectory);

    const prefixes = packages.reduce<string[]>((prev, currentPackage) => {
      if (currentPackage.getName().includes('@')) {
        const scope = currentPackage.getName().split('/')[0];
        if (!prev.includes(scope)) {
          prev.push(`${scope}/*`);
        }
      } else {
        prev.push('*');
      }

      return prev;
    }, []);

    const base = await FileSystem.readFile(Path.join(__rootDir, 'base.config.yaml'));
    const config = yaml.parse(base.toString());

    config.storage = '/storage/storage';
    config.plugins = '/storage/plugins';

    //config.VERDACCIO_PUBLIC_URL = this.public_address;

    config.packages;

    prefixes.forEach((prefix) => {
      config.packages[prefix] = {
        access: '$all',
        publish: '$all',
        proxy: '$all'
      };
    });

    const fullPath = newConfigPath(this.cwd, true);
    await FileSystem.mkdir(Path.dirname(fullPath), {
      recursive: true
    });
    await FileSystem.writeFile(
      fullPath,
      yaml.stringify(config, {
        defaultStringType: 'QUOTE_SINGLE'
      })
    );

    await super.execute(workspace, pm, rootDirectory);
  }
  async clean(_workspace: IWorkspace, _packageManager: IExecutablePackageManager, _rootDirectory: string): Promise<void> {
    // NO-OP
  }
}
