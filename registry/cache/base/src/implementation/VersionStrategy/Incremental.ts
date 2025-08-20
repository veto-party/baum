import { CachedFN, clearCacheForFN, type IPackageManager, type IWorkspace } from '@veto-party/baum__core';
import semver from 'semver';
import type { ICurrentVersionManager } from '../../ICurrentVersionManager.js';
import type { INameTransformer } from '../../INameTransformer.js';
import type { IVersionStrategy } from '../../IVersionStrategy.js';

export abstract class IncrementalVersionStrategy implements IVersionStrategy {
  private versionStatusUpdates = new Map<IWorkspace, string>();

  constructor(
    protected versionProvider: ICurrentVersionManager,
    protected nameTransformer: INameTransformer,
    protected defaultVersion: string
  ) {}

  getLatestVersionFor(name: string, _versionRange: string): Promise<string | undefined> {
    return this.__getOldVersionNumber(name);
  }

  getCurrentVersionNumber(workspace: IWorkspace, _root: string, _packageManger: IPackageManager | undefined): Promise<string> {
    return this.__getCurrentVersionNumber(workspace);
  }

  @CachedFN(true)
  protected async __getCurrentVersionNumber(workspace: IWorkspace): Promise<string> {
    return this.versionStatusUpdates.get(workspace) ?? (await this.__getOldVersionNumber(workspace.getName()));
  }

  protected async increment(workspace: IWorkspace, version: string) {
    const result = await semver.compare(await this.__getCurrentVersionNumber(workspace), version);

    if (result === 0) {
      return;
    }

    if (result === -1) {
      this.nameTransformer.enableOverrideFor(workspace.getName());

      const oldVersionResolved = await this.__getOldVersionNumber(workspace.getName());

      if (!oldVersionResolved || semver.gte(version, oldVersionResolved)) {
        this.versionStatusUpdates.set(workspace, version);
      } else if (oldVersionResolved) {
        const diff = semver.diff(version, oldVersionResolved);

        if (diff === null) {
          throw new Error(`internal error could not resolve diff for version (${version}) and (${oldVersionResolved})`);
        }

        let newVersion = oldVersionResolved;

        const diffTypes = ['major', 'minor', 'patch'] as const;

        for (const diffType of diffTypes) {
          for (let i = 0; i <= semver[diffType](diff); i++) {
            newVersion = semver.inc(newVersion, diffType)!;
          }
        }

        this.versionStatusUpdates.set(workspace, newVersion);
      } else {
        this.versionStatusUpdates.set(workspace, version);
      }

      clearCacheForFN(this, '__getCurrentVersionNumber' as any);
      return;
    }

    throw new Error(`Cannot increment version from ${await this.__getCurrentVersionNumber(workspace)} to ${version}, since to is smaller the from.`);
  }

  async __getOldVersionNumber(workspaceName: string): Promise<string> {
    const overrideVersion = await this.versionProvider.getCurrentVersionFor(this.nameTransformer.getOverrideName(workspaceName));
    overrideVersion !== undefined && this.nameTransformer.enableOverrideFor(workspaceName);
    return overrideVersion ?? (await this.versionProvider.getCurrentVersionFor(this.nameTransformer.getDefaultName(workspaceName))) ?? this.defaultVersion;
  }

  async getOldVersionNumber(workspace: IWorkspace, _root: string, _packageManager: IPackageManager | undefined): Promise<string> {
    return this.__getOldVersionNumber(workspace.getName());
  }

  async flushNewVersion(workspace: IWorkspace, _root: string, _packageManager: IPackageManager | undefined): Promise<void> {
    if (this.versionStatusUpdates.has(workspace)) {
      await this.versionProvider.updateCurrentVersionFor(this.nameTransformer.getOverrideName(workspace.getName()), this.versionStatusUpdates.get(workspace)!);
    }
  }

  getAttachedVersionManager() {
    return this.versionProvider;
  }
}
