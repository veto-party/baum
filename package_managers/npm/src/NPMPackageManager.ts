import Crypto from 'crypto';
import OldFileSystem from 'fs';
import OS from 'node:os';
import Path from 'path';
import { CachedFN, GenericWorkspace, IExecutablePackageManager, IExecutionIntentBuilder, IPackageManagerExecutor, IWorkspace, TemplateBuilder } from '@veto-party/baum__core';
import { IExecutablePackageManagerParser } from '@veto-party/baum__core/src/interface/PackageManager/executor/IPackageManagerParser.js';
import FileSystem from 'fs/promises';
import { globby } from 'globby';
import shelljs from 'shelljs';
import { NPMExecutor } from './NPMExecutor.js';

const { exec } = shelljs;

export class NPMPackageManager implements IExecutablePackageManager {
  async getCleanLockFile(rootDirectory: string): Promise<Parameters<(typeof FileSystem)['writeFile']>[1]> {
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
    return version === '*' && '*';
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
    const resolvedPaths = await Promise.all(
      workspacePaths.map((path) => {
        if (path.endsWith('/*')) {
          return globby(`${path}/package.json`, { cwd, absolute: true });
        }

        return globby(path, { cwd, absolute: true });
      })
    );

    return await Promise.all(
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
