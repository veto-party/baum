import type { ICurrentVersionManager } from '../ICurrentVersionManager.js';

export class StaticVersionProvider implements ICurrentVersionManager {
  constructor(private versions: Record<string, string> = {}) {}

  public async getCurrentVersionFor(name: string): Promise<string | undefined> {
    return this.versions[name];
  }

  private newVersions: Record<string, string> = {};

  public async updateCurrentVersionFor(name: string, version: string): Promise<void> {
    this.newVersions[name] = version;
  }

  public async flush() {
    this.versions = {
      ...this.versions,
      ...this.newVersions
    };

    this.newVersions = {};
  }
}
