import type { IWorkspace } from '@veto-party/baum__core';
import type { ICurrentVersionManager } from '../../ICurrentVersionManager.js';

export class ChainedVersionManager implements ICurrentVersionManager {
  private managers: ICurrentVersionManager[];

  public constructor(
    private primaryManager: ICurrentVersionManager,
    managers: ICurrentVersionManager[]
  ) {
    this.managers = [this.primaryManager, ...managers];
  }

  async getCurrentVersionFor(name: string): Promise<string | undefined> {
    for (const manager of this.managers) {
      const result = await manager.getCurrentVersionFor(name);
      if (result !== undefined) {
        return result;
      }
    }
  }
  async getGitHashFor(workspace: IWorkspace): Promise<string | undefined> {
    for (const manager of this.managers) {
      const result = await manager.getGitHashFor(workspace);
      if (result !== undefined) {
        return result;
      }
    }
  }
  updateGitHashFor(workspace: IWorkspace, hash: string | undefined): void | Promise<void> {
    return this.primaryManager.updateGitHashFor(workspace, hash);
  }
  updateCurrentVersionFor(name: string, version: string): void | Promise<void> {
    return this.primaryManager.updateCurrentVersionFor(name, version);
  }
  flush(): Promise<void> {
    return this.primaryManager.flush();
  }
}
