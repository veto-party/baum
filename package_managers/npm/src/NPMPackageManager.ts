import Crypto from 'node:crypto';
import OldFileSystem from 'node:fs';
import FileSystem from 'node:fs/promises';
import OS from 'node:os';
import Path from 'node:path';
import { CachedFN, GenericWorkspace, type IExecutablePackageManager, type IExecutablePackageManagerParser, type IExecutionIntentBuilder, type IPackageManagerExecutor, type IWorkspace, TemplateBuilder, allSettledButFailure } from '@veto-party/baum__core';
import { clearCacheForFN } from '@veto-party/baum__core';
import { globby } from 'globby';
import { NPMExecutor } from './NPMExecutor.js';

export class NPMPackageManager implements IExecutablePackageManager {
  async getCleanLockFile(rootDirectory: string, workspace: IWorkspace): Promise<Parameters<(typeof FileSystem)['writeFile']>[1]> {
    const file = await FileSystem.readFile(Path.join(rootDirectory, 'package-lock.json'));
    const content = file.toString();
    const parser = JSON.parse(content);

    delete parser.packages[''].workspaces;
    Object.entries(parser.packages).forEach(([k, v]: [string, any]) => {
      if (!k.startsWith('node_modules') || v.link) {
        delete parser.packages[k];
      }
    });

    return JSON.stringify(parser);
  }

  modifyToRealVersionValue(version: string): string | false | undefined {
    return version === '*' ? '*' : undefined;
  }

  getLockFileName(): string {
    return 'package-lock.json';
  }

  private async checkCopy(rootDirectory: string, reversed: boolean): Promise<void> {
    const hash = Crypto.createHash('sha256').update(rootDirectory).digest('hex');

    let paths = [Path.join(rootDirectory, 'package.json'), Path.join(OS.tmpdir(), `${hash}-package.json-bak`)] as const;

    if (reversed) {
      paths = paths.toReversed() as [string, string];
    }

    await FileSystem.copyFile(...paths);

    if (OldFileSystem.existsSync(paths[0])) {
      await FileSystem.rm(paths[0]);
    }
  }

  async disableGlobalWorkspace(rootDirectory: string) {
    const file = JSON.parse((await FileSystem.readFile(Path.join(rootDirectory, 'package.json'))).toString());
    await this.checkCopy(rootDirectory, false);

    delete file.workspaces;

    await FileSystem.writeFile(Path.join(rootDirectory, 'package.json'), JSON.stringify(file));
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
          return globby(Path.join(path, 'package.json').replace(/\\/g, '//'), { cwd: cwd.replace(/\\/g, '//'), absolute: true, ignore: [Path.join('**', 'node_modules', '**')] });
        }

        const packagePath = Path.join(cwd, path, 'package.json');
        return OldFileSystem.existsSync(packagePath) ? [packagePath] : ([] as string[]);
      })
    );

    return await allSettledButFailure(
      resolvedPaths
        .flat()
        .filter((file) => file.endsWith('package.json') && !file.includes('node_modules'))
        .map((file) => Path.dirname(file))
        .map<Promise<IWorkspace>>(async (path) => {
          const packageJsonFile = await FileSystem.readFile(Path.join(path, 'package.json'));
          const packageJson = JSON.parse(packageJsonFile.toString());
          return new GenericWorkspace(path, packageJson, this.modifyToRealVersionValue.bind(this));
        })
    );
  }

  clearWorkspaceCache() {
    clearCacheForFN(this, 'readWorkspace');
  }

  @CachedFN(true)
  async readWorkspace(rootDirectory: string) {
    const file = await FileSystem.readFile(Path.join(rootDirectory, 'package.json'));
    const content = JSON.parse(file.toString());

    const workspaces = content.workspaces ?? [];

    if (Array.isArray(workspaces)) {
      return this.parseWorkspaces(workspaces, rootDirectory);
    }

    if (typeof workspaces === 'object' && Array.isArray(workspaces.packages)) {
      return this.parseWorkspaces(workspaces.packages, rootDirectory);
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
    return new NPMExecutor();
  }
}
