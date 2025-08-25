import { CachedFN, type IExecutablePackageManager, type IPackageManager, type IStep, type IWorkspace, Resolver } from '@veto-party/baum__core';
import { ConditionalGitDiffStep } from '@veto-party/baum__steps__git_diff';
import semver from 'semver';
import type { INameTransformer } from '../../INameTransformer.js';
import type { IStorage } from '../../IStorage.js';
import { IncrementalVersionStrategy } from './Incremental.js';

export enum VersionStatusUpdateType {
  PATCH = 0,
  MINOR = 1,
  MAJOR = 2
}

class CacheCleanerWrapper<T extends IStep> implements IStep {
  public constructor(
    private storage: IStorage,
    private nameTransformer: INameTransformer,
    private prepareCleanup: (step: T, branches: string[], packages: string[]) => Promise<boolean> | boolean,
    private step: T,
    private getCleanedPackages: (step: T, branches: string[], packages: string[]) => Promise<string[]> | string[],
    private currentBranch?: (detected: string) => Promise<string> | string,
    private key: string = 'packages'
  ) {}

  @CachedFN(true)
  private async getBranch(root: string) {
    const detected = await ConditionalGitDiffStep.getCurrentBranch(root);
    return (await this.currentBranch?.(detected)) ?? detected;
  }

  @CachedFN(true)
  private async getElementsToRemove(rootDirectory: string) {
    const stored: Record<string, string[]> = { ...(await this.storage.resolve(this.key)) };

    for (const branch of await ConditionalGitDiffStep.getAllBranches(rootDirectory)) {
      delete stored[branch];
    }

    return [Object.values(stored).flat(), Object.keys(stored)];
  }

  @CachedFN(true)
  async callClean(rootDirectory: string, step: T) {
    const [elements, branches] = await this.getElementsToRemove(rootDirectory);

    if (elements.length === 0) {
      return false;
    }

    return await this.prepareCleanup(step, branches, elements);
  }

  async doStore(workspace: IWorkspace, root: string) {
    const branch = await this.getBranch(root);
    this.storage.store(this.key, (prev: any) => {
      const overrideName = this.nameTransformer.getOverrideName(workspace.getName());
      if (this.nameTransformer.getName(workspace.getName()) !== overrideName) {
        return prev;
      }

      const givenPrev = prev ?? {};

      return {
        ...givenPrev,
        [branch]: [...(givenPrev[branch] ?? []), overrideName]
      };
    });
  }

  async execute(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    if (await this.callClean(rootDirectory, this.step)) {
      await this.step.execute(workspace, packageManager, rootDirectory);
    }
  }

  async clean(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    const toRemove = await this.getElementsToRemove(rootDirectory);

    if (!toRemove) {
      return;
    }

    const [elements, branches] = toRemove;

    const cleanedPackages = await this.getCleanedPackages(this.step, branches, elements);

    this.storage.store(this.key, (prev: any) => {
      const givenPrev = (prev ?? {}) as Record<string, string[]>;
      return Object.fromEntries(
        Object.entries(givenPrev)
          .map(([key, values]) => [key, values.filter((e) => !cleanedPackages.includes(e))])
          .filter(([, values]) => values.length > 0)
      );
    });

    if (await this.callClean(rootDirectory, this.step)) {
      await this.step.clean(workspace, packageManager, rootDirectory);
    }
  }
}

export class GitVersionStrategy extends IncrementalVersionStrategy {
  private dependentMap = new Map<string, VersionStatusUpdateType>();

  private hasDependentUpdate(workspace: IWorkspace) {
    return this.dependentMap.get(`${workspace.getName()}@${workspace.getVersion()}`);
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

    if (hash === undefined) {
      return ['virtual_change_initial'];
    }

    return (await ConditionalGitDiffStep.diffSummary(root, hash)).map((e) => Resolver.ensureAbsolute(e.file)).filter((e) => e.startsWith(absWorkspacePath));
  }

  private async incrementUsingStatusUpdate(workspace: IWorkspace, currentVersion: string | Promise<string>, type: VersionStatusUpdateType) {
    workspace.getDynamicDependents().forEach((el) => {
      this.dependentMap.set(`${el.getName()}@${el.getVersion()}`, type);
    });

    await this.increment(workspace, GitVersionStrategy.incrementVersion(await currentVersion, type));
  }

  @CachedFN(true)
  async getCurrentVersionNumber(workspace: IWorkspace, root: string, packageManger: IPackageManager | undefined): Promise<string> {
    const currentVersion = super.getCurrentVersionNumber(workspace, root, packageManger);
    if ((await this.getAllGitChanges(workspace, root)).length > 0) {
      await this.incrementUsingStatusUpdate(workspace, await currentVersion, VersionStatusUpdateType.MAJOR);
      return await super.getCurrentVersionNumber(workspace, root, packageManger);
    }

    const updateType = this.hasDependentUpdate(workspace);
    if (updateType) {
      await this.incrementUsingStatusUpdate(workspace, await currentVersion, updateType);
      return await super.getCurrentVersionNumber(workspace, root, packageManger);
    }

    return currentVersion;
  }

  async flushNewVersion(workspace: IWorkspace, root: string, packageManager: IPackageManager | undefined) {
    await this.versionProvider.updateGitHashFor(workspace, await ConditionalGitDiffStep.gitHash(root));
    await super.flushNewVersion(workspace, root, packageManager);
  }
}
