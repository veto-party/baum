import type { IWorkspace } from '@veto-party/baum__core';

export interface ICurrentVersionManager {
  getCurrentVersionFor(name: string): string | undefined | Promise<string | undefined>;
  getGitHashFor(workspace: IWorkspace): Promise<string>;
  updateCurrentVersionFor(name: string, version: string): void | Promise<void>;
  flush(): Promise<void>;
}
