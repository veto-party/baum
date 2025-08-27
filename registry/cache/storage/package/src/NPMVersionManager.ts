import { allSettledButFailure, type IWorkspace } from '@veto-party/baum__core';
import type { ICurrentVersionManager } from '@veto-party/baum__registry__cache__base';
import semver from 'semver';
import { NPMPackageProvider } from './NPMPackageProvider.js';

export class NPMVersionManager implements ICurrentVersionManager {
  private provider: NPMPackageProvider;

  public constructor(
    registry: string,
    packageName: string,
    token?: string | undefined,
    private defaultVersion?: string
  ) {
    this.provider = new NPMPackageProvider(registry, packageName, token);
  }

  async getCurrentVersionFor(name: string): Promise<string | undefined> {
    const [resolved, latest] = await allSettledButFailure([this.provider.getCurrentVersionFor(`base.${name}`), this.provider.getter.getCurrentVersionFor(name)]);

    const resolvedPackageVersion = resolved ?? this.defaultVersion;

    if (resolvedPackageVersion && latest) {
      switch (semver.compare(resolvedPackageVersion, latest)) {
        case 0:
          return resolvedPackageVersion;
        case 1:
          return resolvedPackageVersion;
        case -1:
          return latest;
      }
    }

    return resolved ?? latest ?? this.defaultVersion;
  }

  async getGitHashFor(workspace: IWorkspace): Promise<string | undefined> {
    const hash = await this.provider.getCurrentVersionFor(`git.${workspace.getName()}`);

    if (!hash) {
      return undefined;
    }

    return hash;
  }

  async updateGitHashFor(workspace: IWorkspace, hash: string | undefined): Promise<void> {
    await this.provider.updateCurrentVersionFor(`git.${workspace.getName()}`, hash);
  }

  async updateCurrentVersionFor(name: string, version: string): Promise<void> {
    await this.provider.updateCurrentVersionFor(`base.${name}`, version);
  }

  async flush(): Promise<void> {
    await this.provider.flush();
  }
}
