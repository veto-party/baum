import { type IExecutablePackageManager, type IWorkspace, RunOnce } from '@veto-party/baum__core';

import FileSystem from 'node:fs/promises';
import yaml from 'yaml';

import Path from 'node:path';
import { fileURLToPath } from 'node:url';

import Crypto from 'node:crypto';
import { DockerBuildStep } from '@veto-party/baum__steps__docker';

const __rootDir = Path.dirname(fileURLToPath(import.meta.resolve('@veto-party/baum__registry__verdaccio/package.json')));

const newConfigPath = (packageName: string, absolute?: boolean) => Path.join(...[absolute ? __rootDir : undefined, 'configuration', Crypto.createHash('sha256').update(packageName).digest().toString('hex'), 'config.yaml'].filter((value): value is string => typeof value === 'string'));

@RunOnce()
export class PrepareStep extends DockerBuildStep {
  private cwd: string;

  constructor(name: string, cwd: string) {
    super(`. --tag internal/${name} --build-arg CONFIG_PATH=${newConfigPath(cwd, false)}`, __rootDir);
    this.cwd = cwd;
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

    config.packages = {};

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
  async clean(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    // NO-OP
  }
}
