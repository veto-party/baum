import { allSettledButNoFailures, type IWorkspace } from '@veto-party/baum__core';
import type { ICurrentVersionManager } from '@veto-party/baum__registry__cache__base';
import semver from 'semver';
import { NPMPackageProvider } from './NPMPackageProvider.js';

export class NPMVersionStrategy implements ICurrentVersionManager {
  private provider: NPMPackageProvider;

  private newVersions: Record<string, string | undefined> = {};

  public constructor(
    registry: string,
    packageName: string,
    token?: string | undefined,
    private defaultVersion?: string
  ) {
    this.provider = new NPMPackageProvider(registry, packageName, token);
  }

  private async resolveVersion(name: string) {
    const [resolved, latest] = await allSettledButNoFailures([this.provider.getCurrentVersionFor(`base.${name}`), this.provider.getter.getCurrentVersionFor(name)]);

    if (resolved && latest) {
      switch (semver.compare(resolved, latest)) {
        case 0:
          return resolved;
        case 1:
          return resolved;
        case -1:
          return latest;
      }
    }

    return resolved ?? latest ?? this.defaultVersion;
  }

  async getCurrentVersionFor(name: string): Promise<string | undefined> {
    this.newVersions[name] ??= await this.resolveVersion(name);
    return this.newVersions[name];
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
