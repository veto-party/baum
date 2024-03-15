import type { IPackageManager, IWorkspace } from '@veto-party/baum__core';
import semver from 'semver';
import type { IVersionManager } from '../../interface/IVersionManager.js';

export class GenericVersionManager implements IVersionManager {
  public static readonly MIN_VERSION = 'v0.0.0-temp';

  protected nameToVersionOrder: Record<string, IWorkspace[]> = {};
  protected namesToWorkspaces: Record<string, Record<string, IWorkspace>> = {};

  private mapToVersions(workspaces: IWorkspace[]) {
    for (const workspace of workspaces) {
      this.namesToWorkspaces[workspace.getName()] ??= {};
      this.namesToWorkspaces[workspace.getName()][workspace.getVersion()] = workspace;
      this.nameToVersionOrder[workspace.getName()] ??= [];
      this.nameToVersionOrder[workspace.getName()].push(workspace);
    }

    Object.values(this.nameToVersionOrder).forEach((workspaceMapping) => Object.values(workspaceMapping).sort((workspaceA, workspaceB) => semver.compare(workspaceA.getVersion(), workspaceB.getVersion()) || semver.compareBuild(workspaceA.getVersion(), workspaceB.getVersion())));
  }

  constructor(
    readonly workspaces: IWorkspace[],
    private readonly pm: IPackageManager
  ) {
    this.mapToVersions(workspaces);
  }

  protected starToVersion(name: string, version: string) {
    return version === '*' ? GenericVersionManager.MIN_VERSION : version;
  }

  protected findLatestVersionGenerator(name: string, version: string) {
    return (workspace: IWorkspace) => {
      const workspaceVersion = this.pm.modifyToRealVersionValue(workspace.getVersion());
      return semver.satisfies(this.starToVersion(workspace.getName(), workspaceVersion ? workspaceVersion : workspace.getVersion()), this.starToVersion(name, version));
    };
  }

  getLatestVersionFor(name: string, version: string): string | undefined {
    if (this.nameToVersionOrder[name] && this.nameToVersionOrder[name].length > 0) {
      if (!version.includes('*') && this.namesToWorkspaces[name][version]) {
        return version;
      }

      const versions = Object.values(this.nameToVersionOrder[name]);
      const foundVersion = versions.findLast(this.findLatestVersionGenerator(name, version));

      if (foundVersion) {
        return this.getLatestVersionFor(name, foundVersion?.getVersion());
      }

      return undefined;
    }

    return version;
  }
}
