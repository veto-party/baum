import { CachedFN, clearCacheForFN, type IPackageManager, type IWorkspace } from '@veto-party/baum__core';
import { EventEmitter } from 'eventemitter3';
import semver from 'semver';
import type { ICurrentVersionManager } from '../../ICurrentVersionManager.js';
import type { INameTransformer } from '../../INameTransformer.js';
import type { IVersionStrategy } from '../../IVersionStrategy.js';

export abstract class IncrementalVersionStrategy implements IVersionStrategy {
  private versionStatusUpdates = new Map<IWorkspace, string>();

  public readonly listener = new EventEmitter<{
    'switched_to_branch_specific_name': (cb: { workspace: IWorkspace; }) => any;
    'updated_version': (cb: { workspace: IWorkspace; version: string; }) => any;
  }>();

  constructor(
    protected versionProvider: ICurrentVersionManager,
    protected nameTransformer: INameTransformer,
    protected defaultVersion: string
  ) {}

  getDefaultVersion(): string {
    return this.defaultVersion;
  }

  getCurrentVersionNumber(workspace: IWorkspace, _root: string, _packageManger: IPackageManager | undefined): Promise<string> {
    return this.__getCurrentVersionNumber(workspace);
  }

  private emitSwitchToBranchSpecificName(workspace: IWorkspace) {
    this.listener.emit('switched_to_branch_specific_name', { workspace });
  }

  private emitUpdatedVersion(workspace: IWorkspace, version: string) {
    this.listener.emit('updated_version', { workspace, version });
  }

  @CachedFN(true)
  private async __getCurrentVersionNumber(workspace: IWorkspace): Promise<string> {
    return this.versionStatusUpdates.get(workspace) ?? (await this.__getOldVersionNumber(workspace)) ?? this.defaultVersion;
  }

  public async increment(workspace: IWorkspace, version: string) {
    const result = await semver.compare(await this.__getCurrentVersionNumber(workspace), version);

    if (result === -1 || result === 0) {
      this.nameTransformer.enableOverrideFor(workspace.getName());
      this.emitSwitchToBranchSpecificName(workspace);

      const oldVersionResolved = await this.__getOldVersionNumber(workspace);

      if (!oldVersionResolved || semver.gt(version, oldVersionResolved)) {
        this.versionStatusUpdates.set(workspace, version);
        this.emitUpdatedVersion(workspace, version);
      } else if (oldVersionResolved) {
        let diff: string | null = semver.diff(version, oldVersionResolved);

        if (diff === null) {
          diff = semver.inc(version, 'minor');
        }

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

        this.emitUpdatedVersion(workspace, newVersion);
        this.versionStatusUpdates.set(workspace, newVersion);
      } else {
        this.emitUpdatedVersion(workspace, version);
        this.versionStatusUpdates.set(workspace, version);
      }

      clearCacheForFN(this, '__getCurrentVersionNumber' as any);
      return;
    }

    throw new Error(`Cannot increment version from ${await this.__getCurrentVersionNumber(workspace)} to ${version}, since to is smaller the from.`);
  }

  private async __getOldVersionNumber(workspace: IWorkspace): Promise<string | undefined> {
    const overrideVersion = await this.versionProvider.getCurrentVersionFor(this.nameTransformer.getOverrideName(workspace.getName()));

    if (overrideVersion) {
      this.nameTransformer.enableOverrideFor(workspace.getName());
      this.emitSwitchToBranchSpecificName(workspace);
    }

    return overrideVersion ?? (await this.versionProvider.getCurrentVersionFor(this.nameTransformer.getName(workspace.getName())));
  }

  async getOldVersionNumber(workspace: IWorkspace, _root: string, _packageManager: IPackageManager | undefined): Promise<string | undefined> {
    return this.__getOldVersionNumber(workspace);
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
