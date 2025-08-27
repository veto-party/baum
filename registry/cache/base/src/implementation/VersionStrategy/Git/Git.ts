import { CachedFN, type IPackageManager, type IStep, type IWorkspace, Resolver } from '@veto-party/baum__core';
import { ConditionalGitDiffStep } from '@veto-party/baum__steps__git_diff';
import semver from 'semver';
import type { IStorage } from '../../../IStorage.js';
import { IncrementalVersionStrategy } from '../Incremental.js';
import { CacheCleanerWrapper } from './CacheCleanerWrapper.js';

export enum VersionStatusUpdateType {
  PATCH = 0,
  MINOR = 1,
  MAJOR = 2
}

export const overrideHash = '##__MANUAL-OVERRIDE__##';

export class GitVersionStrategy extends IncrementalVersionStrategy {
  private dependentMap = new Map<string, VersionStatusUpdateType>();

  private hasDependentUpdate(workspace: IWorkspace) {
    for (const dependent of workspace.getDynamicDependents()) {
      const value = this.dependentMap.get(dependent.getName());
      if (value !== undefined) {
        return value;
      }
    }

    return undefined;
  }

  public getCacherAndCleaner<T extends IStep>(
    storage: IStorage,
    cleanup: (step: T, branches: string[], packages: string[]) => Promise<boolean> | boolean,
    step: T,
    root: string,
    getCleanedPackages: (step: T, branches: string[], packages: string[]) => Promise<string[]> | string[],
    currentBranch?: () => Promise<string> | string
  ): IStep {
    const wrapper = new CacheCleanerWrapper(storage, this.nameTransformer, cleanup, step, getCleanedPackages, currentBranch);

    this.listener.on('switched_to_branch_specific_name', async ({ workspace }) => {
      await wrapper.doStore(workspace, root);
    });

    return wrapper;
  }

  private static __incrementVersion = (version: string, update: VersionStatusUpdateType) => {
    switch (update) {
      case VersionStatusUpdateType.PATCH:
        return semver.inc(version, 'patch')?.toString();
      case VersionStatusUpdateType.MINOR:
        return semver.inc(version, 'minor')?.toString();
      case VersionStatusUpdateType.MAJOR:
        return semver.inc(version, 'major')?.toString();
      default:
        throw new Error(`Version update type not implemented: ${update}`);
    }
  };

  private static incrementVersion = (version: string, update: VersionStatusUpdateType) => {
    const newVersion = GitVersionStrategy.__incrementVersion(version, update);
    if (newVersion === undefined) {
      throw new Error(`Failed to increment version ${version} by update type ${update}`);
    }

    if (newVersion === version) {
      throw new Error(`WTF: increment version returned same result as input version (Was and is ${version}).`);
    }

    return newVersion;
  };

  @CachedFN(true)
  private async getAllGitChanges(workspace: IWorkspace, root: string): Promise<string[]> {
    const absWorkspacePath = Resolver.ensureAbsolute(workspace.getDirectory());

    const hash = await this.versionProvider.getGitHashFor(workspace);

    if (hash === undefined || hash === overrideHash) {
      return ['virtual_change_initial'];
    }

    return (await ConditionalGitDiffStep.diffSummary(root, hash)).map((e) => Resolver.ensureAbsolute(e.file)).filter((e) => e.startsWith(absWorkspacePath));
  }

  private async incrementUsingStatusUpdate(workspace: IWorkspace, _packageManager: IPackageManager | undefined, currentVersion: string, type: VersionStatusUpdateType) {
    this.dependentMap.set(workspace.getName(), type);
    await this.increment(workspace, GitVersionStrategy.incrementVersion(currentVersion, type));
  }

  @CachedFN(true)
  async getCurrentVersionNumber(workspace: IWorkspace, root: string, packageManger: IPackageManager | undefined): Promise<string> {
    const currentVersion = super.getCurrentVersionNumber(workspace, root, packageManger);
    if ((await this.getAllGitChanges(workspace, root)).length > 0) {
      await this.incrementUsingStatusUpdate(workspace, packageManger, await currentVersion, VersionStatusUpdateType.MINOR);
      return await super.getCurrentVersionNumber(workspace, root, packageManger);
    }

    const updateType = this.hasDependentUpdate(workspace);
    if (updateType !== undefined) {
      await this.incrementUsingStatusUpdate(workspace, packageManger, await currentVersion, updateType);
      return await super.getCurrentVersionNumber(workspace, root, packageManger);
    }

    return currentVersion;
  }

  async flushNewVersion(workspace: IWorkspace, root: string, packageManager: IPackageManager | undefined) {
    this.dependentMap.delete(workspace.getName());
    await this.versionProvider.updateGitHashFor(workspace, await ConditionalGitDiffStep.gitHash(root));
    await super.flushNewVersion(workspace, root, packageManager);
  }

  filterWorkspacesForUnprocessed(workspaces: IWorkspace[]): IWorkspace[] {
    return workspaces.filter((workspace) => this.hasDependentUpdate(workspace) !== undefined);
  }
}
