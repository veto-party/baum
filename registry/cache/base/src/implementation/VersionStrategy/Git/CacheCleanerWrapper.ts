import { CachedFN, type IExecutablePackageManager, type IStep, type IWorkspace } from '@veto-party/baum__core';
import { ConditionalGitDiffStep } from '@veto-party/baum__steps__git_diff';
import type { INameTransformer } from '../../../INameTransformer.js';
import type { IStorage } from '../../../IStorage.js';

export class CacheCleanerWrapper<T extends IStep> implements IStep {
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
