import OldFileSystem from 'fs';
import Path from 'path';
import { CachedFN, GenericWorkspace, IExecutablePackageManager, IExecutionIntentBuilder, IPackageManagerExecutor, IWorkspace, TemplateBuilder } from '@veto-party/baum__core';
import { IExecutablePackageManagerParser } from '@veto-party/baum__core/src/interface/PackageManager/executor/IPackageManagerParser.js';
import FileSystem from 'fs/promises';
import { globby } from 'globby';
import yaml from 'yaml';
import { PNPMExecutor } from './PNPMExecutor.js';
import OS from 'node:os';
import Crypto from 'crypto';

export class PNPMPackageManager implements IExecutablePackageManager {
  async getCleanLockFile(rootDirectory: string): Promise<Parameters<(typeof FileSystem)['writeFile']>[1]> {
    const file = await FileSystem.readFile(Path.join(rootDirectory, 'pnpm-lock.yaml'));
    const content = file.toString();
    const parser = yaml.parse(content);

    Object.values(parser.importers).forEach((dependencyGroup: any) => {
      Object.values(dependencyGroup).forEach((dependencyType: any) => {
        Object.entries(dependencyType).forEach(([depdencyName, dependencyDescription]: [string, any]) => {
          if (dependencyDescription.version.startsWith('link:')) {
            delete dependencyType[depdencyName];
          }
        });
      });
    });

    return yaml.stringify(parser);
  }

  getLockFileName(): string {
    return 'pnpm-lock.yaml';
  }

  private async checkCopy(rootDirectory: string, reversed: boolean): Promise<void> {

    const hash = Crypto.createHash('md5').update(rootDirectory).digest().toString("hex");

    let paths = [Path.join(rootDirectory, 'pnpm-workspace.yaml'), Path.join(OS.tmpdir(), `${hash}-pnpm-workspace.yaml-bak`)] as const;

    if (reversed) {
      paths = paths.toReversed() as [string, string];
    }

    if (OldFileSystem.existsSync(paths[1])) {
      await FileSystem.rm(paths[1]);
    }

    await FileSystem.copyFile(...paths);
  }

  async disableGlobalWorkspace(rootDirectory: string) {
    await this.checkCopy(rootDirectory, false);
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
        .filter((file) => file.endsWith('package.json'))
        .map((file) => Path.dirname(file))
        .map<Promise<IWorkspace>>(async (path) => {
          const packageJsonFile = await FileSystem.readFile(Path.join(path, 'package.json'));
          const packageJson = JSON.parse(packageJsonFile.toString());

          return new GenericWorkspace(path, packageJson);
        })
    );
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
