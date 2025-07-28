import Crypto from 'node:crypto';
import OldFileSystem from 'node:fs';
import FileSystem from 'node:fs/promises';
import OS from 'node:os';
import Path from 'node:path';
import { allSettledButFailure, CachedFN, clearCacheForFN, GenericWorkspace, type IExecutablePackageManager, type IExecutablePackageManagerParser, type IExecutionIntentBuilder, type IPackageManagerExecutor, type IWorkspace, TemplateBuilder } from '@veto-party/baum__core';
import { globby } from 'globby';
import yaml from 'yaml';
import { PNPMExecutor } from './PNPMExecutor.js';

export class PNPMPackageManager implements IExecutablePackageManager {
  getCleanLockFile(_rootDirectory: string): Promise<Parameters<(typeof FileSystem)['writeFile']>[1] | undefined> {
    return Promise.resolve(undefined);
  }

  modifyToRealVersionValue(version: string): string | false | undefined {
    return version.startsWith('workspace:') ? version.substring('workspace:'.length) : undefined;
  }

  getLockFileName(): string {
    return 'pnpm-lock.yaml';
  }

  private async checkCopy(rootDirectory: string, reversed: boolean): Promise<void> {
    const hash = Crypto.createHash('md5').update(rootDirectory).digest().toString('hex');

    let paths = [Path.join(rootDirectory, 'pnpm-workspace.yaml'), Path.join(OS.tmpdir(), `${hash}-pnpm-workspace.yaml-bak`)] as const;

    if (reversed) {
      paths = [...paths].reverse() as [string, string];
    }

    await FileSystem.copyFile(...paths);

    if (OldFileSystem.existsSync(paths[0])) {
      await FileSystem.rm(paths[0]);
    }
  }

  async disableGlobalWorkspace(rootDirectory: string) {
    await this.checkCopy(rootDirectory, false);
  }

  async enableGlobalWorkspace(rootDirectory: string) {
    await this.checkCopy(rootDirectory, true);
  }

  private async parseWorkspaces(workspacePaths: string[], cwd: string): Promise<IWorkspace[]> {
    const resolvedPaths = await allSettledButFailure(
      workspacePaths.map(async (path) => {
        path = path.replaceAll(/\//g, Path.sep);
        if (path.endsWith(`${Path.sep}*`) || path.endsWith('**')) {
          // https://github.com/sindresorhus/globby/issues/155
          // globby is b0rked on Windows: .sync nor .async deliver /any/ result.
          return await globby(Path.join(path, 'package.json').replace(/\\/g, '//'), { cwd: cwd.replace(/\\/g, '//'), absolute: true, ignore: [Path.join('**', 'node_modules', '**')] });
        }

        const packagePath = Path.join(cwd, path, 'package.json');
        return OldFileSystem.existsSync(packagePath) ? [packagePath] : ([] as string[]);
      })
    );

    return await allSettledButFailure(
      resolvedPaths
        .flat()
        .filter((file) => file.endsWith('package.json'))
        .map((file) => Path.dirname(file))
        .map<Promise<IWorkspace>>(async (path) => {
          const packageJsonFile = await FileSystem.readFile(Path.join(path, 'package.json'));
          const packageJson = JSON.parse(packageJsonFile.toString());

          return new GenericWorkspace(path, packageJson, this.modifyToRealVersionValue.bind(this));
        })
    );
  }

  clearWorkspaceCache(): void {
    clearCacheForFN(this, 'readWorkspace');
  }

  @CachedFN(true)
  async readWorkspace(rootDirectory: string) {
    const file = await FileSystem.readFile(Path.join(rootDirectory, 'pnpm-workspace.yaml'));
    const content = yaml.parse(file.toString());

    const workspaces = content.packages ?? [];

    if (Array.isArray(workspaces)) {
      return this.parseWorkspaces(workspaces, rootDirectory);
    }
    return [];
  }

  getExecutor(): IPackageManagerExecutor {
    return new (class implements IPackageManagerExecutor {
      startExecutionIntent(): IExecutionIntentBuilder {
        return new TemplateBuilder();
      }
    })();
  }
  getExecutorParser(): IExecutablePackageManagerParser {
    return new PNPMExecutor();
  }
}
