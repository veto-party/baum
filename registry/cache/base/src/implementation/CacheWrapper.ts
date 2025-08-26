import { CachedFN, type IBaumRegistrable, type IExecutablePackageManager, type IPackageManager, type IStep, type IWorkspace, Resolver } from '@veto-party/baum__core';
import type { ARegistryStep } from '@veto-party/baum__registry';
import semver from 'semver';
import type { ICacheWrapper } from '../ICacheWrapper.js';
import type { INameTransformer } from '../INameTransformer.js';
import type { IVersionStrategy } from '../IVersionStrategy.js';

export class CacheWrapper implements ICacheWrapper {
  public constructor(
    private nameTransformer: INameTransformer,
    public versionStrategy: IVersionStrategy,
    private baum: IBaumRegistrable,
    private wrapped: IStep
  ) {
    baum.addCleanup(async () => {
      await this.versionStrategy.getAttachedVersionManager?.()?.flush?.();
    });
  }

  async flush(workspace: IWorkspace, root: string, packageManager: IPackageManager | undefined): Promise<void> {
    const newVersion = await this.versionStrategy.getCurrentVersionNumber(workspace, root, packageManager);
    const oldVersion = await this.versionStrategy.getOldVersionNumber(workspace, root, packageManager);
    if ((await oldVersion) === (await newVersion)) {
      return;
    }

    await this.versionStrategy.flushNewVersion(workspace, root, packageManager);
  }

  async registerModifyPackageJSON(step: ARegistryStep): Promise<void> {
    const fields = Resolver.dependencyFields;
    step.addModifier(async (file, _versionManager, workspace, packageManger, root) => {
      const workspaces = await packageManger.readWorkspace(root);

      const newVersion = await this.versionStrategy.getCurrentVersionNumber(workspace, root, packageManger);
      const oldVersion = await this.versionStrategy.getOldVersionNumber(workspace, root, packageManger);

      if (oldVersion === newVersion) {
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
          const lookupVersion = packageManger.modifyToRealVersionValue(file[field][name]) ?? file[field][name];

          const givenWorkspace =
            nameMap.get(name)?.find((el) => {
              const resolved = packageManger.modifyToRealVersionValue(el.getVersion());

              if (!resolved) {
                return false;
              }

              return semver.satisfies(lookupVersion, resolved);
            }) ??
            nameMap.get(name)?.find((el) => {
              const result = packageManger.modifyToRealVersionValue(el.getVersion());

              return !result || result === '*';
            });

          if (!givenWorkspace) {
            continue;
          }

          file[field][name] = `npm:${this.nameTransformer.getName(givenWorkspace.getName())}@${await this.versionStrategy.getCurrentVersionNumber(givenWorkspace, root, packageManger)}`;
        }
      }
    });
  }

  private async shouldExecuteStep(workspace: IWorkspace, packageManager: IExecutablePackageManager, root: string) {
    const oldVersion = this.versionStrategy.getOldVersionNumber(workspace, root, packageManager);
    const newVersion = this.versionStrategy.getCurrentVersionNumber(workspace, root, packageManager);
    if ((await oldVersion) === (await newVersion)) {
      return false;
    }

    return true;
  }

  @CachedFN(false)
  private registerCleanup(packageManager: IExecutablePackageManager, root: string) {
    this.baum.addCleanup(async () => {
      for (const workspace of (await this.versionStrategy.filterWorkspacesForUnprocessed(await packageManager.readWorkspace(root)))) {
        this.versionStrategy.getAttachedVersionManager?.()?.updateGitHashFor(workspace, undefined);
      }

    });
  }

  async execute(workspace: IWorkspace, packageManager: IExecutablePackageManager, root: string): Promise<void> {
    if (!(await this.shouldExecuteStep(workspace, packageManager, root))) {
      return;
    }

    await this.wrapped.execute(workspace, packageManager, root);
    await this.flush(workspace, root, packageManager);
  }

  async clean(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    if (!(await this.shouldExecuteStep(workspace, packageManager, rootDirectory))) {
      return;
    }

    await this.wrapped.clean(workspace, packageManager, rootDirectory);
  }
}
