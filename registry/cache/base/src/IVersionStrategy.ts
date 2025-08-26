import type { IPackageManager, IWorkspace } from '@veto-party/baum__core';
import type { ICurrentVersionManager } from './ICurrentVersionManager.js';

export interface IVersionStrategy {
  getCurrentVersionNumber(workspace: IWorkspace, root: string, packageManger: IPackageManager | undefined): Promise<string>;
  getOldVersionNumber(workspace: IWorkspace, root: string, packageManager: IPackageManager | undefined): Promise<string | undefined>;
  flushNewVersion(workspace: IWorkspace, root: string, packageManager: IPackageManager | undefined): Promise<void>;

  getDefaultVersion(): string;

  getAttachedVersionManager?: () => ICurrentVersionManager | undefined;

  filterWorkspacesForUnprocessed(workspaces: IWorkspace[]): IWorkspace[];
}
