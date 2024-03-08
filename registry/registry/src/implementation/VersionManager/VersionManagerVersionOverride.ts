import { IWorkspace } from '@veto-party/baum__core';
import { GenericVersionManager } from './GenericVersionManager.js';

export class VersionManagerVersionOverride extends GenericVersionManager {
  constructor(
    private versionOverride: string,
    workspaces: IWorkspace[]
  ) {
    super(workspaces);
  }

  protected starToVersion(name: string, version: string): string {
    return version === '*' ? this.versionOverride : version;
  }

  getLatestVersionFor(name: string, version: string): string | undefined {
    if (version === '*') {
      return this.versionOverride;
    }

    return super.getLatestVersionFor(name, version);
  }
}
