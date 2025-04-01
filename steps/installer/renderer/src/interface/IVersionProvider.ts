import type { IWorkspace } from '@veto-party/baum__core';

export interface IVersionProvider {
  getProjectVersion(): string | Promise<string>;
  getVersionForWorkspace(workspace: IWorkspace): string | Promise<string>;
}
