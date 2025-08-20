import type { IWorkspace } from '@veto-party/baum__core';
import type { ICurrentVersionManager } from '@veto-party/baum__registry__cache__base';
import { NPMPackageProvider } from './NPMPackageProvider.js';

export class NPMVersionStrategy implements ICurrentVersionManager {
  private provider: NPMPackageProvider;

  private newVersions: Record<string, string | undefined> = {};

  public constructor(
    registry: string,
    packageName: string,
    token?: string | undefined,
    private defaultVersion: string = '0.0.0'
  ) {
    this.provider = new NPMPackageProvider(registry, packageName, token);
  }
  async getCurrentVersionFor(name: string): Promise<string | undefined> {
    this.newVersions[name] ??= (await this.provider.getCurrentVersionFor(`base.${name}`)) ?? this.defaultVersion;
    return this.newVersions[name];
  }

  async getGitHashFor(workspace: IWorkspace): Promise<string | undefined> {
    const hash = await this.provider.getCurrentVersionFor(`git.${workspace.getName()}`);

    if (!hash) {
      throw new Error('No hash present!');
    }

    return hash;
  }

  async updateGitHashFor(workspace: IWorkspace, hash: string): Promise<void> {
    await this.provider.updateCurrentVersionFor(`git.${workspace.getName()}`, hash);
  }

  async updateCurrentVersionFor(name: string, version: string): Promise<void> {
    await this.provider.updateCurrentVersionFor(`base.${name}`, version);
  }

  async flush(): Promise<void> {
    await this.provider.flush();
  }
}
