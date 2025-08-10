import { CachedFN, type IPackageManager, type IWorkspace, Resolver } from '@veto-party/baum__core';
import { ConditionalGitDiffStep } from '@veto-party/baum__steps__git_diff';
import semver from 'semver';
import { IncrementalVersionStrategy } from './Incremental.js';

export enum VersionStatusUpdateType {
  PATCH = 0,
  MINOR = 1,
  MAJOR = 2
}

export class GitVersionStrategy extends IncrementalVersionStrategy {
  private dependentMap = new Map<string, VersionStatusUpdateType>();

  private hasDependentUpdate(workspace: IWorkspace) {
    return this.dependentMap.get(`${workspace.getName()}@${workspace.getVersion()}`);
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
    return (await ConditionalGitDiffStep.diffSummary(root, await this.versionProvider.getGitHashFor(workspace))).map((e) => Resolver.ensureAbsolute(e.file)).filter((e) => e.startsWith(absWorkspacePath));
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
}
