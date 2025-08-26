import type { IWorkspace } from '@veto-party/baum__core';

export interface ICurrentVersionManager {
  getCurrentVersionFor(name: string): string | undefined | Promise<string | undefined>;
  getGitHashFor(workspace: IWorkspace): Promise<string | undefined>;
  updateGitHashFor(workspace: IWorkspace, hash: string | undefined): void | Promise<void>;
  updateCurrentVersionFor(name: string, version: string): void | Promise<void>;
  flush(): Promise<void>;
}
