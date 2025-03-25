import type { IWorkspace } from '@veto-party/baum__core';

export interface INameProvider {
  getNameByWorkspace(workspace: IWorkspace | undefined): string | Promise<string>;
}
