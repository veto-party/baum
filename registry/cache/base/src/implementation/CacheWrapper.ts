import { CachedFN, type IBaumManagerConfiguration, type IExecutablePackageManager, type IPackageManager, type IStep, type IWorkspace, Resolver } from '@veto-party/baum__core';
import type { ARegistryStep } from '@veto-party/baum__registry';
import semver from 'semver';
import type { ICacheWrapper } from '../ICacheWrapper.js';
import type { INameTransformer } from '../INameTransformer.js';
import type { IVersionStrategy } from '../IVersionStrategy.js';

export class CacheWrapper implements ICacheWrapper {
  public constructor(
    private nameTransformer: INameTransformer,
    private versionStrategy: IVersionStrategy,
    private baum: IBaumManagerConfiguration,
    private wrapped: IStep
  ) {
    baum.addCleanup(async () => {
      await this.versionStrategy.getAttachedVersionManager?.()?.flush?.();
    });
  }

  async flush(workspace: IWorkspace, root: string, packageManager: IPackageManager | undefined): Promise<void> {
    const oldVersion = this.versionStrategy.getOldVersionNumber(workspace, root, packageManager);
    const newVersion = this.versionStrategy.getCurrentVersionNumber(workspace, root, packageManager);
    if ((await oldVersion) === (await newVersion)) {
      return;
    }

    await this.versionStrategy.flushNewVersion(workspace, root, packageManager);
  }

  async registerModifyPackageJSON(step: ARegistryStep): Promise<void> {
    const fields = Resolver.dependencyFields;
    step.addModifier(async (file, _versionManager, workspace, packageManger, root) => {
      const workspaces = await packageManger.readWorkspace(root);

      const [oldVersion, newVersion] = await Promise.all([this.versionStrategy.getOldVersionNumber(workspace, root, packageManger), this.versionStrategy.getCurrentVersionNumber(workspace, root, packageManger)] as const);

      if (oldVersion === newVersion && oldVersion !== this.versionStrategy.getDefaultVersion()) {
        return;
      }

      file.name = this.nameTransformer.getName(file.name);
      file.version = newVersion;

      const nameMap = new Map<string, IWorkspace[]>();

      for (const workspace of workspaces) {
        nameMap.set(workspace.getName(), [...(nameMap.get(workspace.getName()) || []), workspace]);
      }

      for (const field of fields) {
        for (const name in file[field] ?? {}) {
          const result = (await Promise.all(nameMap.get(name)
            ?.map(async (el) => [el, await this.versionStrategy.getCurrentVersionNumber(el, root, packageManger)] as const) ?? []
        )).find(([, version]) => semver.satisfies(file[field][name], version));

          if (!result) {
            continue;
          }

          const [workspace, version] = result;

          file[field][name] = `npm:${this.nameTransformer.getName(workspace.getName())}@${version}`;
        }
      }
    });
  }

  @CachedFN(true)
  private async shouldExecuteStep(workspace: IWorkspace, packageManager: IExecutablePackageManager, root: string) {
    const oldVersion = this.versionStrategy.getOldVersionNumber(workspace, root, packageManager);
    const newVersion = this.versionStrategy.getCurrentVersionNumber(workspace, root, packageManager);
    if ((await oldVersion) === (await newVersion) && (await oldVersion) !== this.versionStrategy.getDefaultVersion()) {
      return false;
    }

    return true;
  }

  async execute(workspace: IWorkspace, packageManager: IExecutablePackageManager, root: string): Promise<void> {
    if (!(await this.shouldExecuteStep(workspace, packageManager, root))) {
      return;
    }

    await this.wrapped.execute(workspace, packageManager, root);
  }

  async clean(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    if (!this.baum.isFailed()) {
      await this.flush(workspace, rootDirectory, packageManager);
    }

    if (!(await this.shouldExecuteStep(workspace, packageManager, rootDirectory))) {
      return;
    }

    await this.wrapped.clean(workspace, packageManager, rootDirectory);
  }
}
